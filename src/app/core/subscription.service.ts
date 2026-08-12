import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Entitlements, FeatureName, PlanCatalogue, PlanKey } from './models';

/**
 * The signed-in merchant's subscription state (V3 §2, §31).
 *
 * Loaded once for every shop the user manages and held in signals, so a lock
 * icon or an upgrade prompt can be rendered synchronously anywhere in the admin
 * area without each component fetching its own copy.
 *
 * This drives presentation only. The API enforces every entitlement
 * independently (§30) — hiding a control here is never the access check.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  private readonly entitlements = signal<Entitlements[]>([]);
  private readonly catalogue = signal<PlanCatalogue | null>(null);
  private readonly loaded = signal(false);
  /** Set while a load is in flight, so several components asking at once
      produce one request rather than one each. */
  private inFlight = false;

  /** The shop the admin area is currently acting for; null means "all mine". */
  readonly activeShopId = signal<number | null>(null);

  readonly all = this.entitlements.asReadonly();
  readonly plans = this.catalogue.asReadonly();
  readonly isLoaded = this.loaded.asReadonly();

  /**
   * The entitlement in force right now: the selected shop, or the merchant's
   * best plan when they manage several and have not narrowed to one. Taking the
   * best is what stops a Premium merchant's second Free shop from hiding the
   * analytics they pay for — the API still scopes the data per shop.
   */
  readonly current = computed<Entitlements | null>(() => {
    const rows = this.entitlements();
    if (rows.length === 0) return null;

    const selected = this.activeShopId();
    if (selected !== null) return rows.find((row) => row.shopId === selected) ?? null;

    return [...rows].sort((a, b) => this.rankOf(b.plan) - this.rankOf(a.plan))[0];
  });

  readonly plan = computed<PlanKey>(() => this.current()?.plan ?? 'FREE');
  readonly planName = computed(() => this.current()?.planName ?? 'Free');
  readonly isPremium = computed(() => this.plan() === 'PREMIUM');

  /** True when a paid plan is awaiting payment, which the UI flags rather than hides. */
  readonly paymentPending = computed(() => this.current()?.paymentStatus === 'pending');

  constructor() {
    // Entitlements belong to a session, so they are dropped the moment the
    // signed-in user changes - otherwise the next user inherits the last one's
    // plan until something happens to refresh it.
    effect(() => {
      const user = this.auth.user();
      if (!user) this.reset();
      else this.load(true);
    });
  }

  private rankOf(plan: PlanKey): number {
    return { FREE: 0, BUSINESS: 1, PREMIUM: 2 }[plan] ?? 0;
  }

  /** Loads entitlements and the plan catalogue. Safe to call repeatedly. */
  load(force = false): void {
    if (!force && this.loaded()) return;
    if (this.inFlight) return;
    if (!this.auth.isAuthenticated()) return;

    this.inFlight = true;
    this.api.myEntitlements().subscribe({
      next: (rows) => {
        this.entitlements.set(rows);
        this.loaded.set(true);
        this.inFlight = false;
      },
      // A merchant with no shops is a supported state, not an error to surface.
      error: () => {
        this.loaded.set(true);
        this.inFlight = false;
      },
    });

    if (!this.catalogue()) {
      this.api.planCatalogue().subscribe({
        next: (catalogue) => this.catalogue.set(catalogue),
        error: () => undefined,
      });
    }
  }

  /** Clears cached state — called on sign-out so the next user starts clean. */
  reset(): void {
    this.entitlements.set([]);
    this.loaded.set(false);
    this.inFlight = false;
    this.activeShopId.set(null);
  }

  /** Whether the plan in force includes `feature`. Super Admins are never gated. */
  has(feature: FeatureName): boolean {
    if (this.auth.isSuperAdmin) return true;
    return this.current()?.features.includes(feature) ?? false;
  }

  /** Whether a specific shop's plan includes `feature`. */
  shopHas(shopId: number, feature: FeatureName): boolean {
    if (this.auth.isSuperAdmin) return true;
    return this.entitlements().find((row) => row.shopId === shopId)?.features.includes(feature) ?? false;
  }

  /** The cheapest plan that includes `feature`, for wording an upgrade prompt. */
  requiredPlanFor(feature: FeatureName): { key: PlanKey; name: string; price: number } | null {
    const catalogue = this.catalogue();
    if (!catalogue) return { key: 'PREMIUM', name: 'Premium', price: 2500 };

    const match = [...catalogue.plans]
      .sort((a, b) => a.rank - b.rank)
      .find((plan) => plan.features.includes(feature));
    return match ? { key: match.key, name: match.name, price: match.price } : null;
  }

  /** Human label for a feature, from the catalogue the API serves. */
  labelFor(feature: FeatureName): string {
    return this.catalogue()?.featureLabels[feature] ?? feature;
  }

  changePlan(shopId: number, plan: PlanKey): Observable<Entitlements> {
    return this.api.changePlan(shopId, plan).pipe(tap(() => this.load(true)));
  }

  confirmPayment(shopId: number): Observable<Entitlements> {
    return this.api.confirmSubscriptionPayment(shopId).pipe(tap(() => this.load(true)));
  }

  cancel(shopId: number, note?: string): Observable<Entitlements> {
    return this.api.cancelSubscription(shopId, note).pipe(tap(() => this.load(true)));
  }
}
