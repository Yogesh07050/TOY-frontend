import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import {
  AnalyticsOffers,
  AnalyticsOverview,
  BannerStat,
  CategoryStat,
  Funnel,
  GrowthPoint,
  LocationStat,
  Shop,
  ShopAnalytics,
  ShopStat,
} from '../../core/models';
import { PERMISSIONS } from '../../core/permissions';

/** Analytics dashboards (§27). Scope is enforced by the API, not by this page. */
@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './analytics.component.html',
  styleUrl: './dashboard.component.scss',
})
export class AnalyticsComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly overview = signal<AnalyticsOverview | null>(null);
  readonly offerStats = signal<AnalyticsOffers | null>(null);
  readonly categories = signal<CategoryStat[]>([]);
  readonly locations = signal<LocationStat[]>([]);
  readonly shopStats = signal<ShopStat[]>([]);
  readonly shopDetail = signal<ShopAnalytics | null>(null);
  readonly shops = signal<Shop[]>([]);
  readonly loading = signal(true);

  // ---- V2 ------------------------------------------------------------------
  readonly funnel = signal<Funnel | null>(null);
  readonly bannerStats = signal<BannerStat[]>([]);
  readonly growth = signal<GrowthPoint[]>([]);
  readonly canSeeBanners = this.auth.has(PERMISSIONS.VIEW_BANNERS);

  /** Time filters from §22. 'custom' reveals the two date inputs. */
  readonly ranges = [
    { value: 1, label: 'Today' },
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
  ];
  useCustom = false;
  from = '';
  to = '';

  days = 30;
  shopId: number | null = null;

  constructor() {
    this.api.listShops({ mine: !this.auth.isSuperAdmin, limit: 100, status: 'all' }).subscribe({
      next: (page) => {
        this.shops.set(page.items);
        // An Admin with exactly one shop gets its branch breakdown by default.
        if (!this.auth.isSuperAdmin && page.items.length === 1) {
          this.shopId = page.items[0].id;
          this.loadShopDetail();
        }
      },
      error: () => undefined,
    });
    this.load();
  }

  /** The active window, as the API expects it. */
  private rangeQuery(): Record<string, unknown> {
    return this.useCustom && this.from && this.to
      ? { from: this.from, to: this.to }
      : { days: this.days };
  }

  setRange(days: number): void {
    this.useCustom = false;
    this.days = days;
    this.load();
  }

  applyCustomRange(): void {
    if (this.from && this.to) this.load();
  }

  load(): void {
    this.loading.set(true);
    const query = { ...this.rangeQuery(), shopId: this.shopId ?? undefined, limit: 10 };

    this.api.analyticsOverview(query).subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.api.analyticsOffers(query).subscribe({
      next: (stats) => this.offerStats.set(stats),
      error: () => undefined,
    });
    this.api.analyticsCategories(query).subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => undefined,
    });
    this.api.analyticsLocations(query).subscribe({
      next: (locations) => this.locations.set(locations),
      error: () => undefined,
    });
    this.api.analyticsShops(query).subscribe({
      next: (shops) => this.shopStats.set(shops),
      error: () => undefined,
    });

    // §24 funnel and §12 banner performance.
    this.api.analyticsFunnel(query).subscribe({
      next: (funnel) => this.funnel.set(funnel),
      error: () => this.funnel.set(null),
    });

    if (this.canSeeBanners) {
      this.api.bannerAnalytics(query).subscribe({
        next: (stats) => this.bannerStats.set(stats),
        error: () => this.bannerStats.set([]),
      });
    }

    // Platform growth is Super Admin only (§23).
    if (this.auth.isSuperAdmin) {
      this.api.analyticsGrowth(query).subscribe({
        next: (result) => this.growth.set(result.timeline),
        error: () => this.growth.set([]),
      });
    }

    this.loadShopDetail();
  }

  /** Funnel bar width, relative to the widest stage. */
  funnelWidth(value: number): number {
    const stages = this.funnel()?.stages ?? [];
    const max = Math.max(1, ...stages.map((stage) => stage.value));
    // Floor at 2% so a non-zero stage is still visible next to a huge one.
    return value === 0 ? 0 : Math.max(2, Math.round((value / max) * 100));
  }

  growthHeight(value: number): number {
    const max = Math.max(1, ...this.growth().flatMap((d) => [d.customers, d.offers, d.claims]));
    return Math.round((value / max) * 100);
  }

  loadShopDetail(): void {
    if (!this.shopId) {
      this.shopDetail.set(null);
      return;
    }
    this.api.analyticsShop(this.shopId).subscribe({
      next: (detail) => this.shopDetail.set(detail),
      error: () => this.shopDetail.set(null),
    });
  }

  onScopeChange(): void {
    this.load();
  }

  barHeight(value: number): number {
    const timeline = this.offerStats()?.timeline ?? [];
    const max = Math.max(1, ...timeline.map((day) => Math.max(day.views, day.created)));
    return Math.round((value / max) * 100);
  }

  shortDay(value: string): string {
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  /** Click-through rate, the useful derived number for shop staff. */
  ctr(views: number, clicks: number): string {
    if (!views) return '—';
    return `${((clicks / views) * 100).toFixed(1)}%`;
  }
}
