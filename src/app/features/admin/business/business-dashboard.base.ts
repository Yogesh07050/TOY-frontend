import { DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/api.service';
import { BusinessFilters } from '../../../core/models';
import { BusinessFiltersService } from './business-filters.service';

/**
 * Shared plumbing for the Business Dashboard pages.
 *
 * The merchant analytics equivalent (`PremiumDashboard`) also handles a plan
 * gate, which has no meaning here: a Super Admin does not subscribe to
 * anything. What is left is the part §52 asks every screen to get right -
 * loading, error and retry as first-class states rather than a spinner that
 * either stops or does not.
 *
 * `failure` deliberately keeps the request reference the API returned on a 5xx
 * (§57), so the person looking at the broken page is the one who can quote it.
 */
export abstract class BusinessDashboard<T> {
  protected readonly api = inject(ApiService);
  protected readonly filters = inject(BusinessFiltersService);
  private readonly destroyRef = inject(DestroyRef);

  readonly data = signal<T | null>(null);
  readonly loading = signal(true);
  readonly failure = signal<{ message: string; requestId: string | null; offline: boolean } | null>(
    null,
  );

  protected abstract fetch(filters: BusinessFilters): Observable<T>;

  /** Call from the subclass constructor to reload whenever a filter changes. */
  protected watchFilters(): void {
    effect(() => {
      this.filters.signature();
      this.load();
    });
  }

  load(): void {
    this.loading.set(true);
    this.failure.set(null);

    this.fetch(this.filters.query())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const body = error.error?.error;
          this.failure.set({
            // Status 0 is the browser refusing to make the request at all -
            // almost always no network. §36 wants that said plainly rather
            // than dressed up as a server problem.
            offline: error.status === 0,
            message:
              error.status === 0
                ? 'You’re offline. Some features may not be available right now.'
                : (body?.message ?? 'We couldn’t load this report. Please try again.'),
            requestId: body?.requestId ?? null,
          });
          this.loading.set(false);
        },
      });
  }

  // ---- Formatting ---------------------------------------------------------
  // Indian grouping throughout, matching the rest of the admin area.

  count(value: number | null | undefined): string {
    return (value ?? 0).toLocaleString('en-IN');
  }

  /** An em dash rather than "0%" where there was no denominator to divide by. */
  percent(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : `${value}%`;
  }

  decimal(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : value.toFixed(2);
  }

  rupees(value: number | null | undefined): string {
    return value === null || value === undefined ? '—' : `₹${value.toLocaleString('en-IN')}`;
  }

  /** Signed rupees, for the MRR movement rows where direction is the point. */
  signedRupees(value: number | null | undefined): string {
    const amount = value ?? 0;
    if (amount === 0) return '₹0';
    return `${amount > 0 ? '+' : '−'}₹${Math.abs(amount).toLocaleString('en-IN')}`;
  }

  dayLabel(day: string): string {
    const date = new Date(day);
    return Number.isNaN(date.getTime())
      ? day
      : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  /** "2026-08" -> "Aug 2026", for the retention cohort rows. */
  monthLabel(cohort: string): string {
    const date = new Date(`${cohort}-01T00:00:00Z`);
    return Number.isNaN(date.getTime())
      ? cohort
      : date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
}
