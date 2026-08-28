import { CommonModule } from '@angular/common';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { ApiService } from '../../../core/api.service';
import { CategoryRow, CityRow } from '../../../core/models';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
} from '../../../shared/analytics-ui.components';
import { ErrorStateComponent } from '../../../shared/state.components';
import { BusinessDashboard } from './business-dashboard.base';
import { BusinessFilterBarComponent } from './business-filter-bar.component';

interface Segments {
  cities: CityRow[];
  categories: CategoryRow[];
}

/**
 * §30 and §31 — the same metrics sliced by city and by category.
 *
 * One page rather than two because they are read together: "which cities are
 * working" and "which categories are working" is one question about where the
 * marketplace has traction, and flipping between tabs to compare them is the
 * main way that question goes unanswered.
 */
@Component({
  selector: 'app-business-segments',
  standalone: true,
  imports: [
    CommonModule,
    BusinessFilterBarComponent,
    AnalyticsEmptyComponent,
    AnalyticsSectionComponent,
    AnalyticsSkeletonComponent,
    ErrorStateComponent,
  ],
  template: `
    <app-business-filter-bar [showCity]="false" [showCategory]="false" [showPlan]="true" />

    @if (loading()) {
      <app-analytics-skeleton [count]="0" [chartHeight]="300" />
    } @else if (failure(); as problem) {
      <app-error-state
        [offline]="problem.offline"
        [message]="problem.message"
        [reference]="problem.requestId"
        (retry)="load()"
      />
    } @else if (data(); as segments) {
      <!-- §30 -->
      <app-analytics-section
        heading="Cities"
        subtitle="Merchants attributed to the city of their primary branch"
        hint="A chain with branches in several cities is counted once, in its primary city, so these rows sum to the platform total."
      >
        @if (segments.cities.length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">City</th>
                  <th scope="col" class="right">Customers</th>
                  <th scope="col" class="right">Merchants</th>
                  <th scope="col" class="right">Active</th>
                  <th scope="col" class="right">Offers</th>
                  <th scope="col" class="right">Views</th>
                  <th scope="col" class="right">Claims</th>
                  <th scope="col" class="right">Redemptions</th>
                  <th scope="col" class="right">Rate</th>
                  <th scope="col" class="right">MRR</th>
                </tr>
              </thead>
              <tbody>
                @for (row of segments.cities; track row.city) {
                  <tr>
                    <th scope="row">{{ row.city }}</th>
                    <td class="right">{{ count(row.customers) }}</td>
                    <td class="right">{{ count(row.merchants) }}</td>
                    <td class="right">{{ count(row.activeMerchants) }}</td>
                    <td class="right">{{ count(row.offers) }}</td>
                    <td class="right">{{ count(row.views) }}</td>
                    <td class="right">{{ count(row.claims) }}</td>
                    <td class="right">{{ count(row.redemptions) }}</td>
                    <td class="right">{{ percent(row.redemptionRate) }}</td>
                    <td class="right">{{ rupees(row.mrr) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="small subtle mt-1">
            Customers are attributed by the shop they engaged with, so someone active in two
            cities appears in both — the customer column does not sum to platform MAU.
          </p>
        } @else {
          <app-analytics-empty
            title="No city data yet."
            message="Cities appear once merchants have branches with an address."
          />
        }
      </app-analytics-section>

      <!-- §31 -->
      <app-analytics-section
        heading="Categories"
        subtitle="Taken from the listings rather than the shop"
        hint="A merchant selling across several categories contributes to each, so these rows are not expected to sum."
      >
        @if (segments.categories.length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col" class="right">Merchants</th>
                  <th scope="col" class="right">Offers</th>
                  <th scope="col" class="right">Views</th>
                  <th scope="col" class="right">Claims</th>
                  <th scope="col" class="right">Redemptions</th>
                  <th scope="col" class="right">Redemption rate</th>
                </tr>
              </thead>
              <tbody>
                @for (row of segments.categories; track row.category) {
                  <tr>
                    <th scope="row">{{ row.category }}</th>
                    <td class="right">{{ count(row.merchants) }}</td>
                    <td class="right">{{ count(row.offers) }}</td>
                    <td class="right">{{ count(row.views) }}</td>
                    <td class="right">{{ count(row.claims) }}</td>
                    <td class="right">{{ count(row.redemptions) }}</td>
                    <td class="right">
                      <strong>{{ percent(row.redemptionRate) }}</strong>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-analytics-empty
            title="No category data yet."
            message="Categories appear once merchants file their listings under one."
          />
        }
      </app-analytics-section>
    }
  `,
  styles: [
    `
      table {
        width: 100%;
      }

      th {
        text-align: left;
      }

      thead th {
        font-size: 0.74rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: var(--text-muted);
        white-space: nowrap;
      }

      .right {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class BusinessSegmentsComponent extends BusinessDashboard<Segments> {
  private readonly segmentApi = inject(ApiService);
  private readonly ownDestroyRef = inject(DestroyRef);

  readonly cities = signal<CityRow[]>([]);

  constructor() {
    super();
    // Two endpoints for one screen, so this page overrides `load` rather than
    // using the base class's single-request path.
    effect(() => {
      this.filters.signature();
      this.load();
    });
  }

  /**
   * `fetch` is unused here - both tables are loaded together in `load`. The
   * base class requires the member, so it returns the pair rather than being
   * left to throw.
   */
  protected fetch() {
    return forkJoin({
      cities: this.segmentApi.businessCities(this.filters.query()),
      categories: this.segmentApi.businessCategories(this.filters.query()),
    });
  }

  override load(): void {
    this.loading.set(true);
    this.failure.set(null);

    this.fetch()
      .pipe(takeUntilDestroyed(this.ownDestroyRef))
      .subscribe({
        next: (result) => {
          this.data.set(result);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const body = error.error?.error;
          this.failure.set({
            offline: error.status === 0,
            message:
              error.status === 0
                ? 'You’re offline. Some features may not be available right now.'
                : (body?.message ?? 'We couldn’t load this report. Please try again.'),
            requestId: body?.requestId ?? null,
          });
          this.loading.set(false);
        },
      });
  }
}
