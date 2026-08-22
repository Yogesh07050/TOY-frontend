import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AiService } from '../../core/ai.service';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Offer, OfferPayload } from '../../core/models';
import { ImproveResult } from '../../core/ai.models';
import { IconComponent } from '../../shared/icon.component';

/**
 * ✨ Improve this offer (§14).
 *
 * Critiques the wording of an offer that already exists and proposes a rewrite.
 * Only the wording: the discount, dates and terms are facts, and the API checks
 * the suggestion against them before it ever reaches this screen.
 *
 * "Apply improvements" saves, but only because the admin pressed it - which is
 * the approval step §35 requires, not a bypass of it.
 */
@Component({
  selector: 'app-ai-improve',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IconComponent],
  template: `
    <div class="container page narrow">
      <div class="page-header">
        <div>
          <h1><app-icon name="sparkles-outline" [size]="16" /> Improve this offer</h1>
          <p class="subtitle">Better wording for the same offer. The deal itself never changes.</p>
        </div>
        <a routerLink="/admin/offers" class="btn btn-ghost">← Back to offers</a>
      </div>

      @if (loadingOffer()) {
        <div class="skeleton" style="height: 220px"></div>
      } @else if (offer(); as current) {
        <section class="card">
          <div class="card-header"><h3>Current wording</h3></div>
          <div class="card-body">
            <p class="current-title">{{ current.title }}</p>
            @if (current.offerText) {
              <p class="muted mb-1">{{ current.offerText }}</p>
            }
            @if (current.description) {
              <p class="muted mb-0">{{ current.description }}</p>
            }
          </div>
        </section>

        <section class="card mt-2">
          <div class="card-body">
            <div class="field">
              <label for="focus">Anything specific to focus on?</label>
              <input
                id="focus"
                type="text"
                [formControl]="focus"
                placeholder="Optional — e.g. make the benefit clearer"
              />
            </div>
            <button type="button" class="btn" [disabled]="loading()" (click)="run()">
              <app-icon name="sparkles-outline" [size]="16" />
              {{ loading() ? 'Reviewing your offer…' : 'Suggest improvements' }}
            </button>
          </div>
        </section>

        @if (error()) {
          <div class="card error-card mt-2" role="alert">
            <div class="card-body">
              <strong>{{ error() }}</strong>
              <p class="small muted mb-0">Your offer is unchanged. You can edit it yourself at any time.</p>
            </div>
          </div>
        }

        @if (result(); as data) {
          <section class="card mt-2">
            <div class="card-header"><h3>Potential improvements</h3></div>
            <div class="card-body">
              @if (data.improvements.length) {
                <ul class="improvements">
                  @for (point of data.improvements; track point) {
                    <li>{{ point }}</li>
                  }
                </ul>
              }

              @if (data.suggestedTitle || data.suggestedShortDescription || data.suggestedDescription) {
                <div class="suggested">
                  <span class="label">Suggested wording</span>
                  @if (data.suggestedTitle) {
                    <p class="suggested-title">{{ data.suggestedTitle }}</p>
                  }
                  @if (data.suggestedOfferText) {
                    <p class="muted">{{ data.suggestedOfferText }}</p>
                  }
                  @if (data.suggestedShortDescription) {
                    <p>{{ data.suggestedShortDescription }}</p>
                  }
                  @if (data.suggestedDescription) {
                    <p class="mb-0">{{ data.suggestedDescription }}</p>
                  }
                </div>
              }

              <!-- §14's three actions. -->
              <div class="row actions">
                <button type="button" class="btn btn-sm" [disabled]="saving()" (click)="applyImprovements()">
                  {{ saving() ? 'Saving…' : 'Apply improvements' }}
                </button>
                <button type="button" class="btn btn-secondary btn-sm" [disabled]="loading()" (click)="run()">
                  Regenerate
                </button>
                <button type="button" class="btn btn-ghost btn-sm" (click)="keepOriginal()">
                  Keep original
                </button>
              </div>

              <p class="small subtle mb-0">
                Applying updates the offer's wording only. The discount, dates and terms stay
                exactly as you set them.
              </p>
            </div>
          </section>
        }
      } @else {
        <p class="muted">That offer could not be loaded.</p>
      }
    </div>
  `,
  styles: [
    `
      .narrow {
        max-width: 780px;
      }

      .current-title {
        font-size: 1.1rem;
        font-weight: 660;
        margin-bottom: 0.35rem;
      }

      .error-card {
        border-left: 4px solid var(--danger);
      }

      .improvements {
        margin: 0 0 1rem;
        padding-left: 1.15rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        color: var(--text-muted);
      }

      .label {
        display: block;
        font-size: 0.78rem;
        font-weight: 660;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--text-subtle);
        margin-bottom: 0.4rem;
      }

      .suggested {
        background: var(--brand-tint);
        border: 1px solid var(--brand-light);
        border-radius: var(--radius-sm);
        padding: 0.85rem 1rem;
        margin-bottom: 1rem;
      }

      .suggested-title {
        font-size: 1.05rem;
        font-weight: 700;
        margin-bottom: 0.35rem;
      }

      .actions {
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 0.6rem;
      }
    `,
  ],
})
export class AiImproveComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ai = inject(AiService);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly offer = signal<Offer | null>(null);
  readonly loadingOffer = signal(true);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<ImproveResult | null>(null);

  readonly focus = this.fb.nonNullable.control('');

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getOffer(id).subscribe({
      next: (offer) => {
        this.offer.set(offer);
        this.loadingOffer.set(false);
      },
      error: () => {
        this.loadingOffer.set(false);
        this.toast.error('That offer could not be loaded.');
      },
    });
  }

  run(): void {
    const offer = this.offer();
    if (!offer) return;

    this.error.set(null);
    this.loading.set(true);

    this.ai
      .improveOffer({
        shopId: offer.shop.id,
        offerId: offer.id,
        controls: {
          tone: 'exciting',
          length: 'medium',
          language: 'English',
          emoji: true,
          variants: 1,
        },
        focus: this.focus.value || null,
      })
      .subscribe({
        next: (result) => {
          this.loading.set(false);
          this.result.set(result);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(this.messageFor(error));
        },
      });
  }

  /**
   * Saves the suggested wording onto the offer.
   *
   * The update sends the offer's existing values for everything else, so an
   * "improvement" can never quietly change the discount or the dates.
   */
  applyImprovements(): void {
    const offer = this.offer();
    const data = this.result();
    if (!offer || !data) return;

    const description =
      data.suggestedDescription ?? data.suggestedShortDescription ?? offer.description;

    const payload: OfferPayload = {
      shopId: offer.shop.id,
      categoryId: offer.category?.id ?? null,
      subcategoryId: offer.subcategory?.id ?? null,
      title: data.suggestedTitle ?? offer.title,
      productName: offer.productName,
      description,
      offerText: data.suggestedOfferText ?? offer.offerText,
      offerType: offer.offerType,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      originalPrice: offer.originalPrice,
      discountedPrice: offer.discountedPrice,
      buyQuantity: offer.buyQuantity,
      getQuantity: offer.getQuantity,
      minPurchase: offer.minPurchase,
      termsConditions: offer.termsConditions,
      eligibility: offer.eligibility,
      usageRestrictions: offer.usageRestrictions,
      applicableProducts: offer.applicableProducts,
      isRecurring: offer.isRecurring,
      recurrenceType: offer.recurrenceType,
      startDate: offer.startDate,
      endDate: offer.endDate,
      status: offer.status === 'active' ? 'active' : 'draft',
      applicabilityType: offer.applicabilityType,
      branchIds: offer.branchIds ?? [],
      images: (offer.images ?? []).map((image) => ({
        url: image.url,
        thumbnailUrl: image.thumbnailUrl,
      })),
    };

    this.saving.set(true);
    this.api.updateOffer(offer.id, payload).subscribe({
      next: () => {
        this.saving.set(false);
        if (data.historyId) {
          this.ai.setHistoryOutcome(data.historyId, 'accepted', offer.id).subscribe({
            error: () => undefined,
          });
        }
        this.toast.success('The offer wording has been updated.');
        void this.router.navigateByUrl('/admin/offers');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('The offer could not be updated.');
      },
    });
  }

  keepOriginal(): void {
    const historyId = this.result()?.historyId;
    if (historyId) {
      this.ai.setHistoryOutcome(historyId, 'rejected').subscribe({ error: () => undefined });
    }
    this.result.set(null);
    this.toast.info('Kept your original wording.');
  }

  private messageFor(error: unknown): string {
    const body = (error as { error?: { error?: { message?: string; code?: string } } })?.error?.error;
    if (body?.code === 'PLAN_UPGRADE_REQUIRED' || body?.code === 'AI_LIMIT_REACHED') {
      return body.message ?? 'This feature is not available on your current plan.';
    }
    return 'Unable to review this offer right now. Please try again later.';
  }
}
