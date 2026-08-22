import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { AiService } from '../../core/ai.service';
import { ToastService } from '../../core/toast.service';
import {
  AiCapabilities,
  AiOfferFacts,
  ContentControls,
  ContentRequest,
  ContentResult,
  ContentSection,
} from '../../core/ai.models';
import { IconComponent } from '../../shared/icon.component';

/** §16's checklist, with the customer-facing label for each. */
const SECTIONS: { key: ContentSection; label: string; hint: string; premium?: boolean }[] = [
  { key: 'title', label: 'Title', hint: 'The headline on the offer card' },
  { key: 'shortDescription', label: 'Short description', hint: 'Two or three lines' },
  { key: 'detailedDescription', label: 'Detailed description', hint: 'The full offer page' },
  { key: 'bannerText', label: 'Banner text', hint: 'Short lines for artwork' },
  { key: 'pushNotification', label: 'Push notification', hint: 'Kept under the length limit' },
  { key: 'socialCaption', label: 'Social caption', hint: 'Premium only', premium: true },
];

/** §34's quick refinements. */
const REFINEMENTS = [
  'Make it shorter',
  'Make it more professional',
  'Make it more exciting',
  'Remove emojis',
  'Add urgency',
  'Make it suitable for families',
];

/**
 * ✨ Generate offer content (§15–§22, §34).
 *
 * A panel rather than a page, because §25 puts content generation *inside* the
 * offer form: the offer is the source of truth for the copy, so the two belong
 * on the same screen.
 *
 * The panel never writes to the form by itself. Each piece of copy has an
 * explicit "Use this" button, which is what keeps §35's approval step real.
 */
@Component({
  selector: 'app-ai-content-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './ai-content-panel.component.html',
  styleUrl: './ai-content-panel.component.scss',
})
export class AiContentPanelComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ai = inject(AiService);
  private readonly toast = inject(ToastService);

  /** The shop the offer belongs to; the plan is resolved from it. */
  @Input({ required: true }) shopId: number | null = null;
  /** Set once the offer has been saved, so the API re-reads the real row. */
  @Input() offerId: number | null = null;
  /**
   * The current form values. A function, so the panel always reads what is on
   * screen right now rather than a snapshot taken when it was opened.
   */
  @Input({ required: true }) facts!: () => AiOfferFacts;
  /** True while the offer has nothing worth writing about yet. */
  @Input() ready = true;

  /** Emitted when the admin accepts a piece of copy. */
  @Output() apply = new EventEmitter<{ section: ContentSection | 'terms'; text: string }>();

  readonly sections = SECTIONS;
  readonly refinements = REFINEMENTS;

  readonly open = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<ContentResult | null>(null);
  readonly capabilities = signal<AiCapabilities | null>(null);
  /** Section currently being regenerated, so only its button spins. */
  readonly regenerating = signal<ContentSection | null>(null);

  private selected = new Set<ContentSection>([
    'title',
    'shortDescription',
    'detailedDescription',
    'bannerText',
    'pushNotification',
  ]);

  readonly form = this.fb.nonNullable.group({
    tone: ['professional' as ContentControls['tone']],
    length: ['medium' as ContentControls['length']],
    language: ['English'],
    targetAudience: ['General customers'],
    emoji: [true],
    callToAction: [''],
    additionalNotes: [''],
    variants: [2],
  });

  readonly refinement = this.fb.nonNullable.control('');

  toggle(): void {
    this.open.update((value) => !value);
    if (this.open() && !this.capabilities() && this.shopId) this.loadCapabilities();
  }

  private loadCapabilities(): void {
    this.ai.capabilities(this.shopId!).subscribe({
      next: (capabilities) => this.capabilities.set(capabilities),
      error: () => this.capabilities.set(null),
    });
  }

  get status() {
    return this.capabilities()?.features?.AI_CONTENT_GENERATOR ?? null;
  }

  get canGenerate(): boolean {
    const status = this.status;
    return Boolean(this.shopId && this.ready && status?.enabled && !status.exhausted);
  }

  /** Social captions need Premium, so the checkbox is disabled rather than absent (§22). */
  sectionAvailable(section: ContentSection): boolean {
    if (section !== 'socialCaption') return true;
    return this.capabilities()?.sections?.socialCaption ?? false;
  }

  isSelected(section: ContentSection): boolean {
    return this.selected.has(section);
  }

  toggleSection(section: ContentSection): void {
    if (!this.sectionAvailable(section)) return;
    if (this.selected.has(section)) this.selected.delete(section);
    else this.selected.add(section);
  }

  // ---- Generating ---------------------------------------------------------

  private controls(): ContentControls {
    const value = this.form.getRawValue();
    return {
      tone: value.tone,
      length: value.length,
      language: value.language || 'English',
      targetAudience: value.targetAudience || null,
      emoji: value.emoji,
      callToAction: value.callToAction || null,
      additionalNotes: value.additionalNotes || null,
      variants: value.variants,
    };
  }

  private request(extra: Partial<ContentRequest> = {}): ContentRequest | null {
    if (!this.shopId) return null;
    const chosen = this.sections
      .map((section) => section.key)
      .filter((key) => this.selected.has(key) && this.sectionAvailable(key));

    if (!chosen.length) {
      this.error.set('Choose at least one thing to generate.');
      return null;
    }

    return {
      shopId: this.shopId,
      offerId: this.offerId,
      // The saved offer wins server-side; the draft values are what make this
      // usable before the first save.
      offer: this.offerId ? undefined : this.facts(),
      sections: chosen,
      controls: this.controls(),
      ...extra,
    };
  }

  generate(): void {
    const payload = this.request();
    if (!payload) return;

    this.error.set(null);
    this.loading.set(true);

    this.ai.generateContent(payload).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.result.set(result);
        if (result.skippedSections.length) {
          this.toast.info('Social captions need the Premium plan, so that one was skipped.');
        }
        if (this.shopId) this.loadCapabilities();
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(this.messageFor(error));
      },
    });
  }

  /** §19/§34 - another take, told what the admin has already turned down. */
  regenerate(section?: ContentSection): void {
    const current = this.result();
    const previousVersions: Record<string, string[]> = {};
    for (const [key, variants] of Object.entries(current?.sections ?? {})) {
      if (!section || key === section) previousVersions[key] = variants ?? [];
    }

    const payload = this.request({
      previousVersions,
      refinement: this.refinement.value || null,
    });
    if (!payload) return;

    // Regenerating one section should not rewrite the others under the admin.
    if (section) payload.sections = [section];

    this.error.set(null);
    if (section) this.regenerating.set(section);
    else this.loading.set(true);

    this.ai.regenerateContent(payload).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.regenerating.set(null);
        this.result.update((existing) =>
          existing && section
            ? { ...existing, sections: { ...existing.sections, ...result.sections } }
            : result,
        );
        if (this.shopId) this.loadCapabilities();
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.regenerating.set(null);
        this.error.set(this.messageFor(error));
      },
    });
  }

  applyRefinement(text: string): void {
    this.refinement.setValue(text);
  }

  // ---- Using the output ---------------------------------------------------

  use(section: ContentSection | 'terms', text: string): void {
    this.apply.emit({ section, text });
    this.toast.success('Copied into the form. Edit it as much as you like.');

    // §33: record that the suggestion was actually taken.
    const historyId = this.result()?.historyId;
    if (historyId) {
      this.ai.setHistoryOutcome(historyId, 'accepted', this.offerId).subscribe({
        error: () => undefined,
      });
    }
  }

  async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.toast.success('Copied to the clipboard.');
    } catch {
      this.toast.error('Your browser blocked the copy. Select the text instead.');
    }
  }

  // ---- Display ------------------------------------------------------------

  labelFor(section: string): string {
    return SECTIONS.find((item) => item.key === section)?.label ?? section;
  }

  /** The section keys that actually came back, in the documented order. */
  resultSections(): ContentSection[] {
    const sections = this.result()?.sections ?? {};
    return this.sections.map((item) => item.key).filter((key) => (sections[key] ?? []).length > 0);
  }

  variantsFor(section: ContentSection): string[] {
    return this.result()?.sections?.[section] ?? [];
  }

  private messageFor(error: unknown): string {
    const body = (error as { error?: { error?: { message?: string; code?: string } } })?.error?.error;
    if (body?.code === 'PLAN_UPGRADE_REQUIRED' || body?.code === 'AI_LIMIT_REACHED') {
      return body.message ?? 'This feature is not available on your current plan.';
    }
    return 'Unable to generate content right now. Please try again later — you can still write it yourself.';
  }
}
