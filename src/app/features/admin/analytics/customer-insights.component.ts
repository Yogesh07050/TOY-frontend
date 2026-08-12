import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';

import {
  Acquisition,
  AnalyticsFilters,
  CustomerInsights,
  FeatureName,
  Retention,
} from '../../../core/models';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
  LineChartComponent,
  LineSeries,
  ShareBarsComponent,
  UpgradePromptComponent,
} from '../../../shared/analytics-ui.components';
import { AnalyticsFilterBarComponent } from './analytics-filter-bar.component';
import { PremiumDashboard } from './premium-dashboard.base';

interface CustomerBundle {
  insights: CustomerInsights;
  acquisition: Acquisition;
  /** Null when the plan covers customer insights but not the trends add-on. */
  retention: Retention | null;
}

/**
 * §13, §14, §23 and §24 on one page.
 *
 * The requirements list these as four dashboards, but they answer one question
 * — who are my customers and do they come back — and §7 asks for related
 * analytics to be grouped rather than split across unrelated pages.
 *
 * Nothing here identifies a customer: every figure is an aggregate (§13).
 */
@Component({
  selector: 'app-customer-insights',
  standalone: true,
  imports: [
    CommonModule,
    AnalyticsFilterBarComponent,
    AnalyticsEmptyComponent,
    AnalyticsSectionComponent,
    AnalyticsSkeletonComponent,
    LineChartComponent,
    ShareBarsComponent,
    UpgradePromptComponent,
  ],
  template: `
    <app-analytics-filter-bar [showBranch]="true" [showCategory]="true" />

    @if (upgrade()) {
      <app-upgrade-prompt [feature]="feature" heading="Customer insights" />
    } @else if (loading()) {
      <app-analytics-skeleton [count]="6" [chartHeight]="260" />
    } @else if (failed()) {
      <div class="card"><div class="card-body">{{ failed() }}</div></div>
    } @else if (data(); as bundle) {
      <div class="grid grid-stats mb-2">
        <div class="stat card">
          <span class="stat-label">Total reach</span>
          <span class="stat-value">{{ count(bundle.insights.totals.reach) }}</span>
        </div>
        <div class="stat card">
          <span class="stat-label">New customers</span>
          <span class="stat-value info">{{ count(bundle.insights.totals.newCustomers) }}</span>
          <span class="small subtle">{{ percent(bundle.insights.split.newPercent) }} of reach</span>
        </div>
        <div class="stat card">
          <span class="stat-label">Returning customers</span>
          <span class="stat-value success">{{ count(bundle.insights.totals.returningCustomers) }}</span>
          <span class="small subtle">
            {{ percent(bundle.insights.split.returningPercent) }} of reach
          </span>
        </div>
        <div class="stat card">
          <span class="stat-label">Saved offers</span>
          <span class="stat-value">{{ count(bundle.insights.totals.savingCustomers) }}</span>
        </div>
        <div class="stat card">
          <span class="stat-label">Claiming customers</span>
          <span class="stat-value">{{ count(bundle.insights.totals.claimingCustomers) }}</span>
        </div>
        <div class="stat card">
          <span class="stat-label">Redeeming customers</span>
          <span class="stat-value">{{ count(bundle.insights.totals.redeemingCustomers) }}</span>
        </div>
      </div>

      @if (!hasCustomers()) {
        <app-analytics-section heading="Customer insights">
          <app-analytics-empty
            icon="👥"
            title="Not enough data yet."
            message="Publish and promote more offers to unlock meaningful customer insights."
          />
        </app-analytics-section>
      } @else {
        <div class="split">
          <app-analytics-section
            heading="New vs returning"
            subtitle="How often customers come back to your offers"
          >
            <app-share-bars [rows]="splitRows()" />

            <h3 class="sub">Return frequency</h3>
            <app-share-bars [rows]="frequencyRows()" />
          </app-analytics-section>

          <app-analytics-section
            heading="Customer interest"
            subtitle="Aggregated category interest across your offers"
            hint="Aggregated across all customers — individual browsing history is never shown."
          >
            @if (!interestRows().length) {
              <app-analytics-empty icon="🏷️" title="No category interest yet." message="" />
            } @else {
              <app-share-bars [rows]="interestRows()" />
            }
          </app-analytics-section>
        </div>

        <app-analytics-section
          heading="Customer segments"
          subtitle="Behavioural groups derived from engagement"
          class="mt-2"
        >
          <div class="segments">
            @for (segment of bundle.insights.segments; track segment.key) {
              <div class="segment">
                <span class="value">{{ count(segment.customers) }}</span>
                <span class="small subtle">{{ segment.label }}</span>
              </div>
            }
          </div>
        </app-analytics-section>

        <div class="split mt-2">
          <app-analytics-section
            heading="Customer acquisition"
            [subtitle]="acquisitionSubtitle()"
          >
            <app-line-chart [series]="acquisitionSeries()">
              <app-analytics-empty empty title="No new customers in this period." message="" />
            </app-line-chart>

            <h3 class="sub">Acquisition funnel</h3>
            <ul class="mini-funnel">
              @for (stage of bundle.acquisition.funnel; track stage.key) {
                <li>
                  <span>{{ stage.label }}</span>
                  <span class="strong">{{ count(stage.value) }}</span>
                  <span class="small subtle">{{ percent(stage.conversion) }}</span>
                </li>
              }
            </ul>
          </app-analytics-section>

          <app-analytics-section
            heading="Customer retention"
            subtitle="Whether customers return to your offers"
          >
            @if (!bundle.retention) {
              <app-upgrade-prompt
                feature="CUSTOMER_TRENDS"
                heading="Customer trends"
                note="Retention trending over time is part of the Premium plan."
              />
            } @else {
              <div class="retention">
                <div>
                  <span class="value">{{ percent(bundle.retention.returningRate) }}</span>
                  <span class="small subtle">Returning customers</span>
                </div>
                <div>
                  <span class="value">{{ percent(bundle.retention.repeatClaimRate) }}</span>
                  <span class="small subtle">Repeat claim rate</span>
                </div>
                <div>
                  <span class="value">{{ percent(bundle.retention.repeatRedemptionRate) }}</span>
                  <span class="small subtle">Repeat redemption rate</span>
                </div>
                <div>
                  <span class="value">{{ bundle.retention.averageVisitsPerCustomer }}</span>
                  <span class="small subtle">Average visits per customer</span>
                </div>
              </div>

              @if (bundle.retention.timeline.length > 1) {
                <h3 class="sub">Returning rate over time</h3>
                <app-line-chart [series]="retentionSeries()" />
              }
            }
          </app-analytics-section>
        </div>
      }
    }
  `,
  styles: [
    `
      .split {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
        align-items: start;
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
        font-size: 1.5rem;
        font-weight: 750;
        font-variant-numeric: tabular-nums;
      }

      .stat-value.info {
        color: var(--info);
      }
      .stat-value.success {
        color: var(--success);
      }

      .sub {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
        margin: 1.25rem 0 0.6rem;
      }

      .segments {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
        gap: 0.75rem;
      }

      .segment {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        padding: 0.7rem 0.85rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--surface-alt);
      }

      .segment .value,
      .retention .value {
        font-size: 1.35rem;
        font-weight: 740;
        font-variant-numeric: tabular-nums;
      }

      .retention {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
        gap: 0.9rem;
      }

      .retention > div {
        display: flex;
        flex-direction: column;
      }

      .mini-funnel {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .mini-funnel li {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 4rem 4rem;
        gap: 0.5rem;
        padding: 0.4rem 0;
        border-bottom: 1px solid var(--border);
        font-size: 0.88rem;
      }

      .mini-funnel li:last-child {
        border-bottom: none;
      }

      .mini-funnel .strong,
      .mini-funnel .small {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }

      @media (max-width: 980px) {
        .split {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
  ],
})
export class CustomerInsightsComponent extends PremiumDashboard<CustomerBundle> {
  protected readonly feature: FeatureName = 'CUSTOMER_ANALYTICS_ADVANCED';

  constructor() {
    super();
    this.watchFilters();
  }

  /**
   * Retention sits behind a different feature flag to the rest of this page, so
   * its failure is caught and folded into the bundle as null rather than
   * failing the whole screen — the merchant still gets everything else.
   */
  protected fetch(filters: AnalyticsFilters): Observable<CustomerBundle> {
    return forkJoin({
      insights: this.api.premiumCustomers(filters),
      acquisition: this.api.premiumAcquisition(filters),
      retention: this.retentionOrNull(filters),
    });
  }

  private retentionOrNull(filters: AnalyticsFilters): Observable<Retention | null> {
    return new Observable<Retention | null>((subscriber) => {
      this.api.premiumRetention(filters).subscribe({
        next: (retention) => {
          subscriber.next(retention);
          subscriber.complete();
        },
        error: () => {
          subscriber.next(null);
          subscriber.complete();
        },
      });
    });
  }

  readonly hasCustomers = computed(() => (this.data()?.insights.totals.reach ?? 0) > 0);

  readonly splitRows = computed(() => {
    const split = this.data()?.insights.split;
    return [
      { label: 'First-time', value: split?.newPercent ?? 0 },
      { label: 'Returning', value: split?.returningPercent ?? 0 },
    ];
  });

  readonly frequencyRows = computed(() =>
    (this.data()?.insights.visitFrequency ?? []).map((row) => ({
      label: row.bucket,
      value: row.percent ?? 0,
    })),
  );

  readonly interestRows = computed(() =>
    (this.data()?.insights.interests ?? []).map((row) => ({
      label: row.category,
      value: row.percent ?? 0,
    })),
  );

  readonly acquisitionSubtitle = computed(() => {
    const acquisition = this.data()?.acquisition;
    if (!acquisition) return '';
    const noun = `${this.count(acquisition.newCustomers)} new customer${acquisition.newCustomers === 1 ? '' : 's'}`;
    const growth = acquisition.growth;
    if (growth === null) return noun;
    const direction = growth >= 0 ? '+' : '';
    return `${noun} · ${direction}${growth}% vs the previous period`;
  });

  readonly acquisitionSeries = computed<LineSeries[]>(() => [
    {
      key: 'new',
      label: 'New customers',
      colour: 'var(--info)',
      points: (this.data()?.acquisition.timeline ?? []).map((point) => ({
        label: this.dayLabel(point.day),
        value: point.customers,
      })),
    },
  ]);

  readonly retentionSeries = computed<LineSeries[]>(() => [
    {
      key: 'returning',
      label: 'Returning rate',
      colour: 'var(--success)',
      points: (this.data()?.retention?.timeline ?? []).map((point) => ({
        label: point.month,
        value: point.returningRate ?? 0,
      })),
    },
  ]);
}
