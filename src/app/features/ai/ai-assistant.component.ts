import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AiService } from '../../core/ai.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { EmptyStateComponent } from '../../shared/ui.components';
import {
  AiCapabilities,
  AiOfferPrefill,
  AiRecommendation,
  AiShop,
  AssistantRequest,
  AssistantResult,
  BusinessGoal,
} from '../../core/ai.models';

/** §6's goal list, in the order the document gives them. */
const GOALS: { value: BusinessGoal; label: string; icon: string }[] = [
  { value: 'increase_sales', label: 'Increase sales', icon: '📈' },
  { value: 'clear_inventory', label: 'Clear old inventory', icon: '📦' },
  { value: 'attract_new_customers', label: 'Attract new customers', icon: '✨' },
  { value: 'win_back_customers', label: 'Bring back existing customers', icon: '🔁' },
  { value: 'promote_new_product', label: 'Promote a new product', icon: '🆕' },
  { value: 'weekend_traffic', label: 'Increase weekend traffic', icon: '📅' },
  { value: 'store_visits', label: 'Increase store visits', icon: '🏬' },
  { value: 'promote_category', label: 'Promote a category', icon: '🏷️' },
  { value: 'other', label: 'Other', icon: '💬' },
];

/** §37 - progress wording while the model works. Never a technical message. */
const LOADING_STEPS = [
  'Analyzing your offer history…',
  'Checking customer engagement…',
  'Preparing recommendations…',
];

/**
 * ✨ AI Offer Assistant (§4–§13).
 *
 * Answers "what offer should I create?" and hands the chosen answer to the
 * normal offer form. It never creates an offer itself: §10 requires the admin
 * to review, edit and publish, so the last thing this screen does is navigate.
 */
@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, EmptyStateComponent],
  templateUrl: './ai-assistant.component.html',
  styleUrl: './ai-assistant.component.scss',
})
export class AiAssistantComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly ai = inject(AiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly goals = GOALS;

  readonly shops = signal<AiShop[]>([]);
  readonly shopsLoaded = signal(false);
  readonly capabilities = signal<AiCapabilities | null>(null);

  readonly loading = signal(false);
  readonly loadingStep = signal(LOADING_STEPS[0]);
  readonly error = signal<string | null>(null);
  readonly result = signal<AssistantResult | null>(null);
  /** Index of the recommendation whose inline editor is open, or null. */
  readonly customising = signal<number | null>(null);

  private loadingTimer: ReturnType<typeof setInterval> | null = null;
  /** Titles already shown, so "Try another" genuinely varies the ideas (§7). */
  private seenTitles: string[] = [];

  readonly form = this.fb.nonNullable.group({
    shopId: [null as number | null],
    goal: ['increase_sales' as BusinessGoal],
    details: [''],
    productOrCategory: [''],
    preferredDiscount: [''],
    targetCustomer: [''],
    locationRadiusKm: [null as number | null],
    startDate: [''],
    endDate: [''],
    budget: [''],
    inventoryNotes: [''],
    optionCount: [3],
  });

  /** The inline "Customize" editor, populated from the chosen recommendation. */
  readonly customForm = this.fb.nonNullable.group({
    title: [''],
    offerText: [''],
    discountValue: [null as number | null],
    buyQuantity: [null as number | null],
    getQuantity: [null as number | null],
    startDate: [''],
    endDate: [''],
    targetRadiusKm: [null as number | null],
  });

  /** The assistant's own entitlement, from the shop's plan (§3). */
  readonly assistantStatus = computed(
    () => this.capabilities()?.features?.AI_OFFER_ASSISTANT ?? null,
  );

  readonly canGenerate = computed(() => {
    const status = this.assistantStatus();
    return Boolean(status?.enabled && !status.exhausted);
  });

  constructor() {
    this.ai.shops().subscribe({
      next: (shops) => {
        this.shops.set(shops);
        this.shopsLoaded.set(true);
        if (shops.length) {
          this.form.patchValue({ shopId: shops[0].id });
          this.loadCapabilities(shops[0].id);
        }
      },
      error: () => this.shopsLoaded.set(true),
    });
  }

  ngOnDestroy(): void {
    this.stopLoadingTicker();
  }

  onShopChange(): void {
    const shopId = this.form.controls.shopId.value;
    this.result.set(null);
    this.seenTitles = [];
    this.capabilities.set(null);
    if (shopId) this.loadCapabilities(shopId);
  }

  private loadCapabilities(shopId: number): void {
    this.ai.capabilities(shopId).subscribe({
      next: (capabilities) => this.capabilities.set(capabilities),
      error: () => this.capabilities.set(null),
    });
  }

  selectGoal(goal: BusinessGoal): void {
    this.form.patchValue({ goal });
  }

  goalLabel(goal: BusinessGoal): string {
    return GOALS.find((item) => item.value === goal)?.label ?? goal;
  }

  // ---- Generating ---------------------------------------------------------

  generate(regenerate = false): void {
    const shopId = this.form.controls.shopId.value;
    if (!shopId) {
      this.error.set('Choose which shop this offer is for.');
      return;
    }

    const value = this.form.getRawValue();
    const payload: AssistantRequest = {
      shopId,
      goal: value.goal,
      goalLabel: this.goalLabel(value.goal),
      details: value.details || null,
      productOrCategory: value.productOrCategory || null,
      preferredDiscount: value.preferredDiscount || null,
      targetCustomer: value.targetCustomer || null,
      locationRadiusKm: value.locationRadiusKm,
      startDate: value.startDate || null,
      endDate: value.endDate || null,
      budget: value.budget || null,
      inventoryNotes: value.inventoryNotes || null,
      optionCount: value.optionCount,
      ...(regenerate ? { previousTitles: this.seenTitles.slice(-6) } : {}),
    };

    this.error.set(null);
    this.customising.set(null);
    this.loading.set(true);
    this.startLoadingTicker();

    const request = regenerate
      ? this.ai.regenerateRecommendation(payload)
      : this.ai.recommend(payload);

    request.subscribe({
      next: (result) => {
        this.stopLoadingTicker();
        this.loading.set(false);
        this.result.set(result);
        this.seenTitles = [
          ...this.seenTitles,
          ...result.recommendations.map((item) => item.title),
        ];
        // The quota just moved, so the remaining count on screen must too.
        this.loadCapabilities(shopId);
      },
      error: (error: unknown) => {
        this.stopLoadingTicker();
        this.loading.set(false);
        this.error.set(this.messageFor(error));
      },
    });
  }

  /** §36/§37 - a merchant never sees a provider error, only what to do next. */
  private messageFor(error: unknown): string {
    const body = (error as { error?: { error?: { message?: string; code?: string } } })?.error?.error;
    if (body?.code === 'PLAN_UPGRADE_REQUIRED' || body?.code === 'AI_LIMIT_REACHED') {
      return body.message ?? 'This feature is not available on your current plan.';
    }
    return 'Unable to create a recommendation right now. Please try again later — you can still create the offer yourself.';
  }

  private startLoadingTicker(): void {
    let index = 0;
    this.loadingStep.set(LOADING_STEPS[0]);
    this.stopLoadingTicker();
    this.loadingTimer = setInterval(() => {
      index = (index + 1) % LOADING_STEPS.length;
      this.loadingStep.set(LOADING_STEPS[index]);
    }, 1800);
  }

  private stopLoadingTicker(): void {
    if (this.loadingTimer) clearInterval(this.loadingTimer);
    this.loadingTimer = null;
  }

  // ---- Acting on a recommendation (§9) ------------------------------------

  /** Opens the normal offer form with the recommendation's values filled in. */
  use(index: number): void {
    const result = this.result();
    const prefill = result?.prefill?.[index];
    if (!prefill) return;

    this.ai.stagePrefill(prefill, result?.historyId ?? null);
    this.toast.info('Review and edit everything before you publish.');
    void this.router.navigateByUrl('/admin/offers/new');
  }

  /** Opens the inline editor so the admin can adjust before the form (§7). */
  customize(index: number): void {
    if (this.customising() === index) {
      this.customising.set(null);
      return;
    }
    const prefill = this.result()?.prefill?.[index];
    if (!prefill) return;

    this.customForm.setValue({
      title: prefill.title ?? '',
      offerText: prefill.offerText ?? '',
      discountValue: prefill.discountValue,
      buyQuantity: prefill.buyQuantity,
      getQuantity: prefill.getQuantity,
      startDate: this.toLocalInput(prefill.startDate),
      endDate: this.toLocalInput(prefill.endDate),
      targetRadiusKm: prefill.targetRadiusKm,
    });
    this.customising.set(index);
  }

  /** Hands the edited values to the offer form instead of the original ones. */
  useCustomised(index: number): void {
    const result = this.result();
    const base = result?.prefill?.[index];
    if (!base) return;

    const edited = this.customForm.getRawValue();
    if (!edited.title.trim()) {
      this.toast.error('An offer title is required.');
      return;
    }

    const prefill: AiOfferPrefill = {
      ...base,
      title: edited.title.trim(),
      offerText: edited.offerText.trim() || null,
      discountValue: edited.discountValue,
      buyQuantity: edited.buyQuantity,
      getQuantity: edited.getQuantity,
      startDate: edited.startDate ? new Date(edited.startDate).toISOString() : base.startDate,
      endDate: edited.endDate ? new Date(edited.endDate).toISOString() : base.endDate,
      targetRadiusKm: edited.targetRadiusKm,
    };

    this.ai.stagePrefill(prefill, result?.historyId ?? null);
    void this.router.navigateByUrl('/admin/offers/new');
  }

  /** §33 - the admin turned the whole set down. */
  dismiss(): void {
    const historyId = this.result()?.historyId;
    if (historyId) this.ai.setHistoryOutcome(historyId, 'rejected').subscribe({ error: () => undefined });
    this.result.set(null);
    this.customising.set(null);
  }

  // ---- Display helpers ----------------------------------------------------

  headline(recommendation: AiRecommendation): string {
    if (recommendation.offerText) return recommendation.offerText;
    if (recommendation.offerType === 'buy_x_get_y' && recommendation.buyQuantity) {
      return `Buy ${recommendation.buyQuantity} Get ${recommendation.getQuantity} Free`;
    }
    if (recommendation.discountValue == null) return recommendation.title;
    return recommendation.discountType === 'percentage'
      ? `${recommendation.discountValue}% OFF`
      : `₹${recommendation.discountValue} OFF`;
  }

  schedule(recommendation: AiRecommendation): string | null {
    if (recommendation.recommendedSchedule) return recommendation.recommendedSchedule;
    if (recommendation.recommendedDurationDays) {
      const days = recommendation.recommendedDurationDays;
      return `${days} day${days === 1 ? '' : 's'}`;
    }
    return null;
  }

  showBuyGet(index: number): boolean {
    return this.result()?.recommendations?.[index]?.offerType === 'buy_x_get_y';
  }

  showDiscount(index: number): boolean {
    const recommendation = this.result()?.recommendations?.[index];
    return Boolean(recommendation && recommendation.discountType !== 'none');
  }

  /** `datetime-local` wants a local-time string with no timezone suffix. */
  private toLocalInput(iso: string | null): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (value: number) => String(value).padStart(2, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
  }
}
