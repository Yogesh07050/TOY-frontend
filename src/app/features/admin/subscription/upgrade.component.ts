import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth.service';
import { SubscriptionService } from '../../../core/subscription.service';
import { ToastService } from '../../../core/toast.service';
import { Plan, PlanKey } from '../../../core/models';
import { PERMISSIONS } from '../../../core/permissions';

/**
 * §32 Subscription → Upgrade, and the product ladder from §40.
 *
 * The comparison matrix is served by the API from the same file that enforces
 * the plans, so this page cannot advertise a feature the backend does not
 * actually grant.
 */
@Component({
  selector: 'app-subscription-upgrade',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Choose your plan</h1>
          <p class="subtitle">
            Free to try, Business to publish and promote, Premium to grow with data.
          </p>
        </div>
      </div>

      @if (!catalogue()) {
        <div class="skeleton" style="height: 320px"></div>
      } @else {
        <div class="plans">
          @for (plan of catalogue()!.plans; track plan.key) {
            <article class="card plan" [class.current]="plan.key === currentPlan()" [class.featured]="plan.key === 'PREMIUM'">
              @if (plan.key === 'PREMIUM') {
                <span class="ribbon">Most capable</span>
              }
              <div class="card-body">
                <h2>{{ plan.name }}</h2>
                <p class="tagline small subtle">{{ plan.tagline }}</p>
                <p class="price">
                  ₹{{ plan.price.toLocaleString('en-IN') }}<span class="per">/month</span>
                </p>
                <p class="small">{{ plan.description }}</p>

                <ul class="highlights small">
                  <li>{{ offersLabel(plan) }}</li>
                  <li>{{ limitLabel(plan.limits.branches, 'branch', 'branches') }}</li>
                  <li>{{ limitLabel(plan.limits.categories, 'category', 'categories') }}</li>
                  <li>{{ plan.profile }} shop profile</li>
                  <li>{{ plan.visibility.nearMe }} Near Me visibility</li>
                </ul>

                @if (plan.key === currentPlan()) {
                  <button type="button" class="btn btn-secondary btn-block" disabled>
                    Current plan
                  </button>
                } @else if (!canManage()) {
                  <p class="small subtle">Ask a shop administrator to change the plan.</p>
                } @else {
                  <button
                    type="button"
                    class="btn btn-block"
                    [class.btn-secondary]="isDowngrade(plan.key)"
                    [disabled]="busy()"
                    (click)="choose(plan)"
                  >
                    {{ isDowngrade(plan.key) ? 'Switch to ' + plan.name : 'Upgrade to ' + plan.name }}
                  </button>
                }
              </div>
            </article>
          }
        </div>

        <section class="card mt-3">
          <div class="card-header"><h2>Compare every feature</h2></div>
          <div class="card-body">
            <div class="table-wrap">
              <table class="compare">
                <thead>
                  <tr>
                    <th>Feature</th>
                    @for (plan of catalogue()!.plans; track plan.key) {
                      <th class="center" [class.current]="plan.key === currentPlan()">
                        {{ plan.name }}
                      </th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of catalogue()!.comparison; track row.label) {
                    <tr>
                      <td>{{ row.label }}</td>
                      @for (value of row.values; track $index) {
                        <td class="center" [class.current]="$index === currentIndex()">
                          @if (value === true) {
                            <span class="yes" aria-label="Included">✓</span>
                          } @else if (value === false) {
                            <span class="no" aria-label="Not included">—</span>
                          } @else {
                            {{ value }}
                          }
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .plans {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
        gap: 1rem;
        align-items: stretch;
      }

      .plan {
        position: relative;
        display: flex;
        overflow: hidden;
      }

      .plan .card-body {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        width: 100%;
      }

      .plan.featured {
        border-color: var(--brand);
        box-shadow: var(--shadow);
      }

      .plan.current {
        border-color: var(--success);
      }

      .ribbon {
        position: absolute;
        top: 0.75rem;
        right: -2.2rem;
        transform: rotate(45deg);
        background: var(--brand);
        color: #fff;
        font-size: 0.66rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        padding: 0.2rem 2.5rem;
      }

      .plan h2 {
        margin: 0;
        font-size: 1.15rem;
      }

      .tagline {
        margin: 0;
      }

      .price {
        font-size: 1.9rem;
        font-weight: 780;
        margin: 0.3rem 0 0.2rem;
        font-variant-numeric: tabular-nums;
      }

      .price .per {
        font-size: 0.9rem;
        font-weight: 500;
        color: var(--text-muted);
      }

      .highlights {
        list-style: none;
        margin: 0.5rem 0 1rem;
        padding: 0;
        flex: 1;
      }

      .highlights li {
        padding: 0.22rem 0;
        color: var(--text-muted);
        border-bottom: 1px solid var(--border);
      }

      .highlights li:last-child {
        border-bottom: none;
      }

      .compare td,
      .compare th {
        white-space: nowrap;
      }

      .compare .center {
        text-align: center;
      }

      /* The column the merchant is on is tinted the whole way down, so their
         current position stays obvious while scanning a long matrix. */
      .compare .current {
        background: var(--brand-tint);
      }

      .yes {
        color: var(--success);
        font-weight: 700;
      }

      .no {
        color: var(--text-subtle);
      }
    `,
  ],
})
export class SubscriptionUpgradeComponent {
  private readonly subscriptions = inject(SubscriptionService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly busy = signal(false);
  readonly catalogue = this.subscriptions.plans;

  constructor() {
    this.subscriptions.load();
  }

  readonly currentPlan = computed<PlanKey>(() => this.subscriptions.plan());

  /** Column index of the current plan, for tinting the comparison matrix. */
  readonly currentIndex = computed(() =>
    this.catalogue()?.plans.findIndex((plan) => plan.key === this.currentPlan()) ?? -1,
  );

  canManage(): boolean {
    return this.auth.hasAny(PERMISSIONS.MANAGE_SUBSCRIPTION);
  }

  isDowngrade(plan: PlanKey): boolean {
    const rank = { FREE: 0, BUSINESS: 1, PREMIUM: 2 };
    return rank[plan] < rank[this.currentPlan()];
  }

  offersLabel(plan: Plan): string {
    return plan.limits.offersPerMonth === null
      ? 'Unlimited offers'
      : `${plan.limits.offersPerMonth} offer per month`;
  }

  limitLabel(limit: number | null, one: string, many: string): string {
    if (limit === null) return `Unlimited ${many}`;
    return `${limit} ${limit === 1 ? one : many}`;
  }

  choose(plan: Plan): void {
    const shopId = this.subscriptions.current()?.shopId;
    if (!shopId) {
      this.toast.error('You are not assigned to a shop yet.');
      return;
    }

    const action = this.isDowngrade(plan.key) ? 'switch to' : 'upgrade to';
    const cost = plan.price > 0 ? ` You will be billed ₹${plan.price.toLocaleString('en-IN')} a month.` : '';
    if (!confirm(`${action === 'switch to' ? 'Switch' : 'Upgrade'} this shop to the ${plan.name} plan?${cost}`)) {
      return;
    }

    this.busy.set(true);
    this.subscriptions.changePlan(shopId, plan.key).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(`Your shop is now on the ${plan.name} plan.`);
        this.router.navigate(['/admin/subscription']);
      },
      error: (error) => {
        this.busy.set(false);
        this.toast.error(error?.error?.error?.message ?? 'That plan change could not be applied.');
      },
    });
  }
}
