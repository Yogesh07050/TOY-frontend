import { DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { SubscriptionService } from '../../../core/subscription.service';
import { AnalyticsFilters, FeatureName, UpgradeRequirement } from '../../../core/models';
import { AnalyticsFiltersService } from './analytics-filters.service';

/**
 * Shared plumbing for the premium dashboards (V3 §7).
 *
 * Every page does the same three things: reload when the shared filters change,
 * show a skeleton while in flight, and swap the whole page for an upgrade
 * prompt when the API answers PLAN_UPGRADE_REQUIRED. Doing that once here keeps
 * each dashboard to its own presentation.
 *
 * The upgrade state is driven by the *API's* answer rather than the locally
 * cached plan: the server is the authority on entitlements (§30), and this way
 * a plan that changed in another tab still produces the right screen.
 */
export abstract class PremiumDashboard<T> {
  protected readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  protected readonly subscriptions = inject(SubscriptionService);
  protected readonly filters = inject(AnalyticsFiltersService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = signal<T | null>(null);
  readonly loading = signal(true);
  readonly upgrade = signal<UpgradeRequirement | null>(null);
  readonly failed = signal<string | null>(null);

  /** The feature this dashboard needs, used to word the upgrade prompt. */
  protected abstract readonly feature: FeatureName;

  /** The request this dashboard makes. */
  protected abstract fetch(filters: AnalyticsFilters): Observable<T>;

  /**
   * Call from the subclass constructor. Reads `filters.signature()` so the
   * effect re-runs whenever any shared filter changes.
   */
  protected watchFilters(): void {
    effect(() => {
      this.filters.signature();
      this.load();
    });
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(null);

    this.fetch(this.filters.query())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.upgrade.set(null);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const body = error.error?.error;
          if (body?.code === 'PLAN_UPGRADE_REQUIRED') {
            this.upgrade.set(body.details as UpgradeRequirement);
            this.data.set(null);
          } else {
            this.failed.set(body?.message ?? 'That report could not be loaded.');
          }
          this.loading.set(false);
        },
      });
  }

  /** Formats a rate for display; a null rate has no denominator to divide by. */
  percent(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : `${value}%`;
  }

  /** Indian-format thousands, which is what the rest of the app uses. */
  count(value: number | null | undefined): string {
    return (value ?? 0).toLocaleString('en-IN');
  }

  rupees(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : `₹${value.toLocaleString('en-IN')}`;
  }

  /** Short day label for chart axes: "2026-08-12" -> "12 Aug". */
  dayLabel(day: string): string {
    const date = new Date(day);
    return Number.isNaN(date.getTime())
      ? day
      : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
}
