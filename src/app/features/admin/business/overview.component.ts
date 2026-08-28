import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { Observable } from 'rxjs';

import { BusinessFilters, BusinessOverview } from '../../../core/models';
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

/** §4 — the executive overview: eleven cards and the activity curve behind them. */
@Component({
  selector: 'app-business-overview',
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
    <app-business-filter-bar [showCity]="true" [showCategory]="true" [showPlan]="true" />

    @if (loading()) {
      <app-analytics-skeleton [count]="11" />
    } @else if (failure(); as problem) {
      <app-error-state
        [offline]="problem.offline"
        [message]="problem.message"
        [reference]="problem.requestId"
        (retry)="load()"
      />
    } @else if (data(); as overview) {
      <div class="grid grid-stats stagger mb-2">
        @for (kpi of overview.kpis; track kpi.key) {
          <app-kpi-card [kpi]="kpi" />
        }
      </div>

      <app-analytics-section
        heading="Active customers"
        subtitle="Unique customers with a meaningful activity each day"
        hint="App opens, website visits, offer and service views, searches, map use, claims and saves. Automated activity is never counted."
      >
        <app-line-chart [series]="activitySeries()">
          <app-analytics-empty
            empty
            title="No customer activity recorded yet."
            message="Activity appears here as soon as customers start using the app."
          />
        </app-line-chart>
      </app-analytics-section>
    }
  `,
})
export class BusinessOverviewComponent extends BusinessDashboard<BusinessOverview> {
  constructor() {
    super();
    this.watchFilters();
  }

  protected fetch(filters: BusinessFilters): Observable<BusinessOverview> {
    return this.api.businessOverview(filters);
  }

  readonly activitySeries = computed<LineSeries[]>(() => [
    {
      key: 'active',
      label: 'Active customers',
      colour: 'var(--brand)',
      points: (this.data()?.activity ?? []).map((point) => ({
        label: this.dayLabel(point.day),
        value: point.value,
      })),
    },
  ]);
}
