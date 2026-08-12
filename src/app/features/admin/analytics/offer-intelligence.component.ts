import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  AnalyticsFilters,
  CategoryInsights,
  FeatureName,
  OfferComparison,
  OfferIntelligence,
} from '../../../core/models';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
  UpgradePromptComponent,
} from '../../../shared/analytics-ui.components';
import { AnalyticsFilterBarComponent } from './analytics-filter-bar.component';
import { PremiumDashboard } from './premium-dashboard.base';

interface IntelligenceBundle {
  intelligence: OfferIntelligence;
  /** Null when category insights are not on this plan. */
  categories: CategoryInsights | null;
}

/**
 * §17–§22 in one place: discount effectiveness, best time to post, ending-soon
 * opportunities, offer health, recommendations and category demand. §7 asks for
 * related analytics to be grouped rather than spread over six thin pages.
 *
 * Offer comparison (§16) lives here too, loaded on demand once the merchant
 * picks offers — it is the one view that needs an explicit selection.
 *
 * Throughout, correlation is never stated as causation (§17) and no
 * recommendation is presented without the measurement behind it (§21).
 */
@Component({
  selector: 'app-offer-intelligence',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AnalyticsFilterBarComponent,
    AnalyticsEmptyComponent,
    AnalyticsSectionComponent,
    AnalyticsSkeletonComponent,
    UpgradePromptComponent,
  ],
  template: `
    <app-analytics-filter-bar [showBranch]="true" [showCategory]="true" />

    @if (upgrade()) {
      <app-upgrade-prompt [feature]="feature" heading="Offer intelligence" />
    } @else if (loading()) {
      <app-analytics-skeleton [count]="3" [chartHeight]="320" />
    } @else if (failed()) {
      <div class="card"><div class="card-body">{{ failed() }}</div></div>
    } @else if (data(); as bundle) {
      <!-- §21 Recommendations -->
      <app-analytics-section
        heading="Recommendations"
        subtitle="Suggestions derived from your own measurements"
      >
        @if (!bundle.intelligence.recommendations.items.length) {
          <app-analytics-empty
            icon="💡"
            title="No recommendations yet."
            message="Publish a few more offers so there is enough history to compare against."
          />
        } @else {
          <div class="advice">
            @for (item of bundle.intelligence.recommendations.items; track item.key) {
              <article class="tip">
                <header>
                  <span aria-hidden="true">{{ item.icon }}</span>
                  <span class="kind small">{{ item.kind }}</span>
                </header>
                <h3>{{ item.title }}</h3>
                <p class="small">{{ item.body }}</p>
                <p class="small action">{{ item.action }}</p>
                <p class="small subtle evidence">
                  Based on {{ item.evidence.metric }}: {{ item.evidence.value }}
                  @if (item.evidence.comparedTo !== undefined) {
                    (vs {{ item.evidence.comparedTo }})
                  }
                </p>
              </article>
            }
          </div>
        }
      </app-analytics-section>

      <div class="split mt-2">
        <!-- §20 Offer health -->
        <app-analytics-section
          heading="Offer health"
          subtitle="A 0–100 score for each live offer"
          hint="The score weighs views, saves, claims, redemption rate, discount, freshness and time remaining. Every score lists the factors behind it."
        >
          @if (!bundle.intelligence.health.offers.length) {
            <app-analytics-empty icon="❤️" title="No live offers to score." message="" />
          } @else {
            <ul class="health">
              @for (offer of bundle.intelligence.health.offers; track offer.id) {
                <li>
                  <div class="head">
                    <a [routerLink]="['/admin/offers', offer.id, 'edit']" class="truncate">
                      {{ offer.title }}
                    </a>
                    <span class="score" [class]="levelClass(offer.score)">
                      {{ offer.score }}<span class="of">/100</span>
                    </span>
                  </div>
                  <div class="meter">
                    <span [style.width.%]="offer.score" [class]="levelClass(offer.score)"></span>
                  </div>
                  <p class="small subtle level">{{ offer.level }}</p>
                  <ul class="reasons small">
                    @for (reason of offer.reasons; track reason.label) {
                      <li [class.good]="reason.good">
                        <span aria-hidden="true">{{ reason.good ? '✓' : '⚠' }}</span>
                        {{ reason.detail }}
                      </li>
                    }
                  </ul>
                </li>
              }
            </ul>
          }
        </app-analytics-section>

        <div class="side">
          <!-- §19 Ending soon -->
          <app-analytics-section
            heading="Ending soon"
            subtitle="Offers close to expiry, ranked by remaining interest"
          >
            @if (!bundle.intelligence.endingSoon.offers.length) {
              <app-analytics-empty
                icon="⏰"
                title="Nothing ending in the next few days."
                message=""
              />
            } @else {
              <ul class="ending">
                @for (offer of bundle.intelligence.endingSoon.offers; track offer.id) {
                  <li [class.priority]="offer.classification === 'high-priority'">
                    <div class="head">
                      <span class="truncate strong">{{ offer.title }}</span>
                      <span class="small nowrap">Ends in {{ offer.hoursLeft }}h</span>
                    </div>
                    <p class="small subtle">
                      {{ count(offer.recentViews) }} views in 7 days ·
                      {{ count(offer.saves) }} saves · {{ count(offer.claims) }} claims
                    </p>
                    <p class="small">{{ offer.recommendation }}</p>
                    <a class="btn btn-secondary btn-sm" [routerLink]="['/admin/offers', offer.id, 'edit']">
                      {{ offer.classification === 'high-priority' ? 'Extend offer' : 'Improve offer' }}
                    </a>
                  </li>
                }
              </ul>
            }
          </app-analytics-section>

          <!-- §18 Best time to post -->
          <app-analytics-section
            heading="Best time to post"
            [subtitle]="'Based on the last ' + bundle.intelligence.bestTime.lookbackDays + ' days'"
          >
            @if (!bundle.intelligence.bestTime.hasEnoughData) {
              <app-analytics-empty
                icon="🗓️"
                title="Not enough historical data yet."
                [message]="bundle.intelligence.bestTime.message ?? ''"
              />
            } @else {
              <ul class="days">
                @for (day of sortedDays(); track day.day) {
                  <li>
                    <span>{{ day.day }}</span>
                    <span class="stars" [attr.aria-label]="day.rating + ' out of 5'">
                      {{ stars(day.rating) }}
                    </span>
                    <span class="small subtle">{{ count(day.averageViews) }}/day</span>
                  </li>
                }
              </ul>

              @if (bundle.intelligence.bestTime.bestWindow; as window) {
                <p class="window">
                  Best window: <strong>{{ hour(window.fromHour) }} – {{ hour(window.toHour) }}</strong>
                </p>
              }
            }
          </app-analytics-section>
        </div>
      </div>

      <!-- §17 Discount effectiveness -->
      <app-analytics-section
        heading="Discount effectiveness"
        subtitle="Engagement against discount band and offer format"
        class="mt-2"
        hint="These are historical associations across your own offers, not a prediction. A band resting on very few offers is not a reliable signal."
      >
        @if (!bundle.intelligence.discountEffectiveness.hasEnoughData) {
          <app-analytics-empty
            icon="🏷️"
            title="Not enough offers to compare discounts yet."
            message="Publish offers across a few different discount levels to see how they compare."
          />
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Discount</th>
                  <th class="num">Offers</th>
                  <th class="num">Views</th>
                  <th class="num">Claims</th>
                  <th class="num">Conversion</th>
                </tr>
              </thead>
              <tbody>
                @for (band of bundle.intelligence.discountEffectiveness.bands; track band.band) {
                  <tr [class.thin]="band.sampleSize < 3">
                    <td>
                      {{ band.band }}
                      @if (band.sampleSize < 3) {
                        <span class="small subtle">· few offers</span>
                      }
                    </td>
                    <td class="num">{{ count(band.offers) }}</td>
                    <td class="num">{{ count(band.views) }}</td>
                    <td class="num">{{ count(band.claims) }}</td>
                    <td class="num">{{ percent(band.conversion) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (bundle.intelligence.discountEffectiveness.observation; as observation) {
            <p class="observation small">{{ observation }}</p>
          }
        }
      </app-analytics-section>

      <!-- §16 Offer comparison -->
      <app-analytics-section
        heading="Compare offers"
        subtitle="Pick up to six offers to compare side by side"
        class="mt-2"
      >
        <div class="compare-picker">
          @for (offer of comparableOffers(); track offer.id) {
            <label class="pick small">
              <input
                type="checkbox"
                [checked]="selected().includes(offer.id)"
                (change)="toggle(offer.id)"
              />
              <span class="truncate">{{ offer.title }}</span>
            </label>
          }
        </div>

        @if (selected().length < 2) {
          <p class="small subtle">Select at least two offers to compare.</p>
        } @else if (comparison(); as result) {
          <div class="table-wrap mt-1">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  @for (offer of result.offers; track offer.id) {
                    <th class="num truncate">{{ offer.title }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of comparisonRows(); track row.key) {
                  <tr>
                    <td>{{ row.label }}</td>
                    @for (cell of row.cells; track cell.offerId) {
                      <td class="num" [class.best]="cell.best">{{ cell.display }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (result.best; as best) {
            <p class="observation small">
              <strong>{{ best.title }}</strong> performed best overall, with
              {{ count(best.redemptions) }} redemptions from {{ count(best.claims) }} claims.
            </p>
          }
        }
      </app-analytics-section>

      <!-- §22 Category & market insights -->
      <app-analytics-section
        heading="Category & market insights"
        subtitle="Aggregated demand across the platform"
        class="mt-2"
      >
        @if (!bundle.categories) {
          <app-upgrade-prompt feature="CATEGORY_INSIGHTS" heading="Category insights" />
        } @else if (!bundle.categories.hasEnoughData) {
          <app-analytics-empty
            icon="📈"
            title="Not enough category data yet."
            message="Category demand appears once your categories see enough customer activity."
          />
        } @else {
          <ul class="categories">
            @for (category of bundle.categories.categories; track category.id) {
              <li>
                <span class="truncate">{{ category.name }}</span>
                <span class="delta" [class]="category.trend">
                  {{ trendArrow(category.trend) }}
                  {{ category.change === null ? '—' : abs(category.change) + '%' }}
                </span>
                <span class="small subtle">{{ count(category.customerInterest) }} interactions</span>
              </li>
            }
          </ul>
          <p class="small subtle note">{{ bundle.categories.note }}</p>
        }
      </app-analytics-section>
    }
  `,
  styles: [
    `
      .split {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
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
        white-space: nowrap;
      }

      /* ---- Recommendations ---- */
      .advice {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
        gap: 0.75rem;
      }

      .tip {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 0.85rem;
        background: var(--surface-alt);
      }

      .tip header {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        margin-bottom: 0.3rem;
      }

      .tip .kind {
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 700;
        color: var(--text-muted);
      }

      .tip h3 {
        margin: 0 0 0.3rem;
        font-size: 0.95rem;
      }

      .tip p {
        margin: 0 0 0.35rem;
      }

      .tip .action {
        font-weight: 620;
      }

      .tip .evidence {
        margin: 0;
      }

      /* ---- Offer health ---- */
      .health,
      .ending,
      .days,
      .categories {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .health > li {
        padding: 0.7rem 0;
        border-bottom: 1px solid var(--border);
      }

      .health > li:last-child {
        border-bottom: none;
      }

      .head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.6rem;
      }

      .score {
        font-weight: 760;
        font-variant-numeric: tabular-nums;
      }

      .score .of {
        font-size: 0.72rem;
        font-weight: 500;
        color: var(--text-subtle);
      }

      .meter {
        height: 8px;
        background: var(--surface-alt);
        border-radius: 999px;
        overflow: hidden;
        margin: 0.35rem 0 0.2rem;
      }

      .meter span {
        display: block;
        height: 100%;
        border-radius: 999px;
      }

      /* Level is stated in words as well as colour, so the rating survives a
         greyscale print or colour-blind viewer. */
      .excellent {
        background: var(--success);
        color: var(--success);
      }
      .good {
        background: var(--info);
        color: var(--info);
      }
      .attention {
        background: var(--warning);
        color: var(--warning);
      }
      .poor {
        background: var(--danger);
        color: var(--danger);
      }

      .meter span.excellent,
      .meter span.good,
      .meter span.attention,
      .meter span.poor {
        color: transparent;
      }

      .level {
        margin: 0 0 0.3rem;
      }

      .reasons {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem 0.85rem;
        margin: 0;
        padding: 0;
        list-style: none;
        color: var(--text-muted);
      }

      .reasons li.good {
        color: var(--success);
      }

      /* ---- Ending soon ---- */
      .ending li {
        padding: 0.65rem 0;
        border-bottom: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        align-items: flex-start;
      }

      .ending li:last-child {
        border-bottom: none;
      }

      .ending li.priority {
        border-left: 3px solid var(--warning);
        padding-left: 0.6rem;
      }

      .ending .head {
        width: 100%;
      }

      .ending p {
        margin: 0;
      }

      /* ---- Best time ---- */
      .days li,
      .categories li {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        gap: 0.6rem;
        align-items: baseline;
        padding: 0.35rem 0;
        border-bottom: 1px solid var(--border);
      }

      .days li:last-child,
      .categories li:last-child {
        border-bottom: none;
      }

      .stars {
        letter-spacing: 0.05em;
      }

      .window {
        margin: 0.75rem 0 0;
        font-size: 0.9rem;
      }

      .delta.up {
        color: var(--success);
      }
      .delta.down {
        color: var(--danger);
      }
      .delta.flat {
        color: var(--text-muted);
      }

      .observation,
      .note {
        margin: 0.75rem 0 0;
        padding: 0.6rem 0.85rem;
        border-radius: var(--radius-sm);
        background: var(--surface-alt);
      }

      tr.thin td {
        opacity: 0.65;
      }

      /* ---- Comparison ---- */
      .compare-picker {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem 0.9rem;
        margin-bottom: 0.6rem;
      }

      .pick {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        max-width: 16rem;
      }

      .pick input {
        width: auto;
      }

      td.best {
        font-weight: 750;
        color: var(--success);
      }

      th.truncate {
        max-width: 12ch;
      }

      @media (max-width: 980px) {
        .split {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
  ],
})
export class OfferIntelligenceComponent extends PremiumDashboard<IntelligenceBundle> {
  protected readonly feature: FeatureName = 'OFFER_INTELLIGENCE';

  readonly selected = signal<number[]>([]);
  readonly comparison = signal<OfferComparison | null>(null);

  constructor() {
    super();
    this.watchFilters();
  }

  protected fetch(filters: AnalyticsFilters): Observable<IntelligenceBundle> {
    return forkJoin({
      intelligence: this.api.premiumOfferIntelligence(filters),
      // Category insights are a separate entitlement; a refusal there must not
      // blank the rest of the page.
      categories: this.api.premiumCategoryInsights(filters).pipe(catchError(() => of(null))),
    });
  }

  /** Offers worth comparing: the ones already scored on this page. */
  readonly comparableOffers = computed(() => this.data()?.intelligence.health.offers ?? []);

  toggle(offerId: number): void {
    const current = this.selected();
    const next = current.includes(offerId)
      ? current.filter((id) => id !== offerId)
      : // §16 allows up to six; past that the table stops being readable.
        [...current, offerId].slice(0, 6);

    this.selected.set(next);
    if (next.length >= 2) {
      this.api.premiumOfferComparison(this.filters.query(), next).subscribe({
        next: (result) => this.comparison.set(result),
        error: () => this.comparison.set(null),
      });
    } else {
      this.comparison.set(null);
    }
  }

  /** The comparison table, transposed so each metric is a row (§16). */
  readonly comparisonRows = computed(() => {
    const result = this.comparison();
    if (!result) return [];

    const metrics: { key: keyof (typeof result.offers)[number]; label: string; percent?: boolean }[] = [
      { key: 'views', label: 'Views' },
      { key: 'saves', label: 'Saves' },
      { key: 'shares', label: 'Shares' },
      { key: 'claims', label: 'Claims' },
      { key: 'redemptions', label: 'Redemptions' },
      { key: 'conversion', label: 'Conversion', percent: true },
      { key: 'redemptionRate', label: 'Redemption rate', percent: true },
    ];

    return metrics.map((metric) => {
      const best = result.metrics.find((entry) => entry.key === metric.key)?.bestOfferId ?? null;
      return {
        key: metric.key as string,
        label: metric.label,
        cells: result.offers.map((offer) => {
          const value = offer[metric.key] as number | null;
          return {
            offerId: offer.id,
            display: metric.percent ? this.percent(value) : this.count(value),
            best: offer.id === best,
          };
        }),
      };
    });
  });

  /** Days ordered strongest first, which is how §18 presents them. */
  readonly sortedDays = computed(() =>
    [...(this.data()?.intelligence.bestTime.days ?? [])].sort((a, b) => b.views - a.views),
  );

  levelClass(score: number): string {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'attention';
    return 'poor';
  }

  stars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));
  }

  hour(value: number): string {
    const normalised = value % 24;
    const suffix = normalised < 12 ? 'AM' : 'PM';
    const display = normalised % 12 === 0 ? 12 : normalised % 12;
    return `${display} ${suffix}`;
  }

  trendArrow(trend: string): string {
    return { up: '↑', down: '↓', flat: '→' }[trend] ?? '→';
  }

  abs(value: number): number {
    return Math.abs(value);
  }
}
