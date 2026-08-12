import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { Observable } from 'rxjs';

import { AnalyticsFilters, BranchPerformance, FeatureName } from '../../../core/models';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
  BarChartComponent,
  UpgradePromptComponent,
} from '../../../shared/analytics-ui.components';
import { AnalyticsFilterBarComponent } from './analytics-filter-bar.component';
import { PremiumDashboard } from './premium-dashboard.base';

/** §12 — branch comparison for Premium merchants with multiple locations. */
@Component({
  selector: 'app-branch-performance',
  standalone: true,
  imports: [
    CommonModule,
    AnalyticsFilterBarComponent,
    AnalyticsEmptyComponent,
    AnalyticsSectionComponent,
    AnalyticsSkeletonComponent,
    BarChartComponent,
    UpgradePromptComponent,
  ],
  template: `
    <app-analytics-filter-bar [showCategory]="true" />

    @if (upgrade()) {
      <app-upgrade-prompt [feature]="feature" heading="Branch performance" />
    } @else if (loading()) {
      <app-analytics-skeleton [count]="4" [chartHeight]="280" />
    } @else if (failed()) {
      <div class="card"><div class="card-body">{{ failed() }}</div></div>
    } @else if (data(); as report) {
      @if (report.branches.length < 2) {
        <app-analytics-section heading="Branch performance">
          <app-analytics-empty
            icon="🏬"
            title="Branch comparison needs more than one branch."
            message="Add a second branch to compare how each location performs."
          />
        </app-analytics-section>
      } @else {
        <div class="grid grid-stats mb-2">
          @for (award of awards(); track award.label) {
            <div class="stat card">
              <span class="stat-label">{{ award.icon }} {{ award.label }}</span>
              <span class="stat-value">{{ award.branch }}</span>
              <span class="small subtle">{{ award.detail }}</span>
            </div>
          }
        </div>

        <app-analytics-section
          heading="Views by branch"
          subtitle="Where customers are seeing your offers"
        >
          <app-bar-chart [points]="viewPoints()" [height]="180" />
        </app-analytics-section>

        <app-analytics-section
          heading="Branch comparison"
          class="mt-2"
          hint="An event is attributed to the branch the customer viewed the offer at. Views with no branch context are not spread across branches, which would invent numbers."
        >
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>City</th>
                  <th class="num">Active offers</th>
                  <th class="num">Views</th>
                  <th class="num">Reach</th>
                  <th class="num">Claims</th>
                  <th class="num">Redemptions</th>
                  <th class="num">Conversion</th>
                  <th>Top offer</th>
                </tr>
              </thead>
              <tbody>
                @for (branch of report.branches; track branch.id) {
                  <tr>
                    <td>
                      {{ branch.branchName }}
                      @if (branch.isPrimary) {
                        <span class="badge badge-brand">Primary</span>
                      }
                    </td>
                    <td class="small subtle">{{ branch.city ?? '—' }}</td>
                    <td class="num">{{ count(branch.activeOffers) }}</td>
                    <td class="num">{{ count(branch.views) }}</td>
                    <td class="num">{{ count(branch.customers) }}</td>
                    <td class="num">{{ count(branch.claims) }}</td>
                    <td class="num">{{ count(branch.redemptions) }}</td>
                    <td class="num">{{ percent(branch.conversion) }}</td>
                    <td class="small subtle truncate">{{ branch.topOffer?.title ?? '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </app-analytics-section>
      }
    }
  `,
  styles: [
    `
      .num {
        text-align: right;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
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
        font-size: 1.15rem;
        font-weight: 720;
        line-height: 1.25;
      }

      td .badge {
        margin-left: 0.35rem;
      }

      td.truncate {
        max-width: 18ch;
      }
    `,
  ],
})
export class BranchPerformanceComponent extends PremiumDashboard<BranchPerformance> {
  protected readonly feature: FeatureName = 'BRANCH_ANALYTICS';

  constructor() {
    super();
    this.watchFilters();
  }

  protected fetch(filters: AnalyticsFilters): Observable<BranchPerformance> {
    return this.api.premiumBranches(filters);
  }

  /** "1 redemption" / "12 redemptions" — a bare +s reads as a bug at one. */
  private plural(value: number | null | undefined, noun: string): string {
    const amount = value ?? 0;
    return `${this.count(amount)} ${noun}${amount === 1 ? '' : 's'}`;
  }

  readonly viewPoints = computed(() =>
    (this.data()?.branches ?? []).map((branch) => ({
      label: branch.branchName,
      value: branch.views,
    })),
  );

  /** The four "🏆" cards from §12, skipping any the data cannot support. */
  readonly awards = computed(() => {
    const winners = this.data()?.winners;
    if (!winners) return [];

    const cards = [
      {
        icon: '🏆',
        label: 'Best performing',
        branch: winners.bestPerforming?.branchName,
        detail: this.plural(winners.bestPerforming?.views, 'view'),
      },
      {
        icon: '🏆',
        label: 'Highest conversion',
        branch: winners.highestConversion?.branchName,
        detail: this.percent(winners.highestConversion?.conversion),
      },
      {
        icon: '🏆',
        label: 'Most viewed',
        branch: winners.mostViewed?.branchName,
        detail: this.plural(winners.mostViewed?.views, 'view'),
      },
      {
        icon: '🏆',
        label: 'Most redemptions',
        branch: winners.mostRedemptions?.branchName,
        detail: this.plural(winners.mostRedemptions?.redemptions, 'redemption'),
      },
    ];

    return cards.filter((card): card is typeof card & { branch: string } => Boolean(card.branch));
  });
}
