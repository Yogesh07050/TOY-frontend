import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { Observable } from 'rxjs';

import { AnalyticsFilters, FeatureName, PremiumFunnel } from '../../../core/models';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
  UpgradePromptComponent,
} from '../../../shared/analytics-ui.components';
import { AnalyticsFilterBarComponent } from './analytics-filter-bar.component';
import { PremiumDashboard } from './premium-dashboard.base';

/**
 * §10 — the customer funnel, with the conversion between every stage and the
 * biggest drop-off called out.
 *
 * Each stage states what it converts *from*, because the funnel is not a
 * straight chain: claims convert from views, not from saves. A customer can
 * claim an offer they never saved, and pairing claims with saves would report
 * rates above 100% the moment claims outnumber them.
 */
@Component({
  selector: 'app-customer-funnel',
  standalone: true,
  imports: [
    CommonModule,
    AnalyticsFilterBarComponent,
    AnalyticsEmptyComponent,
    AnalyticsSectionComponent,
    AnalyticsSkeletonComponent,
    UpgradePromptComponent,
  ],
  template: `
    <app-analytics-filter-bar [showBranch]="true" [showCategory]="true" />

    @if (upgrade()) {
      <app-upgrade-prompt [feature]="feature" heading="Offer funnel" />
    } @else if (loading()) {
      <app-analytics-skeleton [count]="4" [chartHeight]="260" />
    } @else if (failed()) {
      <div class="card"><div class="card-body">{{ failed() }}</div></div>
    } @else if (data(); as funnel) {
      <app-analytics-section
        heading="Customer funnel"
        subtitle="Impressions → views → saves → claims → redemptions"
        hint="Each stage converts from the action that precedes it. Claims are measured against views because claiming an offer never required saving it first."
      >
        @if (!hasData()) {
          <app-analytics-empty
            title="Not enough data yet."
            message="Publish and promote more offers to unlock meaningful funnel insights."
          />
        } @else {
          <div class="funnel">
            @for (stage of funnel.stages; track stage.key) {
              <div class="funnel-row">
                <span class="funnel-label">{{ stage.label }}</span>
                <span class="funnel-track">
                  <span class="funnel-bar" [style.width.%]="widthFor(stage.shareOfTop)">
                    <span class="funnel-value">{{ count(stage.value) }}</span>
                  </span>
                </span>
                <span class="funnel-conv small">
                  @if (stage.conversion === null) {
                    <span class="subtle">—</span>
                  } @else {
                    {{ stage.conversion }}%
                  }
                </span>
              </div>
              @if (stage.from) {
                <p class="from small subtle">
                  {{ labelOf(stage.from) }} → {{ stage.label }}
                  @if (stage.dropOff) {
                    · {{ count(stage.dropOff) }} did not continue
                  }
                </p>
              }
            }
          </div>

          @if (funnel.biggestDropOff; as drop) {
            <p class="drop small">
              <strong>Largest drop-off:</strong> {{ drop.label }}, converting at
              {{ drop.conversion }}% of the stage before it.
            </p>
          }
        }
      </app-analytics-section>

      @if (hasData()) {
        <div class="grid grid-stats mt-2">
          <div class="stat card">
            <span class="stat-label">Impression → view</span>
            <span class="stat-value">{{ percent(funnel.rates.impressionToView) }}</span>
          </div>
          <div class="stat card">
            <span class="stat-label">View → save</span>
            <span class="stat-value">{{ percent(funnel.rates.viewToSave) }}</span>
          </div>
          <div class="stat card">
            <span class="stat-label">View → claim</span>
            <span class="stat-value">{{ percent(funnel.rates.viewToClaim) }}</span>
          </div>
          <div class="stat card">
            <span class="stat-label">Claim → redemption</span>
            <span class="stat-value">{{ percent(funnel.rates.claimToRedemption) }}</span>
          </div>
          <div class="stat card">
            <span class="stat-label">View → redemption</span>
            <span class="stat-value">{{ percent(funnel.rates.viewToRedemption) }}</span>
          </div>
        </div>
      }
    }
  `,
  styles: [
    `
      .funnel {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .funnel-row {
        display: grid;
        grid-template-columns: 7.5rem minmax(0, 1fr) 3.5rem;
        align-items: center;
        gap: 0.75rem;
      }

      .funnel-label {
        font-size: 0.86rem;
        font-weight: 620;
        color: var(--text-muted);
      }

      .funnel-track {
        background: var(--surface-alt);
        border-radius: 999px;
        height: 30px;
        overflow: hidden;
      }

      .funnel-bar {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        height: 100%;
        border-radius: 999px;
        padding-right: 0.6rem;
        min-width: 3rem;
        background: var(--gradient-brand);
        animation: funnel-grow var(--slow) var(--ease-out) both;
        transform-origin: left;
      }

      @keyframes funnel-grow {
        from {
          transform: scaleX(0);
        }
      }

      .funnel-value {
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--brand-ink);
        font-variant-numeric: tabular-nums;
      }

      .funnel-conv {
        text-align: right;
        font-variant-numeric: tabular-nums;
        font-weight: 650;
      }

      .from {
        margin: 0 0 0.5rem 8.25rem;
      }

      .drop {
        margin: 1rem 0 0;
        padding: 0.6rem 0.85rem;
        border-radius: var(--radius-sm);
        background: var(--warning-bg);
        border-left: 3px solid var(--warning);
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
        font-size: 1.45rem;
        font-weight: 750;
        font-variant-numeric: tabular-nums;
      }

      @media (max-width: 620px) {
        .funnel-row {
          grid-template-columns: 5.5rem minmax(0, 1fr) 3rem;
          gap: 0.5rem;
        }

        .from {
          margin-left: 6rem;
        }
      }
    `,
  ],
})
export class CustomerFunnelComponent extends PremiumDashboard<PremiumFunnel> {
  protected readonly feature: FeatureName = 'FUNNEL_BASIC';

  constructor() {
    super();
    this.watchFilters();
  }

  protected fetch(filters: AnalyticsFilters): Observable<PremiumFunnel> {
    return this.api.premiumFunnel(filters);
  }

  /** An all-zero funnel is not a funnel — §34 asks for an empty state instead. */
  readonly hasData = computed(() =>
    (this.data()?.stages ?? []).some((stage) => stage.value > 0),
  );

  labelOf(key: string): string {
    return this.data()?.stages.find((stage) => stage.key === key)?.label ?? key;
  }

  /** Bars are floored so a tiny final stage is still visible and clickable. */
  widthFor(share: number | null): number {
    return Math.max(share ?? 0, 4);
  }
}
