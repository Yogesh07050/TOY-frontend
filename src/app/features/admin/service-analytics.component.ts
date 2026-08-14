import { CommonModule } from '@angular/common';
import { Component, DestroyRef, WritableSignal, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import {
  Service,
  ServiceAnalyticsOverview,
  ServiceBranchRow,
  ServiceCategoryInsightRow,
  ServiceComparisonRow,
  ServiceCustomerInsights,
  ServiceFunnelStage,
  ServiceLocationRow,
  ServiceOfferPerformanceSplit,
  ServicePerformance,
  UpgradeRequirement,
} from '../../core/models';
import { AnalyticsFilterBarComponent } from './analytics/analytics-filter-bar.component';
import { AnalyticsFiltersService } from './analytics/analytics-filters.service';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
  BarChartComponent,
  KpiCardComponent,
  ShareBarsComponent,
  UpgradePromptComponent,
} from '../../shared/analytics-ui.components';

interface Section<T> {
  data: WritableSignal<T | null>;
  loading: WritableSignal<boolean>;
  upgrade: WritableSignal<UpgradeRequirement | null>;
  failed: WritableSignal<string | null>;
}

function createSection<T>(): Section<T> {
  return { data: signal<T | null>(null), loading: signal(true), upgrade: signal<UpgradeRequirement | null>(null), failed: signal<string | null>(null) };
}

/**
 * Consolidated Service Analytics page (V4 §20-§22): basic overview + every
 * premium section on one page, each independently gated by an upgrade prompt.
 * Does not extend `PremiumDashboard<T>` - that base class gates one page
 * behind one upgrade signal, but this page needs several independent ones.
 */
@Component({
  selector: 'app-service-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AnalyticsFilterBarComponent,
    AnalyticsSectionComponent,
    AnalyticsSkeletonComponent,
    AnalyticsEmptyComponent,
    KpiCardComponent,
    BarChartComponent,
    ShareBarsComponent,
    UpgradePromptComponent,
  ],
  templateUrl: './service-analytics.component.html',
  styles: [
    `
      .performers {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 0.75rem;
      }

      .performer {
        padding: 0.75rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
      }

      .performer .label {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
        font-weight: 700;
        display: block;
        margin-bottom: 0.2rem;
      }

      .customer-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 0.75rem;
      }

      .comparison-picker {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        margin-bottom: 0.75rem;
      }
    `,
  ],
})
export class ServiceAnalyticsComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly filters = inject(AnalyticsFiltersService);
  private readonly destroyRef = inject(DestroyRef);

  readonly overview = createSection<ServiceAnalyticsOverview>();
  readonly performance = createSection<ServicePerformance>();
  readonly funnel = createSection<ServiceFunnelStage[]>();
  readonly offerSplit = createSection<ServiceOfferPerformanceSplit>();
  readonly branches = createSection<ServiceBranchRow[]>();
  readonly locations = createSection<ServiceLocationRow[]>();
  readonly customers = createSection<ServiceCustomerInsights>();
  readonly categoryInsights = createSection<ServiceCategoryInsightRow[]>();
  readonly comparison = createSection<ServiceComparisonRow[]>();

  readonly comparableServices = signal<Service[]>([]);
  readonly selectedServiceIds = signal<number[]>([]);

  constructor() {
    effect(() => {
      this.filters.signature();
      this.loadAll();
    });

    this.api.listServices({ manage: true, status: 'all', limit: 50 }).subscribe({
      next: (page) => this.comparableServices.set(page.items),
      error: () => this.comparableServices.set([]),
    });
  }

  private runSection<T>(section: Section<T>, source: Observable<T>): void {
    section.loading.set(true);
    section.failed.set(null);

    source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        section.data.set(data);
        section.upgrade.set(null);
        section.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const body = error.error?.error;
        if (body?.code === 'PLAN_UPGRADE_REQUIRED') {
          section.upgrade.set(body.details as UpgradeRequirement);
          section.data.set(null);
        } else {
          section.failed.set(body?.message ?? 'That report could not be loaded.');
        }
        section.loading.set(false);
      },
    });
  }

  private loadAll(): void {
    const query = this.filters.query();
    this.runSection(this.overview, this.api.serviceAnalyticsOverview(query));
    this.runSection(this.performance, this.api.serviceAnalyticsPerformance(query));
    this.runSection(this.funnel, this.api.serviceAnalyticsFunnel(query));
    this.runSection(this.offerSplit, this.api.serviceAnalyticsOfferPerformance(query));
    this.runSection(this.branches, this.api.serviceAnalyticsBranches(query));
    this.runSection(this.locations, this.api.serviceAnalyticsLocations(query));
    this.runSection(this.customers, this.api.serviceAnalyticsCustomers(query));
    this.runSection(this.categoryInsights, this.api.serviceAnalyticsCategoryInsights(query));
  }

  toggleComparisonService(id: number): void {
    this.selectedServiceIds.update((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }

  runComparison(): void {
    if (!this.selectedServiceIds().length) return;
    this.runSection(this.comparison, this.api.serviceAnalyticsComparison(this.filters.query(), this.selectedServiceIds()));
  }

  funnelPoints(stages: ServiceFunnelStage[]) {
    return stages.map((stage) => ({ label: stage.label, value: stage.value }));
  }

  locationRows(rows: ServiceLocationRow[]) {
    return rows.slice(0, 10).map((row) => ({ label: row.city, value: row.views }));
  }

  count(value: number | null | undefined): string {
    return (value ?? 0).toLocaleString('en-IN');
  }

  percent(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : `${value}%`;
  }
}
