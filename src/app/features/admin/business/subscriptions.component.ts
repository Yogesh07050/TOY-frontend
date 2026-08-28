import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import { BusinessFilters, BusinessSubscriptions } from '../../../core/models';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
} from '../../../shared/analytics-ui.components';
import { ErrorStateComponent } from '../../../shared/state.components';
import { BusinessDashboard } from './business-dashboard.base';
import { BusinessFilterBarComponent } from './business-filter-bar.component';

/** §18-§21 — where merchants sit on the plan ladder, and who is climbing it. */
@Component({
  selector: 'app-business-subscriptions',
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
    <app-business-filter-bar [showCity]="true" [showCategory]="true" [showChannel]="true" />

    @if (loading()) {
      <app-analytics-skeleton [count]="3" />
    } @else if (failure(); as problem) {
      <app-error-state
        [offline]="problem.offline"
        [message]="problem.message"
        [reference]="problem.requestId"
        (retry)="load()"
      />
    } @else if (data(); as subs) {
      <!-- §21 -->
      <app-analytics-section
        heading="Subscription distribution"
        [subtitle]="
          count(subs.payingMerchants) + ' paying of ' + count(subs.totalMerchants) + ' merchants'
        "
      >
        <ul class="plans">
          @for (plan of subs.distribution; track plan.plan) {
            <li>
              <div class="head">
                <span class="name">
                  <strong>{{ plan.name }}</strong>
                  @if (plan.price > 0) {
                    <span class="small subtle">₹{{ plan.price }}/mo</span>
                  }
                </span>
                <span class="value">
                  <strong>{{ percent(plan.share) }}</strong>
                  <span class="small subtle">({{ count(plan.merchants) }})</span>
                </span>
              </div>
              <div class="track">
                <div class="fill" [style.width.%]="plan.share ?? 0"></div>
              </div>
              @if (plan.atRiskMerchants > 0) {
                <span class="small warn">
                  {{ count(plan.atRiskMerchants) }} past due · {{ rupees(plan.atRiskMrr) }} at risk
                </span>
              }
            </li>
          }
        </ul>
      </app-analytics-section>

      <!-- §18, §19, §20 -->
      <app-analytics-section
        heading="Conversion funnel"
        subtitle="Free → Business → Premium during this period"
        [hint]="subs.funnel.definitions.eligibility"
      >
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Step</th>
                <th scope="col" class="right">Eligible</th>
                <th scope="col" class="right">Upgraded</th>
                <th scope="col" class="right">Conversion</th>
              </tr>
            </thead>
            <tbody>
              @for (step of subs.funnel.steps; track step.key) {
                <tr>
                  <th scope="row">{{ step.label }}</th>
                  <td class="right">{{ count(step.eligible) }}</td>
                  <td class="right">{{ count(step.converted) }}</td>
                  <td class="right">
                    <strong>{{ percent(step.rate) }}</strong>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (subs.funnel.directToPremium > 0) {
          <p class="small subtle mt-1">
            {{ count(subs.funnel.directToPremium) }} merchants went straight from Free to Premium.
            They are counted in the first step, since they converted out of Free.
          </p>
        }
      </app-analytics-section>

      <app-analytics-section heading="Plan changes" subtitle="Every movement recorded in the period">
        @if (subs.history.length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Action</th>
                  <th scope="col" class="right">Merchants</th>
                </tr>
              </thead>
              <tbody>
                @for (row of subs.history; track row.day + row.action) {
                  <tr>
                    <th scope="row">{{ dayLabel(row.day) }}</th>
                    <td class="action">{{ row.action }}</td>
                    <td class="right">{{ count(row.count) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-analytics-empty
            title="No plan changes in this period."
            message="Upgrades, downgrades and cancellations will be listed here."
          />
        }
      </app-analytics-section>
    }
  `,
  styles: [
    `
      .plans {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
      }

      .head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 1rem;
      }

      .name,
      .value {
        display: flex;
        align-items: baseline;
        gap: 0.4rem;
      }

      .track {
        height: 10px;
        border-radius: 999px;
        background: var(--surface-alt);
        overflow: hidden;
        margin-top: 0.25rem;
      }

      .fill {
        height: 100%;
        border-radius: 999px;
        background: var(--gradient-brand, var(--brand));
        transition: width var(--normal) var(--ease-out);
      }

      .warn {
        color: var(--warning);
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

      .right {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }

      .action {
        text-transform: capitalize;
      }
    `,
  ],
})
export class BusinessSubscriptionsComponent extends BusinessDashboard<BusinessSubscriptions> {
  constructor() {
    super();
    this.watchFilters();
  }

  protected fetch(filters: BusinessFilters): Observable<BusinessSubscriptions> {
    return this.api.businessSubscriptions(filters);
  }
}
