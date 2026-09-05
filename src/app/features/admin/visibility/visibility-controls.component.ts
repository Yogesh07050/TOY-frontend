import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../../core/api.service';
import { ToastService } from '../../../core/toast.service';
import {
  FeaturedSlot,
  FrequencyLimit,
  PlacementType,
  RankingExclusion,
  RankingFactor,
  RankingWeightsResponse,
  RotationReport,
  VisibilityRulesResponse,
  VisibilitySurface,
} from '../../../core/models';

type Tab = 'weights' | 'rules' | 'slots' | 'frequency' | 'exclusions';

/**
 * Super Admin → Visibility controls (§22).
 *
 * Everything §22 puts in the platform owner's hands: ranking weights,
 * subscription priority, featured slot availability, rotation rules, frequency
 * limits and ranking exclusions.
 *
 * ## Why this screen shows the defaults next to the values
 *
 * A ranking weight is invisible from the outside. Nobody can look at the app
 * and tell whether DISTANCE is 1.6 or 2.4 — they can only tell that results
 * feel wrong, weeks later. So every control here shows what it is *now*, what
 * it *shipped as*, and how far it has drifted, and every surface has a one-click
 * restore. The fastest way to find out whether a bad week is the ranking's
 * fault is to put it back exactly as it was, and doing that by hand across
 * forty-five numbers invites a typo at the worst possible moment.
 *
 * ## What this screen deliberately cannot do
 *
 * There is no "boost this shop" control, because there is no such thing to
 * control. §24 requires that nobody can set a listing's ranking score directly,
 * and the system has no score column to set — weights apply to every listing at
 * once. Pulling one listing out of discovery is a different, visible act with
 * its own reason and expiry, and lives under Exclusions.
 */
@Component({
  selector: 'app-visibility-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Visibility controls</h1>
          <p class="subtitle">
            How listings are ranked and promoted, across the whole platform. Every change here is
            audited.
          </p>
        </div>
      </div>

      <nav class="tabs" aria-label="Visibility settings">
        @for (tab of tabs; track tab.key) {
          <button
            type="button"
            class="tab"
            [class.active]="active() === tab.key"
            (click)="active.set(tab.key)"
          >
            {{ tab.label }}
          </button>
        }
      </nav>

      <!-- ---------------------------------------------------------------- -->
      @if (active() === 'weights') {
        @if (weights(); as data) {
          <section class="card mb-2">
            <div class="card-header">
              <h2>Ranking weights</h2>
              <div class="row gap">
                <select [ngModel]="surface()" (ngModelChange)="surface.set($event)" aria-label="Surface">
                  @for (name of data.surfaces; track name) {
                    <option [value]="name">{{ surfaceLabel(name) }}</option>
                  }
                </select>
                <button type="button" class="btn btn-secondary btn-sm" (click)="resetSurface()">
                  Restore defaults
                </button>
              </div>
            </div>
            <div class="card-body">
              <p class="small subtle mb-2">
                Each factor contributes its score multiplied by this weight. A higher weight does not
                promote anyone — it changes how much that factor counts for every listing at once.
              </p>

              <ul class="weights">
                @for (factor of data.factors; track factor.key) {
                  <li>
                    <div class="weight-head">
                      <span class="strong">{{ factor.label }}</span>
                      <span class="values">
                        <span class="current">{{ currentWeight(factor.key) | number: '1.1-2' }}</span>
                        @if (hasDrifted(factor.key)) {
                          <span class="subtle small">
                            was {{ defaultWeight(factor.key) | number: '1.1-2' }}
                          </span>
                        }
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="4"
                      step="0.1"
                      [ngModel]="currentWeight(factor.key)"
                      (ngModelChange)="stageWeight(factor.key, $event)"
                      (change)="commitWeight(factor.key)"
                      [attr.aria-label]="factor.label + ' weight'"
                    />
                    <div class="bar" [class.drifted]="hasDrifted(factor.key)">
                      <span [style.width.%]="barWidth(factor.key)"></span>
                    </div>
                  </li>
                }
              </ul>
            </div>
          </section>

          <!-- The two invariants that are easy to break and expensive to
               discover. §26 says a customer must not feel the most expensive
               plan is always first; §5 promises a nearby Free offer can beat a
               distant Premium one. Both are arithmetic, so they can be checked
               here rather than found in a complaint. -->
          <section class="card mb-2" [class.warn]="!subscriptionIsSafe()">
            <div class="card-header"><h2>Fairness check</h2></div>
            <div class="card-body">
              <ul class="checks small">
                <li [class.ok]="subscriptionUnderRelevanceAndDistance()">
                  <span>Subscription weighs less than relevance and distance combined</span>
                  <span class="strong">{{ subscriptionUnderRelevanceAndDistance() ? 'Pass' : 'Fail' }}</span>
                </li>
                <li [class.ok]="subscriptionNotLargest()">
                  <span>Subscription is not the largest weight on this surface</span>
                  <span class="strong">{{ subscriptionNotLargest() ? 'Pass' : 'Fail' }}</span>
                </li>
              </ul>
              @if (!subscriptionIsSafe()) {
                <p class="small danger mt-1">
                  With these weights a paid plan can outrank a more relevant, nearer listing. That is
                  the outcome §5 and §26 exist to prevent — restore the defaults, or lower the
                  subscription weight.
                </p>
              }
            </div>
          </section>

          <section class="card">
            <div class="card-header"><h2>Recommended search priority</h2></div>
            <div class="card-body">
              <ol class="priority small">
                @for (label of data.searchPriority; track label) {
                  <li>{{ label }}</li>
                }
              </ol>
              <p class="small subtle">
                The weights above should broadly follow this order on the Search surface. Subscription
                sits seventh by design.
              </p>
            </div>
          </section>
        } @else {
          <div class="skeleton" style="height: 320px"></div>
        }
      }

      <!-- ---------------------------------------------------------------- -->
      @if (active() === 'rules') {
        @if (rules(); as data) {
          <section class="card">
            <div class="card-header">
              <h2>Ranking rules</h2>
              <p class="small subtle">
                A weight says how much a factor counts. A rule says what its curve looks like.
              </p>
            </div>
            <div class="card-body">
              <div class="rule-grid">
                @for (rule of numericRules(); track rule.key) {
                  <div class="field">
                    <label [attr.for]="'rule-' + rule.key">{{ ruleLabel(rule.key) }}</label>
                    <input
                      [id]="'rule-' + rule.key"
                      type="number"
                      step="any"
                      [ngModel]="rule.value"
                      (change)="saveRule(rule.key, $any($event.target).value)"
                    />
                    <span class="hint">
                      {{ ruleHint(rule.key) }}
                      @if (rule.value !== rule.default) {
                        · default {{ rule.default }}
                      }
                    </span>
                  </div>
                }
              </div>
            </div>
          </section>
        } @else {
          <div class="skeleton" style="height: 260px"></div>
        }
      }

      <!-- ---------------------------------------------------------------- -->
      @if (active() === 'slots') {
        <section class="card mb-2">
          <div class="card-header">
            <h2>Featured slots</h2>
            <p class="small subtle">
              Capacity is what makes rotation meaningful: a slot shows this many campaigns at once,
              and the rest of the eligible pool circulates through those positions.
            </p>
          </div>
          <div class="card-body">
            @if (!slots().length) {
              <div class="skeleton" style="height: 140px"></div>
            } @else {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Slot</th>
                      <th>Placement</th>
                      <th>Capacity</th>
                      <th>Min level</th>
                      <th>Live now</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (slot of slots(); track slot.id) {
                      <tr>
                        <td class="strong">{{ slot.name }}</td>
                        <td class="small subtle">{{ slot.placementType }}</td>
                        <td>
                          <input
                            class="num"
                            type="number"
                            min="1"
                            max="50"
                            [ngModel]="slot.capacity"
                            (change)="saveSlot(slot, { capacity: +$any($event.target).value })"
                            [attr.aria-label]="slot.name + ' capacity'"
                          />
                        </td>
                        <td>
                          <select
                            [ngModel]="slot.minPlanRank"
                            (ngModelChange)="saveSlot(slot, { minPlanRank: +$event })"
                            [attr.aria-label]="slot.name + ' minimum level'"
                          >
                            <option [value]="0">Basic</option>
                            <option [value]="1">Enhanced</option>
                            <option [value]="2">Priority</option>
                          </select>
                        </td>
                        <td>{{ slot.activeCampaigns }}</td>
                        <td>
                          <span class="badge" [class.badge-success]="slot.status === 'active'">
                            {{ slot.status }}
                          </span>
                        </td>
                        <td>
                          <button type="button" class="linklike" (click)="loadRotation(slot.code)">
                            Rotation
                          </button>
                          ·
                          <button type="button" class="linklike" (click)="toggleSlot(slot)">
                            {{ slot.status === 'active' ? 'Disable' : 'Enable' }}
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </section>

        <!-- §10 audit: an even split means rotation is working. One merchant
             holding 80% of a slot means it is not. -->
        @if (rotation(); as report) {
          <section class="card">
            <div class="card-header">
              <h2>{{ report.slot.name }} — exposure over {{ report.windowDays }} days</h2>
              <button type="button" class="btn btn-ghost btn-sm" (click)="rotation.set(null)">
                Close
              </button>
            </div>
            <div class="card-body">
              @if (!report.campaigns.length) {
                <p class="small subtle">No campaigns have run in this slot yet.</p>
              } @else {
                <p class="small subtle mb-2">
                  {{ report.totalImpressions | number }} featured impressions. An even split across
                  {{ report.campaigns.length }} campaigns would be
                  {{ 100 / report.campaigns.length | number: '1.0-1' }}% each.
                </p>
                <ul class="share">
                  @for (row of report.campaigns; track row.campaignId) {
                    <li>
                      <div class="share-head">
                        <span>{{ row.shopName }} — {{ row.name }}</span>
                        <span class="strong">{{ row.sharePercent }}%</span>
                      </div>
                      <div class="bar">
                        <span [style.width.%]="row.sharePercent"></span>
                      </div>
                    </li>
                  }
                </ul>
              }
            </div>
          </section>
        }
      }

      <!-- ---------------------------------------------------------------- -->
      @if (active() === 'frequency') {
        <section class="card">
          <div class="card-header">
            <h2>Frequency limits</h2>
            <p class="small subtle">
              The most a customer is shown the same thing in a period. A fatigued organic listing
              loses score and sinks; a fatigued campaign gives up its slot to someone else.
            </p>
          </div>
          <div class="card-body">
            @if (!limits().length) {
              <div class="skeleton" style="height: 120px"></div>
            } @else {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Scope</th>
                      <th>Applies to</th>
                      <th>Max impressions</th>
                      <th>Window (minutes)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (limit of limits(); track limit.id) {
                      <tr>
                        <td class="strong">{{ scopeLabel(limit.scope) }}</td>
                        <td class="small subtle">{{ limit.appliesTo }}</td>
                        <td>
                          <input
                            class="num"
                            type="number"
                            min="1"
                            [ngModel]="limit.maxImpressions"
                            (change)="saveLimit(limit, { maxImpressions: +$any($event.target).value })"
                            [attr.aria-label]="limit.scope + ' max impressions'"
                          />
                        </td>
                        <td>
                          <input
                            class="num wide"
                            type="number"
                            min="1"
                            [ngModel]="limit.windowMinutes"
                            (change)="saveLimit(limit, { windowMinutes: +$any($event.target).value })"
                            [attr.aria-label]="limit.scope + ' window'"
                          />
                        </td>
                        <td>
                          <span class="badge" [class.badge-success]="limit.status === 'active'">
                            {{ limit.status }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </section>
      }

      <!-- ---------------------------------------------------------------- -->
      @if (active() === 'exclusions') {
        <section class="card mb-2">
          <div class="card-header"><h2>Exclude a listing or shop from ranking</h2></div>
          <div class="card-body">
            <div class="rule-grid">
              <div class="field">
                <label for="ex-scope">Scope</label>
                <select id="ex-scope" [(ngModel)]="exScope">
                  <option value="listing">One listing</option>
                  <option value="shop">A whole shop</option>
                </select>
              </div>
              @if (exScope === 'listing') {
                <div class="field">
                  <label for="ex-type">Listing type</label>
                  <select id="ex-type" [(ngModel)]="exListingType">
                    <option value="offer">Offer</option>
                    <option value="service_offer">Service offer</option>
                  </select>
                </div>
                <div class="field">
                  <label for="ex-id">Listing id</label>
                  <input id="ex-id" type="number" min="1" [(ngModel)]="exListingId" />
                </div>
              } @else {
                <div class="field">
                  <label for="ex-shop">Shop id</label>
                  <input id="ex-shop" type="number" min="1" [(ngModel)]="exShopId" />
                </div>
              }
              <div class="field">
                <label for="ex-expires">Lift automatically on</label>
                <input id="ex-expires" type="date" [(ngModel)]="exExpiresAt" />
                <span class="hint">Leave empty to keep it excluded until lifted by hand.</span>
              </div>
              <div class="field wide">
                <label for="ex-reason">Reason</label>
                <input
                  id="ex-reason"
                  type="text"
                  [(ngModel)]="exReason"
                  placeholder="Why is this being pulled from discovery?"
                />
              </div>
            </div>
            <button type="button" class="btn" [disabled]="busy()" (click)="addExclusion()">
              Exclude
            </button>
          </div>
        </section>

        <section class="card">
          <div class="card-header">
            <h2>Active exclusions</h2>
            <p class="small subtle">
              Automatic ones were opened by the anti-manipulation sweep and expire on their own.
            </p>
          </div>
          <div class="card-body">
            @if (!exclusions().length) {
              <p class="small subtle">Nothing is currently excluded from ranking.</p>
            } @else {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>What</th>
                      <th>Source</th>
                      <th>Reason</th>
                      <th>Expires</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of exclusions(); track row.id) {
                      <tr>
                        <td class="strong">
                          {{
                            row.scope === 'shop'
                              ? (row.shopName ?? 'Shop #' + row.shopId)
                              : row.listingType + ' #' + row.listingId
                          }}
                        </td>
                        <td>
                          <span class="badge" [class.badge-warning]="row.source === 'auto'">
                            {{ row.source }}
                          </span>
                        </td>
                        <td class="reason small">{{ row.reason ?? '—' }}</td>
                        <td class="small">{{ (row.expiresAt | date: 'short') || 'Never' }}</td>
                        <td>
                          <button type="button" class="linklike" (click)="lift(row)">Lift</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .tabs {
        display: flex;
        gap: 0.35rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
        border-bottom: 1px solid var(--border);
      }

      .tab {
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        padding: 0.55rem 0.85rem;
        font: inherit;
        font-weight: 600;
        color: var(--text-muted);
        cursor: pointer;
      }

      .tab.active {
        color: var(--brand);
        border-bottom-color: var(--brand);
      }

      .row.gap {
        display: flex;
        gap: 0.6rem;
        align-items: center;
        flex-wrap: wrap;
      }

      .weights {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 1.1rem;
      }

      .weight-head,
      .share-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 1rem;
        margin-bottom: 0.3rem;
      }

      .values {
        display: flex;
        gap: 0.5rem;
        align-items: baseline;
      }

      .current {
        font-variant-numeric: tabular-nums;
        font-weight: 700;
      }

      .weights input[type='range'] {
        width: 100%;
      }

      .bar {
        height: 6px;
        border-radius: 3px;
        background: var(--border);
        overflow: hidden;
        margin-top: 0.35rem;
      }

      .bar span {
        display: block;
        height: 100%;
        background: var(--brand);
      }

      .bar.drifted span {
        background: var(--accent, #fb923c);
      }

      .checks {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.4rem;
      }

      .checks li {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        color: var(--danger, #b3261e);
      }

      .checks li.ok {
        color: var(--text-muted);
      }

      .card.warn {
        border-color: var(--danger, #b3261e);
      }

      .danger {
        color: var(--danger, #b3261e);
      }

      .priority {
        margin: 0 0 0.6rem;
        padding-left: 1.1rem;
        display: grid;
        gap: 0.15rem;
      }

      .rule-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
        gap: 0.9rem;
        margin-bottom: 1rem;
      }

      .field.wide {
        grid-column: 1 / -1;
      }

      .num {
        width: 5.5rem;
      }

      .num.wide {
        width: 7rem;
      }

      .share {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.8rem;
      }

      .reason {
        max-width: 22rem;
      }

      .linklike {
        background: none;
        border: none;
        padding: 0;
        color: var(--brand);
        font: inherit;
        cursor: pointer;
      }

      .mt-1 {
        margin-top: 0.6rem;
      }
    `,
  ],
})
export class VisibilityControlsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly tabs: { key: Tab; label: string }[] = [
    { key: 'weights', label: 'Ranking weights' },
    { key: 'rules', label: 'Rules' },
    { key: 'slots', label: 'Featured slots' },
    { key: 'frequency', label: 'Frequency limits' },
    { key: 'exclusions', label: 'Exclusions' },
  ];

  readonly active = signal<Tab>('weights');
  readonly weights = signal<RankingWeightsResponse | null>(null);
  readonly rules = signal<VisibilityRulesResponse | null>(null);
  readonly slots = signal<FeaturedSlot[]>([]);
  readonly limits = signal<FrequencyLimit[]>([]);
  readonly exclusions = signal<RankingExclusion[]>([]);
  readonly rotation = signal<RotationReport | null>(null);
  readonly surface = signal<VisibilitySurface>('SEARCH');
  readonly busy = signal(false);

  /**
   * Slider positions held locally between `input` and `change`.
   *
   * A range input fires on every pixel of a drag. Saving each one would be a
   * hundred audited writes for one adjustment, so the slider updates this and
   * only the released value is sent.
   */
  private readonly staged = signal<Partial<Record<RankingFactor, number>>>({});

  // Exclusion form state.
  exScope: 'listing' | 'shop' = 'listing';
  exListingType = 'offer';
  exListingId: number | null = null;
  exShopId: number | null = null;
  exReason = '';
  exExpiresAt = '';

  constructor() {
    this.loadWeights();
    this.api.visibilityRules().subscribe({ next: (data) => this.rules.set(data), error: () => undefined });
    this.loadSlots();
    this.api.frequencyLimits().subscribe({ next: (data) => this.limits.set(data), error: () => undefined });
    this.loadExclusions();
  }

  private loadWeights(): void {
    this.api.rankingWeights().subscribe({
      next: (data) => {
        this.weights.set(data);
        this.staged.set({});
      },
      error: () => this.toast.error('Ranking weights could not be loaded.'),
    });
  }

  private loadSlots(): void {
    this.api.visibilitySlots().subscribe({ next: (data) => this.slots.set(data), error: () => undefined });
  }

  private loadExclusions(): void {
    this.api
      .rankingExclusions({ status: 'active', limit: 100 })
      .subscribe({ next: (data) => this.exclusions.set(data), error: () => undefined });
  }

  // ---- Weights ------------------------------------------------------------

  currentWeight(factor: RankingFactor): number {
    const staged = this.staged()[factor];
    if (staged !== undefined) return staged;
    return this.weights()?.weights[this.surface()]?.[factor] ?? 0;
  }

  defaultWeight(factor: RankingFactor): number {
    return this.weights()?.defaults[this.surface()]?.[factor] ?? 0;
  }

  hasDrifted(factor: RankingFactor): boolean {
    return Math.abs(this.currentWeight(factor) - this.defaultWeight(factor)) > 0.001;
  }

  /** Scaled against the surface's own largest weight, so bars stay comparable. */
  barWidth(factor: RankingFactor): number {
    const all = this.weights()?.weights[this.surface()];
    if (!all) return 0;
    const max = Math.max(...Object.values(all), this.currentWeight(factor), 0.1);
    return (this.currentWeight(factor) / max) * 100;
  }

  stageWeight(factor: RankingFactor, value: number): void {
    this.staged.update((current) => ({ ...current, [factor]: Number(value) }));
  }

  commitWeight(factor: RankingFactor): void {
    const weight = this.currentWeight(factor);
    const surface = this.surface();
    this.api.setRankingWeight({ surface, factor, weight }).subscribe({
      next: (data) => {
        this.weights.set(data);
        this.staged.update((current) => {
          const next = { ...current };
          delete next[factor];
          return next;
        });
        this.toast.success(`${this.factorLabel(factor)} weight saved.`);
      },
      error: () => {
        this.staged.set({});
        this.toast.error('That weight could not be saved.');
      },
    });
  }

  factorLabel(factor: RankingFactor): string {
    return this.weights()?.factors.find((entry) => entry.key === factor)?.label ?? factor;
  }

  resetSurface(): void {
    const surface = this.surface();
    this.api.resetRankingWeights(surface).subscribe({
      next: (data) => {
        this.weights.set(data);
        this.staged.set({});
        this.toast.success(`${this.surfaceLabel(surface)} restored to defaults.`);
      },
      error: () => this.toast.error('The weights could not be restored.'),
    });
  }

  surfaceLabel(surface: VisibilitySurface): string {
    return (
      {
        SEARCH: 'Search',
        NEAR_ME: 'Near Me',
        HOME: 'Home feed',
        CATEGORY: 'Category',
        ENDING_SOON: 'Ending Soon',
      } as Record<VisibilitySurface, string>
    )[surface];
  }

  // ---- Fairness invariants (§5, §26) --------------------------------------

  readonly subscriptionUnderRelevanceAndDistance = computed(
    () =>
      this.currentWeight('SUBSCRIPTION') <
      this.currentWeight('RELEVANCE') + this.currentWeight('DISTANCE'),
  );

  readonly subscriptionNotLargest = computed(() => {
    const all = this.weights()?.weights[this.surface()];
    if (!all) return true;
    return this.currentWeight('SUBSCRIPTION') < Math.max(...Object.values(all));
  });

  readonly subscriptionIsSafe = computed(
    () => this.subscriptionUnderRelevanceAndDistance() && this.subscriptionNotLargest(),
  );

  // ---- Rules --------------------------------------------------------------

  /**
   * Only the scalar rules get a control.
   *
   * The object-shaped ones (the per-signal engagement weights) are a different
   * kind of edit and would need their own screen to do honestly; showing them
   * as an unparsed blob would invite exactly the malformed value that quietly
   * breaks ranking.
   */
  readonly numericRules = computed(() => {
    const data = this.rules();
    if (!data) return [];
    return Object.entries(data.rules)
      .filter(([, value]) => typeof value === 'number')
      .map(([key, value]) => ({
        key,
        value: value as number,
        default: data.defaults[key] as number,
      }));
  });

  ruleLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (character) => character.toUpperCase())
      .trim();
  }

  ruleHint(key: string): string {
    return RULE_HINTS[key] ?? '';
  }

  saveRule(key: string, raw: string): void {
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      this.toast.error('That rule needs a number.');
      return;
    }
    this.api.setVisibilityRule(key, value).subscribe({
      next: (data) => {
        this.rules.set(data);
        this.toast.success(`${this.ruleLabel(key)} saved.`);
      },
      error: () => this.toast.error('That rule could not be saved.'),
    });
  }

  // ---- Slots --------------------------------------------------------------

  saveSlot(slot: FeaturedSlot, changes: Partial<FeaturedSlot>): void {
    const payload = {
      code: slot.code,
      placementType: slot.placementType,
      name: slot.name,
      description: slot.description,
      capacity: slot.capacity,
      minPlanRank: slot.minPlanRank,
      categoryId: slot.categoryId,
      city: slot.city,
      status: slot.status,
      ...changes,
    };
    this.api.saveVisibilitySlot(payload as never).subscribe({
      next: () => {
        this.loadSlots();
        this.toast.success(`${slot.name} updated.`);
      },
      error: () => this.toast.error('That slot could not be saved.'),
    });
  }

  toggleSlot(slot: FeaturedSlot): void {
    this.saveSlot(slot, { status: slot.status === 'active' ? 'inactive' : 'active' });
  }

  loadRotation(code: string): void {
    this.api.slotRotation(code, 7).subscribe({
      next: (report) => this.rotation.set(report),
      error: () => this.toast.error('That rotation report could not be loaded.'),
    });
  }

  // ---- Frequency ----------------------------------------------------------

  scopeLabel(scope: FrequencyLimit['scope']): string {
    return (
      {
        offer: 'Same offer',
        shop: 'Same shop',
        campaign: 'Same campaign',
        placement: 'Same placement',
      } as Record<FrequencyLimit['scope'], string>
    )[scope];
  }

  saveLimit(limit: FrequencyLimit, changes: Partial<FrequencyLimit>): void {
    this.api
      .saveFrequencyLimit({
        scope: limit.scope,
        placementType: limit.placementType as PlacementType | null,
        appliesTo: limit.appliesTo,
        maxImpressions: changes.maxImpressions ?? limit.maxImpressions,
        windowMinutes: changes.windowMinutes ?? limit.windowMinutes,
        status: limit.status,
      })
      .subscribe({
        next: () => {
          this.api.frequencyLimits().subscribe({ next: (data) => this.limits.set(data) });
          this.toast.success('Frequency limit saved.');
        },
        error: () => this.toast.error('That limit could not be saved.'),
      });
  }

  // ---- Exclusions ---------------------------------------------------------

  addExclusion(): void {
    if (this.exReason.trim().length < 3) {
      this.toast.error('An exclusion needs a reason.');
      return;
    }
    this.busy.set(true);
    this.api
      .createRankingExclusion({
        scope: this.exScope,
        listingType: this.exScope === 'listing' ? this.exListingType : undefined,
        listingId: this.exScope === 'listing' ? (this.exListingId ?? undefined) : undefined,
        shopId: this.exScope === 'shop' ? (this.exShopId ?? undefined) : undefined,
        reason: this.exReason.trim(),
        expiresAt: this.exExpiresAt || null,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.exReason = '';
          this.exListingId = null;
          this.exShopId = null;
          this.exExpiresAt = '';
          this.loadExclusions();
          this.toast.success('Excluded from ranking.');
        },
        error: () => {
          this.busy.set(false);
          this.toast.error('That exclusion could not be created.');
        },
      });
  }

  lift(row: RankingExclusion): void {
    this.api.liftRankingExclusion(row.id).subscribe({
      next: () => {
        this.loadExclusions();
        this.toast.success('Exclusion lifted.');
      },
      error: () => this.toast.error('That exclusion could not be lifted.'),
    });
  }
}

/**
 * What each rule actually does, in a sentence.
 *
 * Kept beside the control rather than in a wiki: "freshnessHalfLifeDays" tells
 * a reader nothing about whether 3 is a lot, and someone tuning ranking at
 * speed will not go and look it up.
 */
const RULE_HINTS: Record<string, string> = {
  freshnessHalfLifeDays: 'Days for a new listing to lose half its freshness boost.',
  freshnessMaxDays: 'Beyond this, a listing counts as not fresh at all.',
  distanceDecayKm: 'Distance at which a listing scores half as well as one at the door.',
  distanceUnknownScore: 'What an online-only listing scores for distance.',
  defaultRadiusKm: 'Near Me search radius when the customer has not chosen one.',
  maxRadiusKm: 'The furthest a customer may widen Near Me.',
  engagementSaturation: 'Weighted engagement at which a listing scores a full 1.0.',
  engagementWindowDays: 'How far back engagement is counted.',
  engagementImpressionCapRatio:
    'How much impression volume can count, as a multiple of the engagement it produced.',
  coldStartEngagementScore: 'What a listing with no history scores, so new offers can rank.',
  placementQualityFloor: 'Quality a listing needs before it is fit for a prominent position.',
  diversityMaxPerShop: 'Most results one shop may hold inside the window below.',
  diversityWindow: 'How many consecutive results the shop limit applies across.',
  diversityMaxPerCategory: 'Most results one category may hold in its window.',
  diversityCategoryWindow: 'How many consecutive results the category limit applies across.',
  rotationTieBand: 'Scores this close count as a tie, and ties rotate.',
  rotationBucketMinutes: 'How long one rotation ordering lasts before it reshuffles.',
  rotationExposurePenalty: 'Most a heavily-shown listing can lose, inside its tie band.',
  rotationExposureWindowHours: 'How far back prominent exposure is counted.',
  frequencySameOfferImpressions: 'Default cap on showing one offer to one customer.',
  frequencySameShopImpressions: 'Default cap on showing one shop to one customer.',
  frequencyWindowMinutes: 'The period those defaults apply over.',
  frequencyFatiguePenalty: 'Score a fatigued listing loses, as a fraction.',
  antiManipulationMaxEventsPerUserPerListing:
    'Events from one account on one listing before the excess stops counting.',
  antiManipulationWindowHours: 'The window the anti-manipulation sweep looks back over.',
  antiManipulationDistinctWeight: 'How much engagement is discounted when few people produced it.',
  configCacheSeconds: 'How long a weight change takes to reach every server.',
  candidateOverfetch: 'Candidates fetched per result before scoring.',
  candidatePoolMax: 'Hard ceiling on the candidate pool.',
  nearMeRequiresLocation: 'Whether Near Me excludes listings with no confirmed location.',
};
