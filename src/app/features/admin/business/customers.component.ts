import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { Observable } from 'rxjs';

import { BusinessFilters, CustomerMetrics } from '../../../core/models';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
  KpiCardComponent,
  LineChartComponent,
  LineSeries,
} from '../../../shared/analytics-ui.components';
import { ErrorStateComponent } from '../../../shared/state.components';
import { BusinessDashboard } from './business-dashboard.base';
import { BusinessFilterBarComponent } from './business-filter-bar.component';

/** §5-§10 — DAU, MAU, stickiness, per-user engagement and the redemption rate. */
@Component({
  selector: 'app-business-customers',
  standalone: true,
  imports: [
    CommonModule,
    BusinessFilterBarComponent,
    AnalyticsEmptyComponent,
    AnalyticsSectionComponent,
    AnalyticsSkeletonComponent,
    KpiCardComponent,
    LineChartComponent,
    ErrorStateComponent,
  ],
  template: `
    <app-business-filter-bar [showCity]="true" [showCategory]="true" />

    @if (loading()) {
      <app-analytics-skeleton [count]="7" />
    } @else if (failure(); as problem) {
      <app-error-state
        [offline]="problem.offline"
        [message]="problem.message"
        [reference]="problem.requestId"
        (retry)="load()"
      />
    } @else if (data(); as metrics) {
      <div class="grid grid-stats stagger mb-2">
        @for (kpi of metrics.kpis; track kpi.key) {
          <app-kpi-card [kpi]="kpi" />
        }
      </div>

      <div class="chart-grid mb-2">
        <app-analytics-section
          heading="Daily active users"
          [subtitle]="
            'Average ' + count(metrics.activity.averageDau) + ' a day · ' +
            count(metrics.activity.mau) + ' unique in the period'
          "
        >
          <app-line-chart [series]="activitySeries()">
            <app-analytics-empty
              empty
              title="No customer activity yet."
              message="Daily actives appear here once customers start using the app."
            />
          </app-line-chart>
        </app-analytics-section>

        <app-analytics-section heading="New sign-ups" subtitle="Customer accounts created">
          <app-line-chart [series]="signupSeries()">
            <app-analytics-empty
              empty
              title="No sign-ups in this period."
              message="New customer accounts will be charted here."
            />
          </app-line-chart>
        </app-analytics-section>
      </div>

      <app-analytics-section
        heading="Engagement"
        subtitle="What customers did with offers in this period"
      >
        <div class="table-wrap">
          <table>
            <tbody>
              <tr>
                <th scope="row">Offer views</th>
                <td>{{ count(metrics.engagement.views) }}</td>
              </tr>
              <tr>
                <th scope="row">Saves</th>
                <td>{{ count(metrics.engagement.saves) }}</td>
              </tr>
              <tr>
                <th scope="row">Claims</th>
                <td>{{ count(metrics.engagement.claims) }}</td>
              </tr>
              <tr>
                <th scope="row">
                  Eligible claims
                  <span class="info" [title]="metrics.definitions.claimEligibility">ⓘ</span>
                </th>
                <td>{{ count(metrics.engagement.eligibleClaims) }}</td>
              </tr>
              <!-- §10: "Pending, still-valid claims may remain separate from
                   expired/failed claims." They are shown, and shown apart. -->
              <tr>
                <th scope="row">Still pending</th>
                <td>
                  {{ count(metrics.engagement.pendingClaims) }}
                  <span class="small subtle">not yet counted in the rate</span>
                </td>
              </tr>
              <tr>
                <th scope="row">Verified redemptions</th>
                <td>{{ count(metrics.engagement.redemptions) }}</td>
              </tr>
              <tr>
                <th scope="row">Redemption rate</th>
                <td>
                  <strong>{{ percent(metrics.engagement.redemptionRate) }}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </app-analytics-section>

      <!-- §5.1 asks that the definition be consistent and stated. The API is
           the authority on it, so it is printed rather than restated here. -->
      <p class="small subtle mt-2">
        <strong>Counted as activity:</strong> {{ activityLabel() }}.
      </p>
    }
  `,
  styles: [
    `
      .chart-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
        gap: 1rem;
        align-items: start;
      }

      @media (max-width: 980px) {
        .chart-grid {
          grid-template-columns: minmax(0, 1fr);
        }
      }

      table {
        width: 100%;
      }

      th {
        text-align: left;
        font-weight: 600;
        color: var(--text-muted);
      }

      td {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }

      td .small {
        margin-left: 0.4rem;
      }

      .info {
        cursor: help;
        opacity: 0.55;
        font-weight: 400;
      }
    `,
  ],
})
export class BusinessCustomersComponent extends BusinessDashboard<CustomerMetrics> {
  constructor() {
    super();
    this.watchFilters();
  }

  protected fetch(filters: BusinessFilters): Observable<CustomerMetrics> {
    return this.api.businessCustomers(filters);
  }

  readonly activitySeries = computed<LineSeries[]>(() => [
    {
      key: 'dau',
      label: 'Active customers',
      colour: 'var(--brand)',
      points: (this.data()?.activity.series ?? []).map((point) => ({
        label: this.dayLabel(point.day),
        value: point.value,
      })),
    },
  ]);

  readonly signupSeries = computed<LineSeries[]>(() => [
    {
      key: 'signups',
      label: 'New customers',
      colour: 'var(--info)',
      points: (this.data()?.signups ?? []).map((point) => ({
        label: this.dayLabel(point.day),
        value: point.value,
      })),
    },
  ]);

  /** `OFFER_CLAIM_VIEW` -> `offer claim view`, so the list reads as prose. */
  readonly activityLabel = computed(() =>
    (this.data()?.definitions.activeUserEvents ?? [])
      .map((event) => event.toLowerCase().replace(/_/g, ' '))
      .join(', '),
  );
}
