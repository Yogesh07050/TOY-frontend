import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { AnalyticsFilters, FeatureName, OfferPerformance } from '../../../core/models';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
  UpgradePromptComponent,
} from '../../../shared/analytics-ui.components';
import { AnalyticsFilterBarComponent } from './analytics-filter-bar.component';
import { PremiumDashboard } from './premium-dashboard.base';

/** §9 — which offers perform best, with the five conversion rates from §9. */
@Component({
  selector: 'app-offer-performance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AnalyticsFilterBarComponent,
    AnalyticsEmptyComponent,
    AnalyticsSectionComponent,
    AnalyticsSkeletonComponent,
    UpgradePromptComponent,
  ],
  template: `
    <app-analytics-filter-bar [showBranch]="true" [showCategory]="true" />

    @if (upgrade()) {
      <app-upgrade-prompt [feature]="feature" heading="Advanced offer analytics" />
    } @else if (loading()) {
      <app-analytics-skeleton [count]="5" [chartHeight]="320" />
    } @else if (failed()) {
      <div class="card"><div class="card-body">{{ failed() }}</div></div>
    } @else if (data(); as report) {
      <div class="grid grid-stats mb-2">
        <div class="stat card">
          <span class="stat-label">Impression → view</span>
          <span class="stat-value">{{ percent(report.rates.impressionToView) }}</span>
        </div>
        <div class="stat card">
          <span class="stat-label">View → save</span>
          <span class="stat-value">{{ percent(report.rates.viewToSave) }}</span>
        </div>
        <div class="stat card">
          <span class="stat-label">View → claim</span>
          <span class="stat-value info">{{ percent(report.rates.viewToClaim) }}</span>
        </div>
        <div class="stat card">
          <span class="stat-label">Claim → redemption</span>
          <span class="stat-value success">{{ percent(report.rates.claimToRedemption) }}</span>
        </div>
        <div class="stat card">
          <span class="stat-label">View → redemption</span>
          <span class="stat-value">{{ percent(report.rates.viewToRedemption) }}</span>
        </div>
        <div class="stat card">
          <span class="stat-label">Engagement rate</span>
          <span class="stat-value">{{ percent(report.rates.engagement) }}</span>
        </div>
      </div>

      <app-analytics-section
        heading="Offer performance"
        [subtitle]="report.offers.length + ' offers in the selected period'"
        hint="Counts cover the selected date range only, so an older offer shows the activity it saw in this window rather than its lifetime total."
      >
        <div actions class="row">
          <label class="small muted">
            Sort by
            <select [ngModel]="sort()" (ngModelChange)="setSort($event)">
              <option value="views">Views</option>
              <option value="claims">Claims</option>
              <option value="redemptions">Redemptions</option>
              <option value="conversion">Conversion</option>
              <option value="saves">Saves</option>
              <option value="newest">Newest</option>
            </select>
          </label>
        </div>

        @if (!report.offers.length) {
          <app-analytics-empty
            title="No offers in this period."
            message="Widen the date range, or publish an offer to start collecting performance data."
          />
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Offer</th>
                  <th>Category</th>
                  <th class="num">Views</th>
                  <th class="num">Saves</th>
                  <th class="num">Shares</th>
                  <th class="num">Claims</th>
                  <th class="num">Redemptions</th>
                  <th class="num">Conversion</th>
                  <th class="num">Redemption rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                @for (offer of report.offers; track offer.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/admin/offers', offer.id, 'edit']" class="truncate">
                        {{ offer.title }}
                      </a>
                    </td>
                    <td class="small subtle">{{ offer.category ?? '—' }}</td>
                    <td class="num">{{ count(offer.views) }}</td>
                    <td class="num">{{ count(offer.saves) }}</td>
                    <td class="num">{{ count(offer.shares) }}</td>
                    <td class="num">{{ count(offer.claims) }}</td>
                    <td class="num">{{ count(offer.redemptions) }}</td>
                    <td class="num">{{ percent(offer.rates.viewToClaim) }}</td>
                    <td class="num">{{ percent(offer.rates.claimToRedemption) }}</td>
                    <td>
                      <span class="badge" [class]="badgeFor(offer.status)">{{ offer.status }}</span>
                    </td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" class="strong">Total</td>
                  <td class="num strong">{{ count(report.totals['views']) }}</td>
                  <td class="num strong">{{ count(report.totals['saves']) }}</td>
                  <td class="num strong">{{ count(report.totals['shares']) }}</td>
                  <td class="num strong">{{ count(report.totals['claims']) }}</td>
                  <td class="num strong">{{ count(report.totals['redemptions']) }}</td>
                  <td class="num strong">{{ percent(report.rates.viewToClaim) }}</td>
                  <td class="num strong">{{ percent(report.rates.claimToRedemption) }}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        }
      </app-analytics-section>
    }
  `,
  styles: [
    `
      .num {
        text-align: right;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      td a {
        display: inline-block;
        max-width: 22ch;
      }

      tfoot td {
        border-top: 2px solid var(--border);
      }

      select {
        width: auto;
      }

      .stat {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        padding: 0.85rem 1rem;
      }

      .stat-label {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
        font-weight: 700;
      }

      .stat-value {
        font-size: 1.45rem;
        font-weight: 750;
        font-variant-numeric: tabular-nums;
      }

      .stat-value.success {
        color: var(--success);
      }
      .stat-value.info {
        color: var(--info);
      }
    `,
  ],
})
export class OfferPerformanceComponent extends PremiumDashboard<OfferPerformance> {
  protected readonly feature: FeatureName = 'ANALYTICS_ADVANCED';

  readonly sort = signal('views');

  constructor() {
    super();
    this.watchFilters();
  }

  protected fetch(filters: AnalyticsFilters): Observable<OfferPerformance> {
    return this.api.premiumOfferPerformance({ ...filters, sort: this.sort(), limit: 100 });
  }

  setSort(sort: string): void {
    this.sort.set(sort);
    this.load();
  }

  badgeFor(status: string): string {
    return (
      {
        active: 'badge-success',
        scheduled: 'badge-info',
        expired: 'badge-warning',
        deactivated: 'badge-danger',
      }[status] ?? 'badge-brand'
    );
  }
}
