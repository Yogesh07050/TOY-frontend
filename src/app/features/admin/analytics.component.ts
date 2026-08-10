import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import {
  AnalyticsOffers,
  AnalyticsOverview,
  CategoryStat,
  LocationStat,
  Shop,
  ShopAnalytics,
  ShopStat,
} from '../../core/models';

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

  load(): void {
    this.loading.set(true);
    const query = { days: this.days, shopId: this.shopId ?? undefined, limit: 10 };

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

    this.loadShopDetail();
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
