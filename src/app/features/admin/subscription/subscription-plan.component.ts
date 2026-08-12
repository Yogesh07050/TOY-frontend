import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth.service';
import { SubscriptionService } from '../../../core/subscription.service';
import { ToastService } from '../../../core/toast.service';
import { Entitlements } from '../../../core/models';
import { PERMISSIONS } from '../../../core/permissions';

/**
 * §32 Subscription → Current plan.
 *
 * Shows what the merchant is on, what it includes and how much of each
 * allowance they have used — the usage bars are the thing that makes an upgrade
 * decision concrete rather than abstract.
 */
@Component({
  selector: 'app-subscription-plan',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Current plan</h1>
          <p class="subtitle">What your shop is subscribed to and how much of it you are using.</p>
        </div>
        @if (canManage()) {
          <a class="btn" routerLink="/admin/subscription/upgrade">Change plan</a>
        }
      </div>

      @if (subscriptions.all().length > 1) {
        <div class="card mb-2">
          <div class="card-body row">
            <label class="small muted">
              Shop
              <select [ngModel]="selectedShopId()" (ngModelChange)="select($event)">
                @for (row of subscriptions.all(); track row.shopId) {
                  <option [ngValue]="row.shopId">{{ shopName(row) }}</option>
                }
              </select>
            </label>
          </div>
        </div>
      }

      @if (!current(); as _) {
        <div class="card">
          <div class="card-body">
            <p>You are not assigned to a shop yet, so there is no subscription to show.</p>
          </div>
        </div>
      } @else if (current(); as plan) {
        <div class="plan-head card mb-2">
          <div class="card-body">
            <div class="badge-row">
              <span class="badge badge-brand">{{ plan.planName }}</span>
              <span class="badge" [class]="statusBadge(plan)">{{ statusLabel(plan) }}</span>
            </div>
            <p class="price">
              ₹{{ plan.price.toLocaleString('en-IN') }}<span class="per">/month</span>
            </p>
            <p class="subtle">{{ plan.tagline }}</p>

            <dl class="meta small">
              <div>
                <dt>Started</dt>
                <dd>{{ plan.startedAt | date: 'mediumDate' }}</dd>
              </div>
              @if (plan.renewsAt) {
                <div>
                  <dt>Renews</dt>
                  <dd>{{ plan.renewsAt | date: 'mediumDate' }}</dd>
                </div>
              }
              <div>
                <dt>Billing</dt>
                <dd>{{ plan.billingCycle }}</dd>
              </div>
              <div>
                <dt>Shop profile</dt>
                <dd>{{ plan.profile }}</dd>
              </div>
              <div>
                <dt>Near Me visibility</dt>
                <dd>{{ plan.visibility.nearMe }}</dd>
              </div>
              <div>
                <dt>Search visibility</dt>
                <dd>{{ plan.visibility.search }}</dd>
              </div>
            </dl>

            @if (plan.paymentStatus === 'pending') {
              <div class="notice">
                <p class="small">
                  This plan is active but the payment for the current period has not been confirmed.
                </p>
                @if (canManage()) {
                  <button type="button" class="btn btn-sm" [disabled]="busy()" (click)="confirm(plan)">
                    Confirm payment
                  </button>
                }
              </div>
            }
          </div>
        </div>

        <div class="split">
          <section class="card">
            <div class="card-header"><h2>Usage this month</h2></div>
            <div class="card-body">
              <ul class="usage">
                @for (row of usageRows(); track row.label) {
                  <li>
                    <div class="usage-head">
                      <span>{{ row.label }}</span>
                      <span class="small strong">{{ row.text }}</span>
                    </div>
                    <div class="track">
                      <span
                        class="fill"
                        [class.full]="row.percent >= 100"
                        [style.width.%]="row.percent"
                      ></span>
                    </div>
                  </li>
                }
              </ul>
              <p class="small subtle">Period {{ plan.usage.period }}</p>
            </div>
          </section>

          <section class="card">
            <div class="card-header"><h2>What's included</h2></div>
            <div class="card-body">
              @if (!plan.features.length) {
                <p class="small subtle">
                  The Free plan covers the basics: one offer a month, one branch and one category,
                  with basic discovery and offer views.
                </p>
              } @else {
                <ul class="features small">
                  @for (feature of plan.features; track feature) {
                    <li><span aria-hidden="true">✓</span> {{ subscriptions.labelFor(feature) }}</li>
                  }
                </ul>
              }
            </div>
          </section>
        </div>

        @if (canManage() && plan.plan !== 'FREE') {
          <div class="card mt-2">
            <div class="card-body cancel">
              <div>
                <p class="strong">Cancel subscription</p>
                <p class="small subtle">
                  Your shop moves to the Free plan. Published offers stay live, but features the
                  Free plan does not include stop being available.
                </p>
              </div>
              <button type="button" class="btn btn-danger btn-sm" [disabled]="busy()" (click)="cancel(plan)">
                Cancel plan
              </button>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .plan-head .price {
        font-size: 2rem;
        font-weight: 780;
        margin: 0.4rem 0 0;
        font-variant-numeric: tabular-nums;
      }

      .price .per {
        font-size: 0.95rem;
        font-weight: 500;
        color: var(--text-muted);
      }

      .badge-row {
        display: flex;
        gap: 0.4rem;
      }

      .meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
        gap: 0.75rem;
        margin: 1rem 0 0;
      }

      .meta dt {
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-size: 0.7rem;
        font-weight: 700;
      }

      .meta dd {
        margin: 0.1rem 0 0;
        font-weight: 600;
        text-transform: capitalize;
      }

      .notice {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        margin-top: 1rem;
        padding: 0.7rem 0.9rem;
        border-radius: var(--radius-sm);
        background: var(--warning-bg);
        border-left: 3px solid var(--warning);
      }

      .notice p {
        margin: 0;
      }

      .split {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
        align-items: start;
      }

      .usage,
      .features {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .usage li {
        margin-bottom: 0.85rem;
      }

      .usage-head {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        font-size: 0.88rem;
        margin-bottom: 0.25rem;
      }

      .track {
        height: 8px;
        background: var(--surface-alt);
        border-radius: 999px;
        overflow: hidden;
      }

      .fill {
        display: block;
        height: 100%;
        border-radius: 999px;
        background: var(--gradient-brand);
      }

      /* A used-up allowance is the one thing on this page the merchant needs to
         notice, so it changes colour rather than just filling. */
      .fill.full {
        background: var(--danger);
      }

      .features li {
        display: flex;
        gap: 0.45rem;
        padding: 0.22rem 0;
        color: var(--text-muted);
      }

      .features span {
        color: var(--success);
      }

      .cancel {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .cancel p {
        margin: 0;
      }

      select {
        width: auto;
      }

      @media (max-width: 860px) {
        .split {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
  ],
})
export class SubscriptionPlanComponent {
  readonly subscriptions = inject(SubscriptionService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly busy = signal(false);
  readonly selectedShopId = signal<number | null>(null);

  readonly current = computed<Entitlements | null>(() => {
    const rows = this.subscriptions.all();
    const selected = this.selectedShopId();
    if (selected !== null) return rows.find((row) => row.shopId === selected) ?? null;
    return this.subscriptions.current();
  });

  constructor() {
    this.subscriptions.load();
  }

  canManage(): boolean {
    return this.auth.hasAny(PERMISSIONS.MANAGE_SUBSCRIPTION);
  }

  select(shopId: number): void {
    this.selectedShopId.set(shopId);
  }

  shopName(row: Entitlements): string {
    return (
      this.auth.user()?.shops.find((shop) => shop.shopId === row.shopId)?.shopName ??
      `Shop #${row.shopId}`
    );
  }

  statusLabel(plan: Entitlements): string {
    if (plan.status !== 'active') return plan.status;
    return plan.paymentStatus === 'pending' ? 'Payment pending' : 'Active';
  }

  statusBadge(plan: Entitlements): string {
    if (plan.status !== 'active') return 'badge-danger';
    return plan.paymentStatus === 'pending' ? 'badge-warning' : 'badge-success';
  }

  /**
   * One bar per limit. An unlimited allowance has no meaningful fill, so it
   * shows the count and a full bar rather than a misleading sliver.
   */
  readonly usageRows = computed(() => {
    const plan = this.current();
    if (!plan) return [];

    const rows: { label: string; used: number; limit: number | null }[] = [
      { label: 'Offers this month', used: plan.usage.offersThisMonth, limit: plan.limits.offersPerMonth },
      { label: 'Branches', used: plan.usage.branches, limit: plan.limits.branches },
      { label: 'Categories', used: plan.usage.categories, limit: plan.limits.categories },
      { label: 'Featured banners', used: plan.usage.banners, limit: plan.limits.banners },
    ];

    return rows.map((row) => ({
      label: row.label,
      text: row.limit === null ? `${row.used} · unlimited` : `${row.used} of ${row.limit}`,
      percent: row.limit === null ? 100 : Math.min((row.used / Math.max(row.limit, 1)) * 100, 100),
    }));
  });

  confirm(plan: Entitlements): void {
    this.busy.set(true);
    this.subscriptions.confirmPayment(plan.shopId).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Payment confirmed.');
      },
      error: () => {
        this.busy.set(false);
        this.toast.error('That payment could not be confirmed.');
      },
    });
  }

  cancel(plan: Entitlements): void {
    if (!confirm('Cancel this subscription and move the shop to the Free plan?')) return;

    this.busy.set(true);
    this.subscriptions.cancel(plan.shopId).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Subscription cancelled.');
      },
      error: () => {
        this.busy.set(false);
        this.toast.error('That subscription could not be cancelled.');
      },
    });
  }
}
