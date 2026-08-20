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
              @if (plan.nextBillingDate && plan.status === 'active') {
                <div>
                  <dt>Next billing</dt>
                  <dd>{{ plan.nextBillingDate | date: 'mediumDate' }}</dd>
                </div>
              }
              @if (plan.paymentMethod) {
                <div>
                  <dt>Payment method</dt>
                  <dd>{{ plan.paymentMethod | uppercase }}</dd>
                </div>
              }
              @if (plan.plan !== 'FREE') {
                <div>
                  <dt>AutoPay</dt>
                  <dd>{{ plan.autopayEnabled ? 'Active' : 'Not set up' }}</dd>
                </div>
              }
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

            @if (statusNotice(plan); as notice) {
              <div class="notice" [class.danger]="notice.tone === 'danger'">
                <p class="small">{{ notice.text }}</p>
                @if (notice.retry && canManage()) {
                  <a class="btn btn-sm" routerLink="/admin/subscription/upgrade">Retry payment</a>
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
                    <li>
                      <span aria-hidden="true">✓</span>
                      {{ subscriptions.labelFor(feature) }}
                      @if (subscriptions.accessSourceFor(feature) === 'override') {
                        <span class="badge badge-brand tiny">Super Admin grant</span>
                      }
                    </li>
                  }
                </ul>
              }
            </div>
          </section>
        </div>

        <!--
          §11N: features the Super Admin granted are shown apart from the plan,
          so a Free merchant with Premium-like capability is never confusing.
        -->
        @if (specialAccess().length) {
          <section class="card mt-2 special">
            <div class="card-header">
              <h2>Special access</h2>
              <p class="small subtle">
                Granted by the OffersOffer team, independently of your plan. Buying or changing a
                plan does not affect these.
              </p>
            </div>
            <div class="card-body">
              <ul class="grants small">
                @for (grant of specialAccess(); track grant.featureKey) {
                  <li>
                    <span class="tick" aria-hidden="true">✓</span>
                    <div>
                      <p class="strong">{{ grant.featureName }}</p>
                      <p class="subtle">
                        Granted by Super Admin ·
                        {{
                          grant.isPermanent
                            ? 'Permanent'
                            : 'Expires ' + (grant.expiresAt | date: 'mediumDate')
                        }}
                      </p>
                    </div>
                  </li>
                }
              </ul>
            </div>
          </section>
        }

        <div class="card mt-2">
          <div class="card-body cancel">
            <div>
              <p class="strong">Billing history &amp; invoices</p>
              <p class="small subtle">
                Every payment, the method used and the invoices issued for them.
              </p>
            </div>
            <a class="btn btn-sm" routerLink="/admin/subscription/billing">View billing</a>
          </div>
        </div>

        @if (canManage() && plan.plan !== 'FREE' && plan.status !== 'cancelled') {
          <div class="card mt-2">
            <div class="card-body cancel">
              <div>
                <p class="strong">Cancel subscription</p>
                <p class="small subtle">
                  @if (activeUntil(plan); as until) {
                    Your current plan will remain active until
                    {{ until | date: 'mediumDate' }}. Recurring billing stops immediately, and your
                    shop data is kept.
                  } @else {
                    Your shop moves to the Free plan. Published offers stay live, but features the
                    Free plan does not include stop being available. Your data is kept.
                  }
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

      .notice.danger {
        background: var(--danger-bg, var(--warning-bg));
        border-left-color: var(--danger);
      }

      .grants {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.75rem;
      }

      .grants li {
        display: flex;
        gap: 0.6rem;
        align-items: flex-start;
      }

      .grants .tick {
        color: var(--success);
        font-weight: 700;
      }

      .grants p {
        margin: 0;
      }

      .badge.tiny {
        font-size: 0.62rem;
        padding: 0.05rem 0.35rem;
        margin-left: 0.35rem;
        vertical-align: middle;
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

  /** Active Super Admin grants for this shop (§11N). */
  readonly specialAccess = this.subscriptions.specialAccess;

  /** When the benefits already paid for run out (§13). */
  activeUntil(plan: Entitlements): string | null {
    return plan.currentPeriodEnd ?? plan.renewsAt;
  }

  /**
   * The one-line explanation of the current billing state (§9, §10, §12, §13).
   * `retry` marks the states the merchant can act on themselves.
   */
  statusNotice(plan: Entitlements): { text: string; tone: 'info' | 'danger'; retry: boolean } | null {
    if (plan.status === 'past_due') {
      return {
        tone: 'danger',
        retry: true,
        text: plan.graceUntil
          ? `Your last payment failed. Your ${plan.planName} features stay on until ${new Date(
              plan.graceUntil,
            ).toLocaleDateString()}, after which the plan moves to Free. Your data is kept.`
          : 'Your last payment failed. Please retry the payment to keep your plan.',
      };
    }
    if (plan.status === 'cancelled') {
      const until = this.activeUntil(plan);
      return {
        tone: 'info',
        retry: false,
        text: until
          ? `Cancelled. Your ${plan.planName} plan stays active until ${new Date(until).toLocaleDateString()}.`
          : 'Cancelled. Your shop moves to the Free plan shortly.',
      };
    }
    if (plan.status === 'paused') {
      return { tone: 'info', retry: true, text: 'Your subscription is paused at the payment gateway.' };
    }
    if (plan.status === 'created' || plan.paymentStatus === 'pending') {
      return {
        tone: 'info',
        retry: true,
        // §7: the plan is not on until the gateway confirms it, and saying so
        // is more honest than showing features the API will refuse.
        text: `${plan.planName} is waiting for payment confirmation. Its features unlock as soon as the payment clears.`,
      };
    }
    if (plan.cancelAtPeriodEnd && plan.pendingPlan) {
      const until = this.activeUntil(plan);
      return {
        tone: 'info',
        retry: false,
        text: `Scheduled to move to the ${plan.pendingPlan} plan on ${
          until ? new Date(until).toLocaleDateString() : 'the next billing date'
        }.`,
      };
    }
    return null;
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
