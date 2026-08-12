import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { Observable } from 'rxjs';

import { AnalyticsFilters, FeatureName, LocationInsights } from '../../../core/models';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
  ShareBarsComponent,
  UpgradePromptComponent,
} from '../../../shared/analytics-ui.components';
import { AnalyticsFilterBarComponent } from './analytics-filter-bar.component';
import { PremiumDashboard } from './premium-dashboard.base';

/**
 * §11 — where the customers engaging with these offers are.
 *
 * The "heatmap" is a density grid rather than a map tile layer: coordinates are
 * rounded server-side to roughly one-kilometre cells so nothing here can be
 * traced back to an individual customer (§13), and it needs no mapping
 * dependency or third-party tile request to render.
 */
@Component({
  selector: 'app-location-insights',
  standalone: true,
  imports: [
    CommonModule,
    AnalyticsFilterBarComponent,
    AnalyticsEmptyComponent,
    AnalyticsSectionComponent,
    AnalyticsSkeletonComponent,
    ShareBarsComponent,
    UpgradePromptComponent,
  ],
  template: `
    <app-analytics-filter-bar [showBranch]="true" [showLocation]="true" />

    @if (upgrade()) {
      <app-upgrade-prompt [feature]="feature" heading="Advanced location intelligence" />
    } @else if (loading()) {
      <app-analytics-skeleton [count]="3" [chartHeight]="300" />
    } @else if (failed()) {
      <div class="card"><div class="card-body">{{ failed() }}</div></div>
    } @else if (data(); as insights) {
      @if (insights.highlights.mostActive || insights.highlights.highestConverting) {
        <div class="grid grid-stats mb-2">
          @if (insights.highlights.mostActive; as top) {
            <div class="stat card">
              <span class="stat-label">Most active area</span>
              <span class="stat-value">{{ top.city }}</span>
              <span class="small subtle">{{ count(top.views) }} views</span>
            </div>
          }
          @if (insights.highlights.highestConverting; as best) {
            <div class="stat card">
              <span class="stat-label">Highest converting</span>
              <span class="stat-value">{{ best.city }}</span>
              <span class="small subtle">{{ percent(best.conversion) }} view to claim</span>
            </div>
          }
        </div>
      }

      <div class="split">
        <app-analytics-section
          heading="Activity by location"
          subtitle="Views, claims and redemptions by the area the customer engaged from"
          hint="Location comes from the customer's shared position where available, and falls back to the branch they viewed the offer at."
        >
          @if (!insights.locations.length) {
            <app-analytics-empty
              icon="📍"
              title="No location data yet."
              message="Location appears once customers browse your offers with a location set."
            />
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Location</th>
                    <th class="num">Views</th>
                    <th class="num">Claims</th>
                    <th class="num">Redemptions</th>
                    <th class="num">Customers</th>
                    <th class="num">Conversion</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of insights.locations; track row.city) {
                    <tr>
                      <td>{{ row.city }}</td>
                      <td class="num">{{ count(row.views) }}</td>
                      <td class="num">{{ count(row.claims) }}</td>
                      <td class="num">{{ count(row.redemptions) }}</td>
                      <td class="num">{{ count(row.customers) }}</td>
                      <td class="num">{{ percent(row.conversion) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </app-analytics-section>

        <div class="side">
          <app-analytics-section
            heading="Customer density"
            subtitle="Share of views by area"
          >
            @if (!densityRows().length) {
              <app-analytics-empty icon="🗺️" title="No density data yet." message="" />
            } @else {
              <app-share-bars [rows]="densityRows()" suffix="" />
            }
          </app-analytics-section>

          <app-analytics-section
            heading="Radius analysis"
            subtitle="How far your customers are from the selected point"
            hint="Only events where the customer shared a position can be placed on a radius, so this covers a subset of total views."
          >
            @if (!insights.radius?.length) {
              <app-analytics-empty
                icon="🎯"
                title="No positioned events yet."
                message="Radius bands appear once customers browse with location sharing enabled."
              />
            } @else {
              <ul class="radius">
                @for (band of insights.radius; track band.withinKm) {
                  <li>
                    <span>Within {{ band.withinKm }} km</span>
                    <span class="strong">{{ count(band.views) }} views</span>
                    <span class="small subtle">{{ count(band.customers) }} customers</span>
                  </li>
                }
              </ul>
            }
          </app-analytics-section>

          <app-analytics-section heading="Your branches" [subtitle]="branchSubtitle()">
            <ul class="branches">
              @for (branch of insights.branches; track branch.id) {
                <li>
                  <span class="truncate">{{ branch.branchName }}</span>
                  <span class="small subtle">{{ branch.city ?? 'Location not set' }}</span>
                </li>
              }
            </ul>
          </app-analytics-section>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .split {
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
        gap: 1rem;
        align-items: start;
      }

      .side {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .num {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }

      .radius,
      .branches {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
      }

      .radius li,
      .branches li {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.6rem;
        padding: 0.45rem 0;
        border-bottom: 1px solid var(--border);
      }

      .radius li:last-child,
      .branches li:last-child {
        border-bottom: none;
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
        font-size: 1.3rem;
        font-weight: 750;
      }

      @media (max-width: 980px) {
        .split {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
  ],
})
export class LocationInsightsComponent extends PremiumDashboard<LocationInsights> {
  protected readonly feature: FeatureName = 'LOCATION_ANALYTICS_ADVANCED';

  constructor() {
    super();
    this.watchFilters();
  }

  protected fetch(filters: AnalyticsFilters): Observable<LocationInsights> {
    return this.api.premiumLocations(filters);
  }

  readonly densityRows = computed(() =>
    (this.data()?.locations ?? []).slice(0, 8).map((row) => ({
      label: row.city,
      value: row.views,
    })),
  );

  readonly branchSubtitle = computed(() => {
    const count = this.data()?.branches.length ?? 0;
    return `${count} active ${count === 1 ? 'branch' : 'branches'}`;
  });
}
