import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/auth.service';
import { SubscriptionService } from '../../../core/subscription.service';
import { FeatureName } from '../../../core/models';
import { AnalyticsFiltersService } from './analytics-filters.service';
import { IconComponent } from '../../../shared/icon.component';

interface AnalyticsTab {
  label: string;
  route: string;
  /** Locked (but still visible) when the plan does not include this. */
  feature?: FeatureName;
}

/**
 * The Analytics area shell (V3 §7, §32).
 *
 * Tabs the merchant's plan does not include are shown with a lock rather than
 * hidden: §31 asks for a contextual upgrade prompt, and a merchant cannot
 * decide to upgrade for something they never knew existed. The route still
 * renders, and the page itself shows the prompt in place of the data.
 */
@Component({
  selector: 'app-analytics-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="container page analytics-shell">
      <div class="page-header">
        <div>
          <h1>Analytics</h1>
          <p class="subtitle">
            @if (auth.isSuperAdmin) {
              Platform-wide performance across every shop.
            } @else {
              {{ planLabel() }} · restricted to the shops you manage.
            }
          </p>
        </div>
        @if (!auth.isSuperAdmin && !subscriptions.isPremium()) {
          <a class="btn btn-secondary btn-sm" routerLink="/admin/subscription/upgrade">
            Unlock advanced analytics
          </a>
        }
      </div>

      <nav class="tabs" aria-label="Analytics sections">
        @for (tab of tabs; track tab.route) {
          <a
            [routerLink]="tab.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: false }"
          >
            {{ tab.label }}
            @if (isLocked(tab)) {
              <app-icon
                class="lock"
                name="lock-closed-outline"
                [size]="13"
                label="Requires an upgrade"
              />
            }
          </a>
        }
      </nav>

      <router-outlet />
    </div>
  `,
  styles: [
    `
      .tabs {
        display: flex;
        gap: 0.2rem;
        overflow-x: auto;
        border-bottom: 1px solid var(--border);
        margin-bottom: 1rem;
        /* Hides the scrollbar on desktop without trapping it on touch. */
        scrollbar-width: thin;
      }

      .tabs a {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.55rem 0.85rem;
        white-space: nowrap;
        font-size: 0.88rem;
        font-weight: 600;
        color: var(--text-muted);
        border-bottom: 2px solid transparent;
        transition:
          color var(--fast) var(--ease),
          border-color var(--fast) var(--ease),
          background var(--fast) var(--ease);
      }

      .tabs a:hover {
        color: var(--text);
        background: var(--surface-alt);
        text-decoration: none;
      }

      .tabs a.active {
        color: var(--brand-strong);
        border-bottom-color: var(--brand);
      }

      .lock {
        font-size: 0.72rem;
        opacity: 0.7;
      }

      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }
    `,
  ],
})
export class AnalyticsShellComponent {
  readonly auth = inject(AuthService);
  readonly subscriptions = inject(SubscriptionService);
  private readonly filters = inject(AnalyticsFiltersService);

  /** Navigation from §7 / §32, in the order the requirements list it. */
  protected readonly tabs: AnalyticsTab[] = [
    { label: 'Overview', route: 'overview', feature: 'ANALYTICS_ADVANCED' },
    { label: 'Offer Performance', route: 'offer-performance', feature: 'ANALYTICS_ADVANCED' },
    { label: 'Customer Funnel', route: 'funnel', feature: 'FUNNEL_BASIC' },
    { label: 'Location Insights', route: 'locations', feature: 'LOCATION_ANALYTICS_ADVANCED' },
    { label: 'Branch Performance', route: 'branches', feature: 'BRANCH_ANALYTICS' },
    { label: 'Customer Insights', route: 'customers', feature: 'CUSTOMER_ANALYTICS_ADVANCED' },
    { label: 'Campaign Performance', route: 'campaigns', feature: 'CAMPAIGN_ANALYTICS' },
    { label: 'Offer Intelligence', route: 'intelligence', feature: 'OFFER_INTELLIGENCE' },
    { label: 'Reports', route: 'reports', feature: 'ANALYTICS_EXPORT' },
    { label: 'Platform', route: 'platform' },
  ];

  readonly planLabel = computed(() => `${this.subscriptions.planName()} plan`);

  constructor() {
    this.filters.loadOptions();
  }

  isLocked(tab: AnalyticsTab): boolean {
    if (!tab.feature) return false;
    return !this.subscriptions.has(tab.feature);
  }
}
