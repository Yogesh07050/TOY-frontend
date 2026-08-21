import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { AiService } from '../../core/ai.service';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Shop } from '../../core/models';
import { AiServiceStatus, SubscriptionPlan } from '../../core/ai.models';

/**
 * Subscription plans and AI limits, for the Super Admin (§3).
 *
 * TOY.md is explicit that the allowances must be configurable rather than
 * hardcoded, so this screen edits the real plan rows. The API re-checks that
 * the caller is a Super Admin; this page only makes the fields reachable.
 */
@Component({
  selector: 'app-subscription-manage',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Subscriptions & AI limits</h1>
          <p class="subtitle">
            What each plan includes, and how many AI generations it allows per month.
          </p>
        </div>
      </div>

      <!-- Whether the AI service is actually wired up. -->
      @if (status(); as health) {
        <div class="service-status" [class.down]="!health.reachable">
          <span class="dot" aria-hidden="true"></span>
          @if (health.reachable) {
            AI service reachable — {{ health.provider }} / {{ health.model }}
            @if (!health.providerConfigured) {
              <strong> · no API key configured</strong>
            }
          } @else {
            AI service unreachable ({{ health.reason }}). AI features will report an error and
            merchants can still create offers manually.
          }
        </div>
      }

      @if (loading()) {
        <div class="skeleton" style="height: 320px"></div>
      } @else {
        <div class="plan-grid">
          @for (plan of plans(); track plan.id) {
            <section class="card plan">
              <div class="card-header">
                <h3>{{ plan.name }}</h3>
                <span class="price">₹{{ plan.priceMonthly }}<span class="small muted">/mo</span></span>
              </div>
              <div class="card-body">
                <p class="small muted">{{ plan.description }}</p>

                <span class="label">Features</span>
                <label class="checkbox">
                  <input type="checkbox" [checked]="plan.aiAssistantEnabled" (change)="patch(plan, 'aiAssistantEnabled', $event)" />
                  <span>AI Offer Assistant</span>
                </label>
                <label class="checkbox">
                  <input type="checkbox" [checked]="plan.aiContentEnabled" (change)="patch(plan, 'aiContentEnabled', $event)" />
                  <span>AI Content Generator</span>
                </label>
                <label class="checkbox">
                  <input type="checkbox" [checked]="plan.aiOptimizerEnabled" (change)="patch(plan, 'aiOptimizerEnabled', $event)" />
                  <span>AI Offer Optimisation</span>
                </label>
                <label class="checkbox">
                  <input type="checkbox" [checked]="plan.socialCaptionEnabled" (change)="patch(plan, 'socialCaptionEnabled', $event)" />
                  <span>Social captions</span>
                </label>

                <span class="label">Insights the assistant may use</span>
                <label class="checkbox">
                  <input type="checkbox" [checked]="plan.historicalInsights" (change)="patch(plan, 'historicalInsights', $event)" />
                  <span>Past offer performance</span>
                </label>
                <label class="checkbox">
                  <input type="checkbox" [checked]="plan.locationInsights" (change)="patch(plan, 'locationInsights', $event)" />
                  <span>Location engagement</span>
                </label>
                <label class="checkbox">
                  <input type="checkbox" [checked]="plan.timingInsights" (change)="patch(plan, 'timingInsights', $event)" />
                  <span>Day and time engagement</span>
                </label>

                <span class="label">Monthly allowance</span>
                <p class="small muted">Leave blank for unlimited. Zero turns the feature off.</p>

                <div class="field">
                  <label [for]="'assistant-' + plan.id">Offer Assistant</label>
                  <input
                    [id]="'assistant-' + plan.id"
                    type="number"
                    min="0"
                    [value]="plan.aiAssistantMonthlyLimit ?? ''"
                    (change)="patchLimit(plan, 'aiAssistantMonthlyLimit', $event)"
                  />
                </div>

                <div class="field">
                  <label [for]="'content-' + plan.id">Content Generator</label>
                  <input
                    [id]="'content-' + plan.id"
                    type="number"
                    min="0"
                    [value]="plan.aiContentMonthlyLimit ?? ''"
                    (change)="patchLimit(plan, 'aiContentMonthlyLimit', $event)"
                  />
                </div>

                <div class="field">
                  <label [for]="'optimizer-' + plan.id">Offer Optimisation</label>
                  <input
                    [id]="'optimizer-' + plan.id"
                    type="number"
                    min="0"
                    [value]="plan.aiOptimizerMonthlyLimit ?? ''"
                    (change)="patchLimit(plan, 'aiOptimizerMonthlyLimit', $event)"
                  />
                </div>
              </div>
            </section>
          }
        </div>

        <!-- Which plan each shop is on. -->
        <section class="card mt-2">
          <div class="card-header"><h3>Shop plans</h3></div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Shop</th>
                  <th>Plan</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (shop of shops(); track shop.id) {
                  <tr>
                    <td>{{ shop.name }}</td>
                    <td>
                      <select [value]="planIdFor(shop.id)" (change)="assign(shop, $event)">
                        @for (plan of plans(); track plan.id) {
                          <option [value]="plan.id">{{ plan.name }}</option>
                        }
                      </select>
                    </td>
                    <td class="small muted nowrap">{{ sourceFor(shop.id) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .plan-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
        align-items: start;
      }

      .price {
        font-weight: 700;
        color: var(--brand-strong);
      }

      .label {
        display: block;
        font-size: 0.78rem;
        font-weight: 660;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--text-subtle);
        margin: 0.9rem 0 0.4rem;
      }

      .service-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 0.9rem;
        margin-bottom: 1rem;
        border-radius: var(--radius-sm);
        background: var(--success-bg);
        color: var(--success);
        font-size: 0.88rem;
      }

      .service-status.down {
        background: var(--danger-bg);
        color: var(--danger);
      }

      .service-status .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
        flex-shrink: 0;
      }
    `,
  ],
})
export class SubscriptionManageComponent {
  private readonly ai = inject(AiService);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly plans = signal<SubscriptionPlan[]>([]);
  readonly shops = signal<Shop[]>([]);
  readonly status = signal<AiServiceStatus | null>(null);
  readonly loading = signal(true);

  /** shopId -> the plan it is currently on. */
  private readonly assignments = signal<Map<number, { planId: number; source: string }>>(new Map());

  constructor() {
    this.ai.plans().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.ai.status().subscribe({
      next: (status) => this.status.set(status),
      error: () => this.status.set(null),
    });

    this.api.listShops({ limit: 100, status: 'all', sort: 'name' }).subscribe({
      next: (page) => {
        this.shops.set(page.items);
        for (const shop of page.items) this.loadAssignment(shop.id);
      },
      error: () => this.shops.set([]),
    });
  }

  private loadAssignment(shopId: number): void {
    this.ai.shopSubscription(shopId).subscribe({
      next: (subscription) => {
        this.assignments.update((map) => {
          const next = new Map(map);
          next.set(shopId, { planId: subscription.plan.id, source: subscription.source });
          return next;
        });
      },
      error: () => undefined,
    });
  }

  planIdFor(shopId: number): number | string {
    return this.assignments().get(shopId)?.planId ?? '';
  }

  sourceFor(shopId: number): string {
    const source = this.assignments().get(shopId)?.source;
    return { subscription: 'Assigned', lapsed: 'Expired — on Free', default: 'Default' }[source ?? ''] ?? '';
  }

  // ---- Editing ------------------------------------------------------------

  patch(plan: SubscriptionPlan, field: keyof SubscriptionPlan, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.save(plan, { [field]: checked } as Partial<SubscriptionPlan>);
  }

  /** Blank means unlimited, which is `null` on the wire, not 0. */
  patchLimit(plan: SubscriptionPlan, field: keyof SubscriptionPlan, event: Event): void {
    const raw = (event.target as HTMLInputElement).value.trim();
    const value = raw === '' ? null : Math.max(0, Number(raw));
    if (value !== null && !Number.isFinite(value)) return;
    this.save(plan, { [field]: value } as Partial<SubscriptionPlan>);
  }

  private save(plan: SubscriptionPlan, changes: Partial<SubscriptionPlan>): void {
    this.ai.updatePlan(plan.id, changes).subscribe({
      next: (updated) => {
        this.plans.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
        this.toast.success(`${updated.name} plan updated.`);
      },
      error: () => this.toast.error('That change could not be saved.'),
    });
  }

  assign(shop: Shop, event: Event): void {
    const planId = Number((event.target as HTMLSelectElement).value);
    if (!planId) return;

    const plan = this.plans().find((item) => item.id === planId);
    if (!plan) return;

    this.ai.setShopPlan(shop.id, plan.code).subscribe({
      next: (subscription) => {
        this.assignments.update((map) => {
          const next = new Map(map);
          next.set(shop.id, { planId: subscription.plan.id, source: subscription.source });
          return next;
        });
        this.toast.success(`${shop.name} is now on the ${subscription.plan.name} plan.`);
      },
      // The server refuses to hand out a paid plan without a checkout, which is
      // a rule rather than a failure - so say what it said instead of a generic
      // "could not be assigned" that leaves the admin guessing.
      error: (error: unknown) => {
        const detail = error instanceof HttpErrorResponse ? error.error?.error : null;
        this.toast.error(
          detail?.code === 'CHECKOUT_REQUIRED'
            ? `${plan.name} is a paid plan, so it has to go through checkout. To grant it without a charge, use Feature overrides.`
            : (detail?.message ?? 'That plan could not be assigned.'),
        );
      },
    });
  }
}
