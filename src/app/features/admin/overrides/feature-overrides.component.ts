import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../../core/api.service';
import { ToastService } from '../../../core/toast.service';
import {
  CatalogueFeature,
  FeatureOverride,
  FeatureOverrideEvent,
  FeatureOverrideSummary,
  Shop,
  ShopOverrideOverview,
} from '../../../core/models';

type StatusFilter = '' | 'active' | 'expired' | 'permanent' | 'revoked';

/**
 * Super Admin → Feature Overrides (§11C, §11M).
 *
 * Grants a catalogue feature to one shop independently of what it pays for.
 * Everything here is Super Admin-only and the API enforces that on every call
 * (§11L) — this page never becomes the access check.
 *
 * An override is not a subscription: granting one bills nobody and creates no
 * Razorpay subscription, and revoking one leaves the merchant's plan and data
 * untouched (§11O, §11H).
 */
@Component({
  selector: 'app-feature-overrides',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Feature overrides</h1>
          <p class="subtitle">
            Grant individual features to a merchant without changing their subscription.
          </p>
        </div>
      </div>

      <!-- §11M dashboard tiles -->
      @if (summary(); as stats) {
        <div class="tiles mb-2">
          <div class="tile">
            <p class="value">{{ stats.activeOverrides }}</p>
            <p class="label">Active overrides</p>
          </div>
          <div class="tile">
            <p class="value">{{ stats.expiringThisWeek }}</p>
            <p class="label">Expiring this week</p>
          </div>
          <div class="tile">
            <p class="value">{{ stats.permanentOverrides }}</p>
            <p class="label">Permanent</p>
          </div>
          <div class="tile">
            <p class="value">{{ stats.expiredOverrides }}</p>
            <p class="label">Expired</p>
          </div>
        </div>

        @if (stats.mostGranted.length) {
          <section class="card mb-2">
            <div class="card-header"><h2>Most granted features</h2></div>
            <div class="card-body">
              <ul class="ranked small">
                @for (row of stats.mostGranted; track row.featureKey) {
                  <li>
                    <span>{{ row.featureName }}</span>
                    <span class="strong">{{ row.count }}</span>
                  </li>
                }
              </ul>
            </div>
          </section>
        }
      }

      <!-- §11C: search admins / shops, then work on one -->
      <section class="card mb-2">
        <div class="card-header"><h2>Select a shop</h2></div>
        <div class="card-body">
          <div class="row gap">
            <input
              type="search"
              placeholder="Search shops by name"
              [ngModel]="shopQuery()"
              (ngModelChange)="searchShops($event)"
              aria-label="Search shops"
            />
            @if (selected(); as overview) {
              <button type="button" class="btn btn-secondary btn-sm" (click)="clearSelection()">
                Clear
              </button>
            }
          </div>

          @if (shopResults().length && !selected()) {
            <ul class="results small">
              @for (shop of shopResults(); track shop.id) {
                <li>
                  <button type="button" class="linklike" (click)="selectShop(shop.id)">
                    {{ shop.name }}
                  </button>
                </li>
              }
            </ul>
          }
        </div>
      </section>

      @if (selected(); as overview) {
        <section class="card mb-2">
          <div class="card-header">
            <h2>{{ overview.shopName }}</h2>
            <p class="small subtle">
              Current plan:
              <span class="badge badge-brand">{{ overview.subscription.planName }}</span>
              · {{ overview.subscription.status }}
              @if (overview.subscription.renewsAt) {
                · renews {{ overview.subscription.renewsAt | date: 'mediumDate' }}
              }
            </p>
          </div>

          <div class="card-body">
            <!-- Grant form (§11E: temporary or permanent, with a reason) -->
            <form class="grant" (ngSubmit)="grant(overview)">
              <label>
                Feature
                <select [(ngModel)]="featureKey" name="featureKey" required>
                  <option value="">Choose a feature…</option>
                  @for (group of groupedCatalogue(); track group.category) {
                    <optgroup [label]="group.category">
                      @for (feature of group.features; track feature.featureKey) {
                        <option [value]="feature.featureKey">{{ feature.name }}</option>
                      }
                    </optgroup>
                  }
                </select>
              </label>

              <label class="check">
                <input type="checkbox" [(ngModel)]="isPermanent" name="isPermanent" />
                Permanent access
              </label>

              <label>
                Starts
                <input type="date" [(ngModel)]="startsAt" name="startsAt" />
              </label>

              <label>
                Expires
                <input
                  type="date"
                  [(ngModel)]="expiresAt"
                  name="expiresAt"
                  [disabled]="isPermanent"
                  [required]="!isPermanent"
                />
              </label>

              <label class="wide">
                Internal reason
                <input
                  type="text"
                  [(ngModel)]="reason"
                  name="reason"
                  maxlength="500"
                  placeholder="Diwali campaign, founding merchant, pilot…"
                />
              </label>

              <button type="submit" class="btn" [disabled]="busy() || !featureKey">
                Grant feature
              </button>
            </form>

            <p class="small subtle mt-1">
              Granting a feature does not create or change a Razorpay subscription, and does not
              bill the merchant.
            </p>
          </div>
        </section>

        <!-- Current access: plan features and grants, side by side (§11C) -->
        <div class="split mb-2">
          <section class="card">
            <div class="card-header"><h2>Included in their plan</h2></div>
            <div class="card-body">
              @if (!overview.planFeatures.length) {
                <p class="small subtle">The Free plan includes no advanced features.</p>
              } @else {
                <ul class="features small">
                  @for (feature of overview.planFeatures; track feature) {
                    <li>{{ nameFor(feature) }}</li>
                  }
                </ul>
              }
            </div>
          </section>

          <section class="card">
            <div class="card-header"><h2>Feature overrides</h2></div>
            <div class="card-body">
              @if (!overview.overrides.length) {
                <p class="small subtle">No overrides have been granted to this shop.</p>
              } @else {
                <ul class="grants small">
                  @for (override of overview.overrides; track override.id) {
                    <li>
                      <div>
                        <p class="strong">
                          {{ override.featureName }}
                          <span class="badge" [class]="statusBadge(override)">
                            {{ override.status }}
                          </span>
                        </p>
                        <p class="subtle">
                          {{
                            override.isPermanent
                              ? 'Permanent'
                              : override.expiresAt
                                ? 'Expires ' + (override.expiresAt | date: 'mediumDate')
                                : 'No expiry set'
                          }}
                          @if (override.grantedByName) {
                            · granted by {{ override.grantedByName }}
                          }
                        </p>
                        @if (override.reason) {
                          <p class="subtle">{{ override.reason }}</p>
                        }
                      </div>
                      @if (override.status === 'active') {
                        <button
                          type="button"
                          class="btn btn-danger btn-sm"
                          [disabled]="busy()"
                          (click)="revoke(overview, override)"
                        >
                          Revoke
                        </button>
                      }
                    </li>
                  }
                </ul>
              }
            </div>
          </section>
        </div>

        <!-- §11I audit trail -->
        <section class="card">
          <div class="card-header"><h2>Override history</h2></div>
          <div class="card-body">
            @if (!history().length) {
              <p class="small subtle">No override activity recorded for this shop yet.</p>
            } @else {
              <ul class="history small">
                @for (event of history(); track event.id) {
                  <li>
                    <span class="badge" [class]="actionBadge(event.action)">{{ event.action }}</span>
                    <div>
                      <p class="strong">{{ event.featureName }}</p>
                      <p class="subtle">
                        {{ event.createdAt | date: 'medium' }}
                        @if (event.actorName) {
                          · {{ event.actorName }}
                        }
                        @if (event.expiresAt) {
                          · expires {{ event.expiresAt | date: 'mediumDate' }}
                        }
                        @if (event.reason) {
                          · {{ event.reason }}
                        }
                      </p>
                    </div>
                  </li>
                }
              </ul>
            }
          </div>
        </section>
      } @else {
        <!-- No shop chosen: the platform-wide list, filterable per §11M -->
        <section class="card">
          <div class="card-header">
            <h2>All overrides</h2>
            <div class="row gap">
              <select [ngModel]="statusFilter()" (ngModelChange)="filterBy($event)" aria-label="Status">
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="permanent">Permanent</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
              </select>
              <select
                [ngModel]="featureFilter()"
                (ngModelChange)="filterByFeature($event)"
                aria-label="Feature"
              >
                <option value="">All features</option>
                @for (feature of catalogue(); track feature.featureKey) {
                  <option [value]="feature.featureKey">{{ feature.name }}</option>
                }
              </select>
            </div>
          </div>
          <div class="card-body">
            @if (loading()) {
              <div class="skeleton" style="height: 140px"></div>
            } @else if (!overrides().length) {
              <p class="small subtle">No overrides match these filters.</p>
            } @else {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Shop</th>
                      <th>Feature</th>
                      <th>Status</th>
                      <th>Expires</th>
                      <th>Granted by</th>
                      <th>Reason</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (override of overrides(); track override.id) {
                      <tr>
                        <td>{{ override.shopName }}</td>
                        <td>{{ override.featureName }}</td>
                        <td>
                          <span class="badge" [class]="statusBadge(override)">
                            {{ override.status }}
                          </span>
                        </td>
                        <td>
                          {{
                            override.isPermanent
                              ? 'Never'
                              : (override.expiresAt | date: 'mediumDate') || '—'
                          }}
                        </td>
                        <td>{{ override.grantedByName ?? '—' }}</td>
                        <td class="reason">{{ override.reason ?? '—' }}</td>
                        <td>
                          <button
                            type="button"
                            class="linklike"
                            (click)="selectShop(override.shopId)"
                          >
                            Manage
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
      }
    </div>
  `,
  styles: [
    `
      .tiles {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
        gap: 0.75rem;
      }

      .tile {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 0.9rem 1rem;
      }

      .tile .value {
        margin: 0;
        font-size: 1.7rem;
        font-weight: 780;
        font-variant-numeric: tabular-nums;
      }

      .tile .label {
        margin: 0.1rem 0 0;
        color: var(--text-muted);
        font-size: 0.78rem;
      }

      .row.gap {
        display: flex;
        gap: 0.6rem;
        align-items: center;
        flex-wrap: wrap;
      }

      .results {
        list-style: none;
        margin: 0.7rem 0 0;
        padding: 0;
        display: grid;
        gap: 0.3rem;
      }

      .linklike {
        background: none;
        border: none;
        padding: 0;
        color: var(--brand);
        font: inherit;
        cursor: pointer;
        text-decoration: underline;
      }

      .grant {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
        gap: 0.75rem;
        align-items: end;
      }

      .grant .wide {
        grid-column: 1 / -1;
      }

      .grant .check {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        white-space: nowrap;
      }

      .split {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
        align-items: start;
      }

      .features,
      .grants,
      .ranked,
      .history {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .grants li,
      .history li,
      .ranked li {
        display: flex;
        gap: 0.7rem;
        align-items: flex-start;
        justify-content: space-between;
        padding: 0.55rem 0;
        border-bottom: 1px solid var(--border);
      }

      .history li {
        justify-content: flex-start;
      }

      .grants li:last-child,
      .history li:last-child,
      .ranked li:last-child {
        border-bottom: none;
      }

      .grants p,
      .history p {
        margin: 0;
      }

      .reason {
        max-width: 16rem;
      }

      @media (max-width: 800px) {
        .split {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
  ],
})
export class FeatureOverridesComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly summary = signal<FeatureOverrideSummary | null>(null);
  readonly catalogue = signal<CatalogueFeature[]>([]);
  readonly overrides = signal<FeatureOverride[]>([]);
  readonly history = signal<FeatureOverrideEvent[]>([]);
  readonly selected = signal<ShopOverrideOverview | null>(null);
  readonly shopResults = signal<Shop[]>([]);
  readonly shopQuery = signal('');
  readonly statusFilter = signal<StatusFilter>('');
  readonly featureFilter = signal('');
  readonly loading = signal(true);
  readonly busy = signal(false);

  // Grant form state.
  featureKey = '';
  isPermanent = false;
  startsAt = '';
  expiresAt = '';
  reason = '';

  /** The catalogue grouped for the <optgroup>s, so a long list stays scannable. */
  readonly groupedCatalogue = computed(() => {
    const groups = new Map<string, CatalogueFeature[]>();
    for (const feature of this.catalogue()) {
      const list = groups.get(feature.category) ?? [];
      list.push(feature);
      groups.set(feature.category, list);
    }
    return [...groups.entries()].map(([category, features]) => ({ category, features }));
  });

  constructor() {
    this.api.overrideCatalogue().subscribe({
      next: (result) => this.catalogue.set(result.features),
      error: () => undefined,
    });
    this.reloadSummary();
    this.reloadList();
  }

  private reloadSummary(): void {
    this.api.overrideSummary().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => undefined,
    });
  }

  private reloadList(): void {
    this.loading.set(true);
    this.api
      .listOverrides({
        limit: 50,
        status: this.statusFilter() || undefined,
        featureKey: this.featureFilter() || undefined,
      })
      .subscribe({
        next: (page) => {
          this.overrides.set(page.items);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  filterBy(status: StatusFilter): void {
    this.statusFilter.set(status);
    this.reloadList();
  }

  filterByFeature(featureKey: string): void {
    this.featureFilter.set(featureKey);
    this.reloadList();
  }

  searchShops(query: string): void {
    this.shopQuery.set(query);
    if (query.trim().length < 2) {
      this.shopResults.set([]);
      return;
    }
    this.api.listShops({ search: query, limit: 10 }).subscribe({
      next: (page) => this.shopResults.set(page.items),
      error: () => this.shopResults.set([]),
    });
  }

  selectShop(shopId: number): void {
    this.api.shopOverrides(shopId).subscribe({
      next: (overview) => {
        this.selected.set(overview);
        this.shopResults.set([]);
        this.loadHistory(shopId);
      },
      error: () => this.toast.error('That shop could not be loaded.'),
    });
  }

  private loadHistory(shopId: number): void {
    this.api.overrideHistory({ shopId, limit: 50 }).subscribe({
      next: (events) => this.history.set(events),
      error: () => this.history.set([]),
    });
  }

  clearSelection(): void {
    this.selected.set(null);
    this.history.set([]);
    this.shopQuery.set('');
    this.resetForm();
    this.reloadList();
  }

  private resetForm(): void {
    this.featureKey = '';
    this.isPermanent = false;
    this.startsAt = '';
    this.expiresAt = '';
    this.reason = '';
  }

  grant(overview: ShopOverrideOverview): void {
    if (!this.featureKey) return;
    if (!this.isPermanent && !this.expiresAt) {
      this.toast.error('Set an expiry date, or mark the override permanent.');
      return;
    }

    this.busy.set(true);
    this.api
      .grantOverride(overview.shopId, {
        featureKey: this.featureKey,
        isPermanent: this.isPermanent,
        // Dates are sent as-is; the backend validates and stamps "starts now"
        // with its own clock when no start is given (§11E).
        startsAt: this.startsAt || undefined,
        expiresAt: this.isPermanent ? undefined : this.expiresAt,
        reason: this.reason || undefined,
      })
      .subscribe({
        next: (override) => {
          this.busy.set(false);
          this.toast.success(`${override.featureName} granted to ${overview.shopName}.`);
          this.resetForm();
          this.selectShop(overview.shopId);
          this.reloadSummary();
        },
        error: (error: { error?: { error?: { message?: string } } }) => {
          this.busy.set(false);
          this.toast.error(error?.error?.error?.message ?? 'That feature could not be granted.');
        },
      });
  }

  revoke(overview: ShopOverrideOverview, override: FeatureOverride): void {
    if (
      !confirm(
        `Revoke ${override.featureName} from ${overview.shopName}? ` +
          `Their data is kept — only access to the feature stops.`,
      )
    ) {
      return;
    }

    this.busy.set(true);
    this.api.revokeOverride(overview.shopId, override.featureKey).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(`${override.featureName} revoked.`);
        this.selectShop(overview.shopId);
        this.reloadSummary();
      },
      error: () => {
        this.busy.set(false);
        this.toast.error('That override could not be revoked.');
      },
    });
  }

  nameFor(featureKey: string): string {
    return this.catalogue().find((f) => f.featureKey === featureKey)?.name ?? featureKey;
  }

  statusBadge(override: FeatureOverride): string {
    return (
      { active: 'badge-success', expired: 'badge-muted', revoked: 'badge-danger' }[override.status] ??
      'badge-brand'
    );
  }

  actionBadge(action: FeatureOverrideEvent['action']): string {
    return (
      {
        GRANTED: 'badge-success',
        EXTENDED: 'badge-success',
        MODIFIED: 'badge-brand',
        REVOKED: 'badge-danger',
        EXPIRED: 'badge-muted',
      }[action] ?? 'badge-brand'
    );
  }
}
