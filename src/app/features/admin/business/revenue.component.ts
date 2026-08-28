import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { Observable } from 'rxjs';

import { BusinessFilters, BusinessRevenue } from '../../../core/models';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
  KpiCardComponent,
} from '../../../shared/analytics-ui.components';
import { ErrorStateComponent } from '../../../shared/state.components';
import { BusinessDashboard } from './business-dashboard.base';
import { BusinessFilterBarComponent } from './business-filter-bar.component';

/** §22-§27 — MRR and its movement, both churn rates, ARPM, recognised revenue. */
@Component({
  selector: 'app-business-revenue',
  standalone: true,
  imports: [
    CommonModule,
    BusinessFilterBarComponent,
    AnalyticsEmptyComponent,
    AnalyticsSectionComponent,
    AnalyticsSkeletonComponent,
    KpiCardComponent,
    ErrorStateComponent,
  ],
  template: `
    <app-business-filter-bar [showCity]="true" [showPlan]="true" [showChannel]="true" />

    @if (loading()) {
      <app-analytics-skeleton [count]="5" />
    } @else if (failure(); as problem) {
      <app-error-state
        [offline]="problem.offline"
        [message]="problem.message"
        [reference]="problem.requestId"
        (retry)="load()"
      />
    } @else if (data(); as revenue) {
      <div class="grid grid-stats stagger mb-2">
        @for (kpi of revenue.kpis; track kpi.key) {
          <app-kpi-card [kpi]="kpi" />
        }
      </div>

      <div class="split mb-2">
        <!-- §23: the bridge from last period's MRR to this one. -->
        <app-analytics-section
          heading="MRR movement"
          [subtitle]="rupees(revenue.mrr.previous) + ' → ' + rupees(revenue.mrr.current)"
        >
          <ul class="bridge">
            @for (row of bridgeRows(); track row.key) {
              <li [class]="row.tone">
                <span class="label">{{ row.label }}</span>
                <span class="amount">{{ signedRupees(row.value) }}</span>
              </li>
            }
            <li class="net">
              <span class="label">Net growth</span>
              <span class="amount">{{ signedRupees(revenue.mrr.net) }}</span>
            </li>
          </ul>

          @if (revenue.mrr.atRisk > 0) {
            <p class="small warn mt-1">
              {{ rupees(revenue.mrr.atRisk) }} of current MRR is on past-due subscriptions.
              It is counted while those merchants keep their features, and will churn if
              collection fails.
            </p>
          }
        </app-analytics-section>

        <!-- §24, §25: two different losses, deliberately not merged. -->
        <app-analytics-section
          heading="Churn"
          subtitle="Merchants lost, and revenue lost — measured separately"
        >
          <div class="table-wrap">
            <table>
              <tbody>
                <tr>
                  <th scope="row">Merchant churn</th>
                  <td>
                    <strong>{{ percent(revenue.churn.merchantChurnRate) }}</strong>
                    <span class="small subtle">
                      {{ count(revenue.churn.churnedMerchants) }} of
                      {{ count(revenue.churn.startingPayingMerchants) }} at period start
                    </span>
                  </td>
                </tr>
                <tr>
                  <th scope="row">MRR churn</th>
                  <td>
                    <strong>{{ percent(revenue.churn.mrrChurnRate) }}</strong>
                    <span class="small subtle">
                      {{ rupees(revenue.churn.churnedMrr) }} of
                      {{ rupees(revenue.churn.startingMrr) }}
                    </span>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Paying merchants now</th>
                  <td>{{ count(revenue.churn.endingPayingMerchants) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="small subtle mt-1">
            Merchant churn counts heads; MRR churn counts money, and includes downgrades that
            stayed paid. One Premium cancellation and ten Free trial lapses are very different
            events.
          </p>
        </app-analytics-section>
      </div>

      <!-- §26: both bases, each labelled. The document is explicit that these
           must never be presented as one number. -->
      <app-analytics-section
        heading="Average revenue per merchant"
        subtitle="Two bases — read the label, not just the figure"
      >
        <div class="grid grid-stats">
          @for (basis of revenue.arpm; track basis.key) {
            <div class="stat card">
              <span class="stat-label">{{ basis.label }}</span>
              <span class="stat-value">{{ rupees(basis.value) }}</span>
              <span class="small subtle">
                {{ basis.hint }} ({{ count(basis.denominator) }} merchants)
              </span>
            </div>
          }
        </div>
      </app-analytics-section>

      <!-- §27 -->
      <app-analytics-section
        heading="Recognised revenue"
        [subtitle]="'Collected in this period · ' + rupees(revenue.breakdown.total)"
        [hint]="revenue.breakdown.note"
      >
        @if (revenue.breakdown.lines.length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col" class="right">Payments</th>
                  <th scope="col" class="right">Gross</th>
                  <th scope="col" class="right">Refunded</th>
                  <th scope="col" class="right">Net</th>
                </tr>
              </thead>
              <tbody>
                @for (line of revenue.breakdown.lines; track line.plan) {
                  <tr>
                    <th scope="row">{{ line.label }}</th>
                    <td class="right">{{ count(line.payments) }}</td>
                    <td class="right">{{ rupees(line.gross) }}</td>
                    <td class="right">{{ rupees(line.refunded) }}</td>
                    <td class="right">
                      <strong>{{ rupees(line.net) }}</strong>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-analytics-empty
            title="No payments captured in this period."
            message="Only captured payments count as recognised revenue."
          />
        }

        @if (revenue.breakdown.failedPayments > 0) {
          <p class="small warn mt-1">
            {{ count(revenue.breakdown.failedPayments) }} payments failed
            ({{ rupees(revenue.breakdown.failedAmount) }} attempted). Not revenue — shown so a
            collection problem is visible next to the money that did arrive.
          </p>
        }

        <p class="small subtle mt-1">{{ revenue.breakdown.note }}</p>
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

      .bridge {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .bridge li {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.4rem 0;
        border-bottom: 1px solid var(--border);
      }

      .bridge li.net {
        border-bottom: none;
        border-top: 2px solid var(--border);
        font-weight: 700;
        margin-top: 0.2rem;
      }

      .amount {
        font-variant-numeric: tabular-nums;
        font-weight: 650;
      }

      .bridge li.gain .amount {
        color: var(--success);
      }

      .bridge li.loss .amount {
        color: var(--danger);
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

      tbody td .small {
        display: block;
        font-weight: 400;
      }

      .stat {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
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
export class BusinessRevenueComponent extends BusinessDashboard<BusinessRevenue> {
  constructor() {
    super();
    this.watchFilters();
  }

  protected fetch(filters: BusinessFilters): Observable<BusinessRevenue> {
    return this.api.businessRevenue(filters);
  }

  /** §23's rows. Losses are negated so the column reads as a running total. */
  readonly bridgeRows = computed(() => {
    const mrr = this.data()?.mrr;
    if (!mrr) return [];
    return [
      { key: 'new', label: 'New MRR', value: mrr.new, tone: 'gain' },
      { key: 'expansion', label: 'Expansion', value: mrr.expansion, tone: 'gain' },
      { key: 'reactivation', label: 'Reactivation', value: mrr.reactivation, tone: 'gain' },
      { key: 'contraction', label: 'Contraction', value: -mrr.contraction, tone: 'loss' },
      { key: 'churned', label: 'Churn', value: -mrr.churned, tone: 'loss' },
    ];
  });
}
