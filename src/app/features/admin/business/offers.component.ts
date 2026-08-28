import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { BusinessFilters, BusinessOfferRow } from '../../../core/models';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
} from '../../../shared/analytics-ui.components';
import { ErrorStateComponent } from '../../../shared/state.components';
import { BusinessDashboard } from './business-dashboard.base';
import { BusinessFilterBarComponent } from './business-filter-bar.component';

type SortKey = 'views' | 'claims' | 'redemptions' | 'conversion';

/** §9 — the offers carrying the platform, across every merchant. */
@Component({
  selector: 'app-business-offers',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BusinessFilterBarComponent,
    AnalyticsEmptyComponent,
    AnalyticsSectionComponent,
    AnalyticsSkeletonComponent,
    ErrorStateComponent,
  ],
  template: `
    <app-business-filter-bar
      [showCity]="true"
      [showCategory]="true"
      [showPlan]="true"
      [showMerchant]="true"
    />

    @if (loading()) {
      <app-analytics-skeleton [count]="0" [chartHeight]="360" />
    } @else if (failure(); as problem) {
      <app-error-state
        [offline]="problem.offline"
        [message]="problem.message"
        [reference]="problem.requestId"
        (retry)="load()"
      />
    } @else {
      <app-analytics-section
        heading="Top offers"
        subtitle="Ranked across every merchant on the platform"
      >
        <div actions class="sorts">
          @for (option of sortOptions; track option.key) {
            <button
              type="button"
              class="chip"
              [class.active]="sort() === option.key"
              (click)="setSort(option.key)"
            >
              {{ option.label }}
            </button>
          }
        </div>

        @if (data()?.length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Offer</th>
                  <th scope="col">Merchant</th>
                  <th scope="col">Category</th>
                  <th scope="col" class="right">Views</th>
                  <th scope="col" class="right">Claims</th>
                  <th scope="col" class="right">Claim rate</th>
                  <th scope="col" class="right">Redemptions</th>
                  <th scope="col" class="right">Redemption rate</th>
                </tr>
              </thead>
              <tbody>
                @for (row of data() ?? []; track row.id) {
                  <tr>
                    <th scope="row">
                      <a [routerLink]="['/offers', row.id]" class="truncate">{{ row.title }}</a>
                      <span class="badge badge-muted">{{ row.status }}</span>
                    </th>
                    <td class="truncate">{{ row.shopName }}</td>
                    <td class="truncate">{{ row.category }}</td>
                    <td class="right">{{ count(row.views) }}</td>
                    <td class="right">{{ count(row.claims) }}</td>
                    <td class="right">{{ percent(row.claimRate) }}</td>
                    <td class="right">{{ count(row.redemptions) }}</td>
                    <td class="right">{{ percent(row.redemptionRate) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-analytics-empty
            title="No offers match these filters."
            message="Widen the date range or clear a filter to see more."
          />
        }
      </app-analytics-section>
    }
  `,
  styles: [
    `
      .sorts {
        display: flex;
        gap: 0.3rem;
        flex-wrap: wrap;
      }

      .chip {
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text-muted);
        border-radius: 999px;
        padding: 0.25rem 0.65rem;
        font-size: 0.78rem;
        font-weight: 600;
        cursor: pointer;
      }

      .chip.active {
        background: var(--brand);
        border-color: var(--brand);
        color: #fff;
      }

      table {
        width: 100%;
      }

      th {
        text-align: left;
      }

      thead th {
        font-size: 0.76rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: var(--text-muted);
      }

      tbody th {
        font-weight: 600;
        max-width: 22rem;
      }

      .right {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }

      .badge-muted {
        margin-left: 0.4rem;
        font-size: 0.68rem;
      }
    `,
  ],
})
export class BusinessOffersComponent extends BusinessDashboard<BusinessOfferRow[]> {
  readonly sort = signal<SortKey>('views');

  protected readonly sortOptions: { key: SortKey; label: string }[] = [
    { key: 'views', label: 'Most viewed' },
    { key: 'claims', label: 'Most claimed' },
    { key: 'redemptions', label: 'Most redeemed' },
    { key: 'conversion', label: 'Best conversion' },
  ];

  constructor() {
    super();
    this.watchFilters();
  }

  protected fetch(filters: BusinessFilters): Observable<BusinessOfferRow[]> {
    return this.api.businessOffers({ ...filters, sort: this.sort(), limit: 50 });
  }

  setSort(sort: SortKey): void {
    if (this.sort() === sort) return;
    this.sort.set(sort);
    // Sorting is not a shared filter, so the base class's effect does not see
    // it. Reloading here keeps the ordering server-side, which matters because
    // the list is capped at 50 - sorting the page client-side would reorder a
    // slice chosen by a different rule.
    this.load();
  }
}
