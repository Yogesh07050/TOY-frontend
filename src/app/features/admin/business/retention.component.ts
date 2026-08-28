import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { Observable } from 'rxjs';

import { BusinessFilters, MerchantRetention } from '../../../core/models';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
  SeriesPoint,
} from '../../../shared/analytics-ui.components';
import { ErrorStateComponent } from '../../../shared/state.components';
import { BusinessDashboard } from './business-dashboard.base';
import { BusinessFilterBarComponent } from './business-filter-bar.component';

/**
 * §16, §17 — merchant retention by signup cohort.
 *
 * The heat grid is the honest shape for this: a cohort that has not yet lived
 * long enough to answer an offset gets a blank cell, not a zero. Filling those
 * with zeros is the classic way to make a retention chart show a cliff that is
 * really just the calendar.
 */
@Component({
  selector: 'app-business-retention',
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
    <app-business-filter-bar
      [showCity]="true"
      [showCategory]="true"
      [showPlan]="true"
      [showChannel]="true"
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
    } @else if (data(); as retention) {
      <app-analytics-section
        heading="Merchant cohort retention"
        subtitle="Average across every cohort that has reached each point"
      >
        @if (curvePoints().length) {
          <ul class="curve">
            @for (point of retention.curve; track point.month) {
              <li>
                <span class="label small">{{ point.label }}</span>
                <span class="track">
                  <span class="fill" [style.width.%]="point.rate ?? 0"></span>
                </span>
                <span class="value small">
                  @if (point.rate === null) {
                    <span class="subtle">No cohort has reached this yet</span>
                  } @else {
                    {{ percent(point.rate) }}
                    <span class="subtle">· {{ point.cohorts }} cohorts</span>
                  }
                </span>
              </li>
            }
          </ul>
        } @else {
          <app-analytics-empty
            title="No cohorts to chart yet."
            message="Retention needs at least one signup cohort old enough to measure."
          />
        }
      </app-analytics-section>

      <app-analytics-section
        heading="By signup cohort"
        subtitle="Merchants who joined in each month, and how many stayed active"
        [hint]="retention.definitions.rule"
      >
        @if (retention.cohorts.length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Cohort</th>
                  <th scope="col" class="right">Merchants</th>
                  @for (offset of retention.definitions.offsets; track offset.key) {
                    <th scope="col" class="right">{{ offset.label }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (cohort of retention.cohorts; track cohort.cohort) {
                  <tr>
                    <th scope="row">{{ monthLabel(cohort.cohort) }}</th>
                    <td class="right">{{ count(cohort.merchants) }}</td>
                    @for (offset of cohort.offsets; track offset.key) {
                      <td class="right cell" [class.unreached]="!offset.reached">
                        @if (offset.reached) {
                          <span class="heat" [style.--heat]="heat(offset.rate)">
                            {{ percent(offset.rate) }}
                          </span>
                          <span class="small subtle">{{ count(offset.retained) }}</span>
                        } @else {
                          <span class="subtle" title="This cohort is not old enough yet">—</span>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-analytics-empty
            title="No merchant cohorts match these filters."
            message="Clear a filter, or widen the cohort window."
          />
        }
      </app-analytics-section>

      <p class="small subtle mt-2">{{ retention.definitions.rule }}</p>
    }
  `,
  styles: [
    `
      .curve {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .curve li {
        display: grid;
        grid-template-columns: 5.5rem minmax(0, 1fr) 14rem;
        align-items: center;
        gap: 0.6rem;
      }

      .track {
        height: 10px;
        border-radius: 999px;
        background: var(--surface-alt);
        overflow: hidden;
      }

      .fill {
        display: block;
        height: 100%;
        border-radius: 999px;
        background: var(--gradient-brand, var(--brand));
        transition: width var(--normal) var(--ease-out);
      }

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
      }

      .right {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }

      .cell {
        white-space: nowrap;
      }

      /* Intensity carries the rate, but the number is always printed as well,
         so the grid is readable without perceiving the shading at all. */
      .heat {
        display: inline-block;
        padding: 0.1rem 0.4rem;
        border-radius: var(--radius-sm);
        font-weight: 650;
        background: color-mix(in srgb, var(--brand) calc(var(--heat) * 1%), transparent);
      }

      .cell .small {
        margin-left: 0.35rem;
      }
    `,
  ],
})
export class BusinessRetentionComponent extends BusinessDashboard<MerchantRetention> {
  constructor() {
    super();
    this.watchFilters();
  }

  protected fetch(filters: BusinessFilters): Observable<MerchantRetention> {
    return this.api.businessRetention(filters);
  }

  readonly curvePoints = computed<SeriesPoint[]>(() =>
    (this.data()?.curve ?? [])
      .filter((point) => point.rate !== null)
      .map((point) => ({ label: point.label, value: point.rate ?? 0 })),
  );

  /** Shading intensity, floored so a low-but-real rate is still distinguishable. */
  heat(rate: number | null): number {
    if (rate === null) return 0;
    return Math.max(8, Math.min(100, rate));
  }
}
