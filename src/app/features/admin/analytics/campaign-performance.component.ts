import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AnalyticsFilters, CampaignPerformance, FeatureName, Roi } from '../../../core/models';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
  BarChartComponent,
  UpgradePromptComponent,
} from '../../../shared/analytics-ui.components';
import { AnalyticsFilterBarComponent } from './analytics-filter-bar.component';
import { PremiumDashboard } from './premium-dashboard.base';

interface CampaignBundle {
  performance: CampaignPerformance;
  /** Null when the ROI dashboard is not available on this plan. */
  roi: Roi | null;
}

/**
 * §15 campaign and banner performance, with §25 ROI folded in.
 *
 * ROI is only shown for campaigns the merchant supplied a cost and average
 * order value for; everything else is listed as needing input rather than
 * estimated from nothing (§25). Every derived figure is labelled estimated.
 */
@Component({
  selector: 'app-campaign-performance',
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
    <app-analytics-filter-bar [showCampaign]="true" />

    @if (upgrade()) {
      <app-upgrade-prompt [feature]="feature" heading="Campaign performance" />
    } @else if (loading()) {
      <app-analytics-skeleton [count]="4" [chartHeight]="300" />
    } @else if (failed()) {
      <div class="card"><div class="card-body">{{ failed() }}</div></div>
    } @else if (data(); as bundle) {
      @if (!bundle.performance.banners.length) {
        <app-analytics-section heading="Campaign performance">
          <app-analytics-empty
            icon="📣"
            title="No campaigns or banners yet."
            message="Create a featured banner to start measuring campaign performance."
          />
        </app-analytics-section>
      } @else {
        <div class="grid grid-stats mb-2">
          @for (award of awards(); track award.label) {
            <div class="stat card">
              <span class="stat-label">{{ award.label }}</span>
              <span class="stat-value">{{ award.name }}</span>
              <span class="small subtle">{{ award.detail }}</span>
            </div>
          }
        </div>

        <app-analytics-section heading="Impressions by banner" subtitle="Reach of each promotion">
          <app-bar-chart [points]="impressionPoints()" [height]="170" />
        </app-analytics-section>

        <app-analytics-section
          heading="Banner performance"
          class="mt-2"
          hint="Offer views, claims and redemptions are the totals for the offer the banner points at, over the same period — not only the traffic the banner sent."
        >
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Banner</th>
                  <th>Campaign</th>
                  <th class="num">Impressions</th>
                  <th class="num">Clicks</th>
                  <th class="num">CTR</th>
                  <th class="num">Offer views</th>
                  <th class="num">Claims</th>
                  <th class="num">Redemptions</th>
                </tr>
              </thead>
              <tbody>
                @for (banner of bundle.performance.banners; track banner.id) {
                  <tr>
                    <td class="truncate">{{ banner.title }}</td>
                    <td class="small subtle">{{ banner.campaignName ?? '—' }}</td>
                    <td class="num">{{ count(banner.impressions) }}</td>
                    <td class="num">{{ count(banner.clicks) }}</td>
                    <td class="num">{{ percent(banner.ctr) }}</td>
                    <td class="num">{{ count(banner.offerViews) }}</td>
                    <td class="num">{{ count(banner.offerClaims) }}</td>
                    <td class="num">{{ count(banner.offerRedemptions) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </app-analytics-section>

        @if (bundle.performance.campaigns.length) {
          <app-analytics-section heading="Campaigns" class="mt-2">
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Status</th>
                    <th class="num">Banners</th>
                    <th class="num">Impressions</th>
                    <th class="num">Clicks</th>
                    <th class="num">CTR</th>
                    <th class="num">Claims</th>
                    <th class="num">Redemptions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (campaign of bundle.performance.campaigns; track campaign.id) {
                    <tr>
                      <td>{{ campaign.name }}</td>
                      <td><span class="badge badge-brand">{{ campaign.status }}</span></td>
                      <td class="num">{{ count(campaign.banners) }}</td>
                      <td class="num">{{ count(campaign.impressions) }}</td>
                      <td class="num">{{ count(campaign.clicks) }}</td>
                      <td class="num">{{ percent(campaign.ctr) }}</td>
                      <td class="num">{{ count(campaign.offerClaims) }}</td>
                      <td class="num">{{ count(campaign.offerRedemptions) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </app-analytics-section>
        }

        <app-analytics-section
          heading="Campaign value"
          subtitle="Estimated return, based on redemptions and the figures you provided"
          class="mt-2"
        >
          @if (!bundle.roi) {
            <app-upgrade-prompt feature="ROI_DASHBOARD" heading="ROI dashboard" />
          } @else if (!bundle.roi.hasEnoughData) {
            <app-analytics-empty
              icon="💰"
              title="No campaign has enough input to estimate ROI."
              [message]="roiPrompt()"
            />
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th class="num">Redemptions</th>
                    <th class="num">Cost</th>
                    <th class="num">Est. revenue</th>
                    <th class="num">Est. gross profit</th>
                    <th class="num">Est. ROI</th>
                  </tr>
                </thead>
                <tbody>
                  @for (campaign of bundle.roi.campaigns; track campaign.id) {
                    <tr>
                      <td>{{ campaign.name }}</td>
                      <td class="num">{{ count(campaign.redemptions) }}</td>
                      <td class="num">{{ rupees(campaign.cost) }}</td>
                      <td class="num">{{ rupees(campaign.estimatedRevenue) }}</td>
                      <td class="num">{{ rupees(campaign.estimatedGrossProfit) }}</td>
                      <td class="num strong">{{ campaign.estimatedRoi }}×</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="small subtle disclaimer">{{ bundle.roi.disclaimer }}</p>
          }
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

      td.truncate {
        max-width: 20ch;
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
        font-size: 1.1rem;
        font-weight: 720;
        line-height: 1.3;
      }

      .disclaimer {
        margin: 0.75rem 0 0;
      }
    `,
  ],
})
export class CampaignPerformanceComponent extends PremiumDashboard<CampaignBundle> {
  protected readonly feature: FeatureName = 'CAMPAIGN_ANALYTICS';

  constructor() {
    super();
    this.watchFilters();
  }

  protected fetch(filters: AnalyticsFilters): Observable<CampaignBundle> {
    return forkJoin({
      performance: this.api.premiumCampaigns(filters),
      // ROI is a separate entitlement, so its refusal must not take the whole
      // campaigns page down with it.
      roi: this.api.premiumRoi(filters).pipe(catchError(() => of(null))),
    });
  }

  readonly impressionPoints = computed(() =>
    (this.data()?.performance.banners ?? [])
      .slice(0, 12)
      .map((banner) => ({ label: banner.title, value: banner.impressions })),
  );

  readonly roiPrompt = computed(() => {
    const missing = this.data()?.roi?.needsInput ?? [];
    if (!missing.length) return 'Add a campaign cost and average order value to estimate return.';
    return `Add a campaign cost and average order value to ${missing.length === 1 ? 'this campaign' : `${missing.length} campaigns`} to estimate return.`;
  });

  /** The "best campaign" cards from §15, skipping any the data cannot support. */
  readonly awards = computed(() => {
    const winners = this.data()?.performance.winners;
    if (!winners) return [];

    const cards = [
      {
        label: '🏆 Best campaign',
        name: winners['bestCampaign']?.name ?? winners['bestCampaign']?.title,
        detail: `${this.count(winners['bestCampaign']?.impressions)} impressions`,
      },
      {
        label: '🏆 Highest CTR',
        name: winners['highestCtr']?.name ?? winners['highestCtr']?.title,
        detail: this.percent(winners['highestCtr']?.ctr),
      },
      {
        label: '🏆 Most claims',
        name: winners['highestClaims']?.name ?? winners['highestClaims']?.title,
        detail: `${this.count(winners['highestClaims']?.offerClaims)} claims`,
      },
      {
        label: '🏆 Most redemptions',
        name: winners['highestRedemptions']?.name ?? winners['highestRedemptions']?.title,
        detail: `${this.count(winners['highestRedemptions']?.offerRedemptions)} redemptions`,
      },
    ];

    return cards.filter((card): card is typeof card & { name: string } => Boolean(card.name));
  });
}
