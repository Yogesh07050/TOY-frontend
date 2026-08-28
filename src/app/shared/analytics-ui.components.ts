import { CommonModule } from '@angular/common';
import { Component, Input, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SubscriptionService } from '../core/subscription.service';
import { FeatureName, Kpi } from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { IconName } from '../shared/icons';

/**
 * Presentation primitives shared by every premium analytics dashboard (§33).
 *
 * Charts are hand-drawn SVG rather than a charting dependency: the shapes here
 * are simple, and inline SVG inherits the theme's CSS variables, which is what
 * makes light/dark mode work without a second palette to maintain (§33, §39).
 */

// ---------------------------------------------------------------------------
// KPI card (§8)
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat card kpi" [class.has-hint]="kpi().hint">
      <span class="stat-label">
        {{ kpi().label }}
        @if (kpi().hint) {
          <span class="info" [attr.aria-label]="kpi().hint" [title]="kpi().hint">ⓘ</span>
        }
      </span>
      <span class="stat-value">{{ display() }}</span>

      <span class="delta" [class]="kpi().trend">
        @if (kpi().change === null) {
          <span class="subtle small">No previous data</span>
        } @else {
          <span class="arrow" aria-hidden="true">{{ arrow() }}</span>
          <span>{{ absChange() }}%</span>
          <span class="subtle small">vs {{ kpi().previous | number }}</span>
        }
      </span>
    </div>
  `,
  styles: [
    `
      .kpi {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        padding: 0.95rem 1rem;
      }

      .stat-label {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.74rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
        font-weight: 700;
      }

      .info {
        cursor: help;
        opacity: 0.6;
        font-size: 0.8rem;
      }

      .stat-value {
        font-size: 1.65rem;
        font-weight: 750;
        line-height: 1.15;
        font-variant-numeric: tabular-nums;
      }

      .delta {
        display: flex;
        align-items: baseline;
        gap: 0.35rem;
        font-size: 0.8rem;
        font-weight: 650;
        font-variant-numeric: tabular-nums;
      }

      /* Direction is carried by the arrow as well as the colour, so the trend
         is still readable without colour vision. */
      .delta.up {
        color: var(--success);
      }
      .delta.down {
        color: var(--danger);
      }
      .delta.flat {
        color: var(--text-muted);
      }
    `,
  ],
})
export class KpiCardComponent {
  readonly kpi = input.required<Kpi>();

  /**
   * The payload names its own format, so a card never has to infer one from the
   * key. `decimal` exists because the Business Dashboard's per-user and
   * per-shop ratios (§8, §9, §12-§15) are meaningless rounded to whole
   * numbers - "0 claims per user" and "0.20 claims per user" are different
   * findings.
   */
  readonly display = computed(() => {
    const { value, format } = this.kpi();
    switch (format) {
      case 'percent':
        return `${value}%`;
      case 'currency':
        return `₹${value.toLocaleString('en-IN')}`;
      case 'decimal':
        return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      default:
        return value.toLocaleString('en-IN');
    }
  });

  readonly arrow = computed(() => ({ up: '↑', down: '↓', flat: '→' })[this.kpi().trend]);
  readonly absChange = computed(() => Math.abs(this.kpi().change ?? 0));
}

// ---------------------------------------------------------------------------
// Empty state (§34)
// ---------------------------------------------------------------------------

/**
 * Shown instead of a chart when there is not enough data (§34: "do not show
 * broken or misleading charts"). A zeroed chart reads as a real measurement,
 * which is worse than saying nothing.
 */
@Component({
  selector: 'app-analytics-empty',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="empty">
      <app-icon class="glyph" [name]="icon()" [size]="26" />
      <p class="title">{{ title() }}</p>
      <p class="small subtle">{{ message() }}</p>
      <ng-content />
    </div>
  `,
  styles: [
    `
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.3rem;
        text-align: center;
        padding: 2rem 1rem;
        min-height: 140px;
      }

      .glyph {
        font-size: 1.7rem;
        opacity: 0.5;
      }

      .title {
        font-weight: 650;
        margin: 0;
      }

      p {
        margin: 0;
        max-width: 34ch;
      }
    `,
  ],
})
export class AnalyticsEmptyComponent {
  readonly icon = input<IconName>('bar-chart-outline');
  readonly title = input('Not enough data yet.');
  readonly message = input('Publish and promote more offers to unlock meaningful customer insights.');
}

// ---------------------------------------------------------------------------
// Upgrade prompt (§31)
// ---------------------------------------------------------------------------

/**
 * The contextual lock from §31. Wording comes from the plan catalogue the API
 * serves, so it names the right plan and price without the UI hard-coding the
 * ladder — and it stays correct if pricing ever changes.
 */
@Component({
  selector: 'app-upgrade-prompt',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="card upgrade">
      <div class="card-body">
        <app-icon name="lock-closed-outline" [size]="16" />
        <h3>{{ heading() }}</h3>
        <p class="subtle">
          {{ label() }} is available with the {{ priceLabel() }} {{ required()?.name }} plan.
        </p>
        @if (note()) {
          <p class="small subtle">{{ note() }}</p>
        }
        <a class="btn" routerLink="/admin/subscription/upgrade">
          Upgrade to {{ required()?.name }}
        </a>
      </div>
    </div>
  `,
  styles: [
    `
      .upgrade {
        border-style: dashed;
      }

      .card-body {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.55rem;
        text-align: center;
        padding: 2rem 1.25rem;
      }

      .lock {
        font-size: 1.6rem;
      }

      h3 {
        margin: 0;
        font-size: 1.05rem;
      }

      p {
        margin: 0;
        max-width: 46ch;
      }
    `,
  ],
})
export class UpgradePromptComponent {
  private readonly subscriptions = inject(SubscriptionService);

  readonly feature = input.required<FeatureName>();
  readonly heading = input('Premium feature');
  readonly note = input<string | null>(null);

  readonly required = computed(() => this.subscriptions.requiredPlanFor(this.feature()));
  readonly label = computed(() => this.subscriptions.labelFor(this.feature()));
  readonly priceLabel = computed(() => {
    const price = this.required()?.price ?? 0;
    return `₹${price.toLocaleString('en-IN')}`;
  });
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

export interface SeriesPoint {
  label: string;
  value: number;
}

/** A grouped bar chart. Bars are labelled so the values are readable as text. */
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (!points().length) {
      <ng-content select="[empty]" />
    } @else {
      <div class="chart" [style.--bar-height.px]="height()">
        @for (point of points(); track point.label; let i = $index) {
          <div class="bar-group" [title]="point.label + ': ' + point.value">
            <div
              class="bar"
              [style.height.%]="percent(point.value)"
              [style.animation-delay.ms]="i * 12"
            ></div>
            @if (showLabels()) {
              <span class="bar-label">{{ point.label }}</span>
            }
          </div>
        }
      </div>
      <div class="axis small subtle">
        <span>0</span>
        <span>{{ max() | number }}</span>
      </div>
    }
  `,
  styles: [
    `
      .chart {
        display: flex;
        align-items: flex-end;
        gap: 3px;
        height: var(--bar-height, 160px);
        padding-bottom: 1.15rem;
        overflow-x: auto;
      }

      .bar-group {
        position: relative;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        height: 100%;
        flex: 1;
        min-width: 14px;
      }

      .bar {
        width: 100%;
        border-radius: 4px 4px 0 0;
        min-height: 2px;
        background: var(--gradient-brand-deep);
        transform-origin: bottom;
        animation: grow var(--slow) var(--ease-out) both;
        transition: filter var(--fast) var(--ease);
      }

      .bar-group:hover .bar {
        filter: saturate(1.4) brightness(1.08);
      }

      @keyframes grow {
        from {
          transform: scaleY(0);
        }
      }

      .bar-label {
        position: absolute;
        bottom: -1.1rem;
        left: 50%;
        transform: translateX(-50%);
        font-size: 0.62rem;
        color: var(--text-subtle);
        white-space: nowrap;
      }

      .axis {
        display: flex;
        justify-content: space-between;
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class BarChartComponent {
  readonly points = input<SeriesPoint[]>([]);
  readonly height = input(160);
  readonly showLabels = input(true);

  readonly max = computed(() => Math.max(1, ...this.points().map((point) => point.value)));

  percent(value: number): number {
    return (value / this.max()) * 100;
  }
}

export interface LineSeries {
  key: string;
  label: string;
  colour: string;
  points: SeriesPoint[];
}

/**
 * A multi-series line chart drawn as inline SVG.
 *
 * `preserveAspectRatio="none"` with a fixed viewBox lets the chart stretch to
 * any container width without recomputing geometry — the price is that stroke
 * widths would stretch too, which `vector-effect` prevents.
 */
@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (!hasData()) {
      <ng-content select="[empty]" />
    } @else {
      <svg
        class="line-chart"
        [attr.viewBox]="'0 0 ' + width + ' ' + chartHeight"
        preserveAspectRatio="none"
        role="img"
        [attr.aria-label]="ariaLabel()"
      >
        @for (y of gridLines; track y) {
          <line class="grid" [attr.x1]="0" [attr.x2]="width" [attr.y1]="y" [attr.y2]="y" />
        }
        @for (line of paths(); track line.key) {
          <path class="series" [attr.d]="line.d" [attr.stroke]="line.colour" />
        }
      </svg>

      <div class="legend small">
        @for (line of series(); track line.key) {
          <span class="item">
            <span class="swatch" [style.background]="line.colour"></span>{{ line.label }}
          </span>
        }
        <span class="subtle range">{{ firstLabel() }} → {{ lastLabel() }}</span>
      </div>
    }
  `,
  styles: [
    `
      .line-chart {
        width: 100%;
        height: 180px;
        display: block;
        overflow: visible;
      }

      .grid {
        stroke: var(--border);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
      }

      .series {
        fill: none;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        /* Without this the horizontal stretch would thicken the stroke too. */
        vector-effect: non-scaling-stroke;
      }

      .legend {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.85rem;
        margin-top: 0.6rem;
      }

      .item {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
      }

      .swatch {
        width: 10px;
        height: 10px;
        border-radius: 2px;
      }

      .range {
        margin-left: auto;
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class LineChartComponent {
  readonly series = input<LineSeries[]>([]);

  protected readonly width = 600;
  protected readonly chartHeight = 180;
  protected readonly gridLines = [10, 55, 100, 145, 170];

  readonly hasData = computed(() =>
    this.series().some((line) => line.points.some((point) => point.value > 0)),
  );

  private readonly max = computed(() =>
    Math.max(1, ...this.series().flatMap((line) => line.points.map((point) => point.value))),
  );

  readonly paths = computed(() =>
    this.series().map((line) => ({
      key: line.key,
      colour: line.colour,
      d: this.toPath(line.points),
    })),
  );

  readonly firstLabel = computed(() => this.series()[0]?.points[0]?.label ?? '');
  readonly lastLabel = computed(() => {
    const points = this.series()[0]?.points ?? [];
    return points[points.length - 1]?.label ?? '';
  });

  readonly ariaLabel = computed(
    () => `Trend chart: ${this.series().map((line) => line.label).join(', ')}`,
  );

  private toPath(points: SeriesPoint[]): string {
    if (points.length === 0) return '';
    const max = this.max();
    const step = points.length > 1 ? this.width / (points.length - 1) : 0;
    const top = 10;
    const usable = this.chartHeight - 20;

    return points
      .map((point, index) => {
        const x = index * step;
        const y = top + usable - (point.value / max) * usable;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }
}

/** A horizontal proportion bar, used for interests, segments and locations. */
@Component({
  selector: 'app-share-bars',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ul class="shares">
      @for (row of rows(); track row.label) {
        <li>
          <span class="name truncate">{{ row.label }}</span>
          <span class="track">
            <span class="fill" [style.width.%]="width(row.value)"></span>
          </span>
          <span class="value small">{{ suffix() === '%' ? row.value : (row.value | number) }}{{ suffix() }}</span>
        </li>
      }
    </ul>
  `,
  styles: [
    `
      .shares {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      li {
        display: grid;
        grid-template-columns: minmax(6rem, 9rem) minmax(0, 1fr) 4rem;
        align-items: center;
        gap: 0.7rem;
      }

      .name {
        font-size: 0.88rem;
        font-weight: 560;
      }

      .track {
        background: var(--surface-alt);
        border-radius: 999px;
        height: 10px;
        overflow: hidden;
      }

      .fill {
        display: block;
        height: 100%;
        border-radius: 999px;
        background: var(--gradient-brand);
        animation: fill var(--slow) var(--ease-out) both;
        transform-origin: left;
      }

      @keyframes fill {
        from {
          transform: scaleX(0);
        }
      }

      .value {
        text-align: right;
        font-variant-numeric: tabular-nums;
        font-weight: 650;
      }

      @media (max-width: 560px) {
        li {
          grid-template-columns: minmax(4.5rem, 7rem) minmax(0, 1fr) 3.2rem;
          gap: 0.45rem;
        }
      }
    `,
  ],
})
export class ShareBarsComponent {
  readonly rows = input<{ label: string; value: number }[]>([]);
  readonly suffix = input('%');

  private readonly max = computed(() => Math.max(1, ...this.rows().map((row) => row.value)));

  width(value: number): number {
    return (value / this.max()) * 100;
  }
}

/** Section wrapper: a titled card with an optional tooltip and actions slot. */
@Component({
  selector: 'app-analytics-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <div class="card-header section-head">
        <div>
          <h2>
            {{ heading() }}
            @if (hint()) {
              <span class="info" [title]="hint()" [attr.aria-label]="hint()">ⓘ</span>
            }
          </h2>
          @if (subtitle()) {
            <p class="small subtle">{{ subtitle() }}</p>
          }
        </div>
        <ng-content select="[actions]" />
      </div>
      <div class="card-body">
        <ng-content />
      </div>
    </section>
  `,
  styles: [
    `
      /* .card-header centres its children; a section head has a subtitle under
         the title, so it aligns to the top instead. */
      .section-head {
        align-items: flex-start;
      }

      h2 {
        margin: 0;
        font-size: 1rem;
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }

      .info {
        cursor: help;
        opacity: 0.55;
        font-size: 0.8rem;
        font-weight: 400;
      }

      p {
        margin: 0.15rem 0 0;
      }
    `,
  ],
})
export class AnalyticsSectionComponent {
  readonly heading = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly hint = input<string | null>(null);
}

/** Loading skeleton grid (§33). */
@Component({
  selector: 'app-analytics-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-stats">
      @for (item of slots(); track item) {
        <div class="skeleton" style="height: 96px"></div>
      }
    </div>
    <div class="skeleton mt-2" [style.height.px]="chartHeight()"></div>
  `,
})
export class AnalyticsSkeletonComponent {
  readonly count = input(6);
  readonly chartHeight = input(220);
  readonly slots = computed(() => Array.from({ length: this.count() }, (_, index) => index));
}
