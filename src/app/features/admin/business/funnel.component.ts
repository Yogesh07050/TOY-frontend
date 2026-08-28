import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { Observable } from 'rxjs';

import { BusinessFilters, BusinessFunnel } from '../../../core/models';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
} from '../../../shared/analytics-ui.components';
import { ErrorStateComponent } from '../../../shared/state.components';
import { BusinessDashboard } from './business-dashboard.base';
import { BusinessFilterBarComponent } from './business-filter-bar.component';

/**
 * §28 — active users → views → saves → claims → redemptions.
 *
 * Drawn as proportional bars rather than a tapering funnel shape: the drop from
 * active users to redemptions is two orders of magnitude, and a literal funnel
 * would render the last stage as an invisible sliver. Each bar is measured
 * against the first stage, and each row also states its conversion from the
 * stage directly above it, which is the number worth acting on.
 */
@Component({
  selector: 'app-business-funnel',
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
    <app-business-filter-bar [showCity]="true" [showCategory]="true" />

    @if (loading()) {
      <app-analytics-skeleton [count]="0" [chartHeight]="320" />
    } @else if (failure(); as problem) {
      <app-error-state
        [offline]="problem.offline"
        [message]="problem.message"
        [reference]="problem.requestId"
        (retry)="load()"
      />
    } @else if (data(); as funnel) {
      <app-analytics-section
        heading="Customer → merchant funnel"
        [subtitle]="
          percent(funnel.overallConversion) + ' of active customers reached a merchant counter'
        "
      >
        @if (hasData()) {
          <ol class="funnel">
            @for (stage of funnel.stages; track stage.key) {
              <li>
                <div class="head">
                  <span class="label">{{ stage.label }}</span>
                  <span class="value">{{ count(stage.value) }}</span>
                </div>
                <div class="track">
                  <div class="fill" [style.width.%]="widthOf(stage.value)"></div>
                </div>
                @if (stage.conversionFromPrevious !== null) {
                  <span class="small subtle step">
                    {{ percent(stage.conversionFromPrevious) }} of the step above
                  </span>
                }
              </li>
            }
          </ol>
        } @else {
          <app-analytics-empty
            title="Not enough activity to draw a funnel."
            message="The funnel needs customers, views and claims in the same period."
          />
        }
      </app-analytics-section>

      <div class="grid grid-stats mt-2">
        <div class="stat card">
          <span class="stat-label">Coupon redemption rate</span>
          <span class="stat-value">{{ percent(funnel.redemptionRate) }}</span>
          <span class="small subtle">
            {{ count(funnel.eligibleClaims) }} eligible claims
          </span>
        </div>
        <div class="stat card">
          <span class="stat-label">Claims still pending</span>
          <span class="stat-value">{{ count(funnel.pendingClaims) }}</span>
          <span class="small subtle">Inside their validity window</span>
        </div>
      </div>

      <p class="small subtle mt-2">{{ funnel.definitions.claimEligibility }}</p>
    }
  `,
  styles: [
    `
      .funnel {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }

      .head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 1rem;
      }

      .label {
        font-weight: 600;
      }

      .value {
        font-variant-numeric: tabular-nums;
        font-weight: 700;
      }

      .track {
        height: 12px;
        border-radius: 999px;
        background: var(--surface-alt);
        overflow: hidden;
        margin-top: 0.25rem;
      }

      .fill {
        height: 100%;
        border-radius: 999px;
        background: var(--gradient-brand, var(--brand));
        /* A stage with a real but tiny count must still be visible, otherwise
           "12 redemptions" and "0 redemptions" look identical. */
        min-width: 2px;
        transition: width var(--normal) var(--ease-out);
      }

      .step {
        display: block;
        margin-top: 0.2rem;
      }

      .stat {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        padding: 0.95rem 1rem;
      }

      .stat-value {
        font-size: 1.5rem;
        font-weight: 750;
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class BusinessFunnelComponent extends BusinessDashboard<BusinessFunnel> {
  constructor() {
    super();
    this.watchFilters();
  }

  protected fetch(filters: BusinessFilters): Observable<BusinessFunnel> {
    return this.api.businessFunnel(filters);
  }

  readonly hasData = computed(() => (this.data()?.stages ?? []).some((stage) => stage.value > 0));

  private readonly top = computed(() => Math.max(1, ...(this.data()?.stages ?? []).map((s) => s.value)));

  widthOf(value: number): number {
    return (value / this.top()) * 100;
  }
}
