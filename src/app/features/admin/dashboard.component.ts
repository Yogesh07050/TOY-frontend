import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import {
  AnalyticsOffers,
  AnalyticsOverview,
  AuditLog,
  CategoryStat,
  LocationStat,
  ShopStat,
} from '../../core/models';
import { PERMISSIONS } from '../../core/permissions';

/** Super Admin and Admin dashboards (§41). The API scopes the data itself. */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly overview = signal<AnalyticsOverview | null>(null);
  readonly offerStats = signal<AnalyticsOffers | null>(null);
  readonly categories = signal<CategoryStat[]>([]);
  readonly locations = signal<LocationStat[]>([]);
  readonly topShops = signal<ShopStat[]>([]);
  readonly recentActivity = signal<AuditLog[]>([]);
  readonly loading = signal(true);

  readonly canSeeAnalytics = this.auth.has(PERMISSIONS.VIEW_ANALYTICS);

  constructor() {
    if (!this.canSeeAnalytics) {
      this.loading.set(false);
      return;
    }

    this.api.analyticsOverview().subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.api.analyticsOffers({ days: 30, limit: 5 }).subscribe({
      next: (stats) => this.offerStats.set(stats),
      error: () => undefined,
    });

    this.api.analyticsCategories({ limit: 5 }).subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => undefined,
    });

    this.api.analyticsLocations({ limit: 5 }).subscribe({
      next: (locations) => this.locations.set(locations),
      error: () => undefined,
    });

    if (this.auth.isSuperAdmin) {
      this.api.analyticsShops({ limit: 5 }).subscribe({
        next: (shops) => this.topShops.set(shops),
        error: () => undefined,
      });
    }

    // Recent activity comes from the audit trail, so it is Super Admin only.
    if (this.auth.has(PERMISSIONS.VIEW_AUDIT_LOGS)) {
      this.api.listAuditLogs({ limit: 8 }).subscribe({
        next: (page) => this.recentActivity.set(page.items),
        error: () => undefined,
      });
    }
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  get firstName(): string {
    return this.auth.user()?.name.split(' ')[0] ?? '';
  }

  /** The shop this Admin manages, used for the quick links. */
  get primaryShopId(): number | null {
    const shops = this.auth.user()?.shops ?? [];
    return shops.length ? shops[0].shopId : null;
  }

  formatAction(action: string): string {
    return action.toLowerCase().replace(/_/g, ' ');
  }

  timeAgo(value: string): string {
    const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  /** Bar height as a percentage of the busiest day in the window. */
  barHeight(value: number): number {
    const timeline = this.offerStats()?.timeline ?? [];
    const max = Math.max(1, ...timeline.map((day) => day.views + day.created));
    return Math.round((value / max) * 100);
  }

  shortDay(value: string): string {
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
}
