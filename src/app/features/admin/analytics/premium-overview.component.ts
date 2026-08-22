import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { Observable } from 'rxjs';

import { AnalyticsFilters, FeatureName, PremiumOverview } from '../../../core/models';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
  KpiCardComponent,
  LineChartComponent,
  LineSeries,
  UpgradePromptComponent,
} from '../../../shared/analytics-ui.components';
import { AnalyticsFilterBarComponent } from './analytics-filter-bar.component';
import { PremiumDashboard } from './premium-dashboard.base';
import { toIconName } from '../../../shared/icons';
import { IconComponent } from '../../../shared/icon.component';

/** §8 — Executive overview: "How is my business performing on the OffersOffer?" */
@Component({
  selector: 'app-premium-overview',
  standalone: true,
  imports: [
    CommonModule,
    AnalyticsFilterBarComponent,
    AnalyticsEmptyComponent,
    AnalyticsSectionComponent,
    AnalyticsSkeletonComponent,
    KpiCardComponent,
    LineChartComponent,
    UpgradePromptComponent,
    IconComponent,
  ],
  template: `
    <app-analytics-filter-bar [showBranch]="true" [showCategory]="true" />

    @if (upgrade()) {
      <app-upgrade-prompt [feature]="feature" heading="Advanced analytics" />
    } @else if (loading()) {
      <app-analytics-skeleton [count]="8" />
    } @else if (failed()) {
      <div class="card"><div class="card-body">{{ failed() }}</div></div>
    } @else if (data(); as overview) {
      @if (overview.alerts.length) {
        <div class="alerts mb-2">
          @for (alert of overview.alerts; track alert.key) {
            <div class="alert" [class]="alert.tone">
              <app-icon class="icon" [name]="toIcon(alert.icon)" [size]="17" />
              <span>{{ alert.message }}</span>
            </div>
          }
        </div>
      }

      <div class="grid grid-stats stagger mb-2">
        @for (kpi of overview.kpis; track kpi.key) {
          <app-kpi-card [kpi]="kpi" />
        }
      </div>

      <div class="chart-grid">
        <app-analytics-section
          heading="Engagement over time"
          [subtitle]="'Views, claims and redemptions across ' + overview.timeline.length + ' days'"
        >
          <app-line-chart [series]="engagementSeries()">
            <app-analytics-empty
              empty
              title="No engagement recorded yet."
              message="Views and claims will appear here once customers start interacting with your offers."
            />
          </app-line-chart>
        </app-analytics-section>

        <app-analytics-section
          heading="Customer growth"
          subtitle="New customers reaching your shop for the first time"
        >
          <app-line-chart [series]="growthSeries()">
            <app-analytics-empty
              empty
              title="No new customers yet."
              message="Publish and promote offers to start reaching new customers."
            />
          </app-line-chart>
        </app-analytics-section>
      </div>
    }
  `,
  styles: [
    `
      .alerts {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }

      .alert {
        display: flex;
        align-items: flex-start;
        gap: 0.55rem;
        padding: 0.6rem 0.85rem;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
        font-size: 0.88rem;
        background: var(--surface);
      }

      .alert .icon {
        flex: none;
      }

      /* Tone is carried by a left rail and the icon, not by a colour wash, so
         these stay legible in both themes. */
      .alert.warning {
        border-left: 3px solid var(--warning);
        background: var(--warning-bg);
      }
      .alert.success {
        border-left: 3px solid var(--success);
        background: var(--success-bg);
      }
      .alert.info {
        border-left: 3px solid var(--info);
        background: var(--info-bg);
      }

      .chart-grid {
        display: grid;
        grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
        gap: 1rem;
        align-items: start;
      }

      @media (max-width: 980px) {
        .chart-grid {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
  ],
})
export class PremiumOverviewComponent extends PremiumDashboard<PremiumOverview> {
  /** Analytics payloads carry their own glyph; map it into the icon set. */
  protected readonly toIcon = toIconName;

  protected readonly feature: FeatureName = 'ANALYTICS_ADVANCED';

  constructor() {
    super();
    this.watchFilters();
  }

  protected fetch(filters: AnalyticsFilters): Observable<PremiumOverview> {
    return this.api.premiumOverview(filters);
  }

  readonly engagementSeries = computed<LineSeries[]>(() => {
    const timeline = this.data()?.timeline ?? [];
    const points = (key: 'views' | 'claims' | 'redemptions') =>
      timeline.map((point) => ({ label: this.dayLabel(point.day), value: point[key] }));

    return [
      { key: 'views', label: 'Views', colour: 'var(--brand)', points: points('views') },
      { key: 'claims', label: 'Claims', colour: 'var(--accent)', points: points('claims') },
      { key: 'redemptions', label: 'Redemptions', colour: 'var(--success)', points: points('redemptions') },
    ];
  });

  readonly growthSeries = computed<LineSeries[]>(() => {
    const timeline = this.data()?.timeline ?? [];
    return [
      {
        key: 'newCustomers',
        label: 'New customers',
        colour: 'var(--info)',
        points: timeline.map((point) => ({
          label: this.dayLabel(point.day),
          value: point.newCustomers,
        })),
      },
    ];
  });
}
