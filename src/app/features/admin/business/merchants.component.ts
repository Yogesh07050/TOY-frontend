import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { Observable } from 'rxjs';

import { BusinessFilters, MerchantMetrics } from '../../../core/models';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
  KpiCardComponent,
  ShareBarsComponent,
} from '../../../shared/analytics-ui.components';
import { ErrorStateComponent } from '../../../shared/state.components';
import { BusinessDashboard } from './business-dashboard.base';
import { BusinessFilterBarComponent } from './business-filter-bar.component';

/** §11-§15 and §29 — active merchants, what each gets, and how evenly. */
@Component({
  selector: 'app-business-merchants',
  standalone: true,
  imports: [
    CommonModule,
    BusinessFilterBarComponent,
    AnalyticsEmptyComponent,
    AnalyticsSectionComponent,
    AnalyticsSkeletonComponent,
    KpiCardComponent,
    ShareBarsComponent,
    ErrorStateComponent,
  ],
  template: `
    <app-business-filter-bar
      [showCity]="true"
      [showCategory]="true"
      [showPlan]="true"
      [showListingType]="true"
      [showChannel]="true"
    />

    @if (loading()) {
      <app-analytics-skeleton [count]="5" />
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

      <div class="split mb-2">
        <app-analytics-section
          heading="Per active merchant"
          subtitle="What the platform delivered to the average shop"
        >
          <div class="table-wrap">
            <table>
              <tbody>
                <tr>
                  <th scope="row">Active offers</th>
                  <td>{{ decimal(metrics.perShop.offers) }}</td>
                </tr>
                <!-- §12: the median sits next to the mean because a handful of
                     high-volume merchants otherwise make the average describe
                     nobody. -->
                <tr>
                  <th scope="row">Median offers / shop</th>
                  <td>{{ decimal(metrics.perShop.medianOffers) }}</td>
                </tr>
                <tr>
                  <th scope="row">Busiest shop</th>
                  <td>{{ count(metrics.perShop.maxOffers) }} offers</td>
                </tr>
                <tr>
                  <th scope="row">Offer views / shop</th>
                  <td>{{ decimal(metrics.perShop.views) }}</td>
                </tr>
                <tr>
                  <th scope="row">Claims / shop</th>
                  <td>{{ decimal(metrics.perShop.claims) }}</td>
                </tr>
                <tr>
                  <th scope="row">Redemptions / shop</th>
                  <td>{{ decimal(metrics.perShop.redemptions) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </app-analytics-section>

        <app-analytics-section
          heading="What made them active"
          [subtitle]="metrics.definitions.note"
          hint="A merchant counted once, even if they did several of these. The bars overlap."
        >
          @if (activityRows().length) {
            <app-share-bars [rows]="activityRows()" suffix="" />
          } @else {
            <app-analytics-empty
              title="No merchant activity in this period."
              message="Publishing, edits, claims and redemptions all count."
            />
          }
        </app-analytics-section>
      </div>

      <!-- §29 -->
      <app-analytics-section
        heading="Merchant performance distribution"
        [subtitle]="
          'Share of all offer views across ' + count(metrics.distribution.merchants) + ' merchants'
        "
        hint="A high top-10% share is concentration risk: the marketplace depends on a few shops."
      >
        @if (metrics.distribution.bands.length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Band</th>
                  <th scope="col" class="right">Merchants</th>
                  <th scope="col" class="right">Views</th>
                  <th scope="col" class="right">Share</th>
                </tr>
              </thead>
              <tbody>
                @for (band of metrics.distribution.bands; track band.key) {
                  <tr>
                    <th scope="row">{{ band.label }}</th>
                    <td class="right">{{ count(band.merchants) }}</td>
                    <td class="right">{{ count(band.views) }}</td>
                    <td class="right">
                      <strong>{{ percent(band.share) }}</strong>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-analytics-empty
            title="No offer views in this period."
            message="Concentration can only be measured once there is traffic to divide up."
          />
        }
      </app-analytics-section>
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

      @media (max-width: 980px) {
        .split {
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

      td,
      .right {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }

      thead th {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
    `,
  ],
})
export class BusinessMerchantsComponent extends BusinessDashboard<MerchantMetrics> {
  constructor() {
    super();
    this.watchFilters();
  }

  protected fetch(filters: BusinessFilters): Observable<MerchantMetrics> {
    return this.api.businessMerchants(filters);
  }

  readonly activityRows = computed(() =>
    (this.data()?.activityBreakdown ?? [])
      .filter((row) => row.merchants > 0)
      .map((row) => ({ label: row.label, value: row.merchants })),
  );
}
