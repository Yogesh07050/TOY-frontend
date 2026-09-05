import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../../core/api.service';
import { ToastService } from '../../../core/toast.service';
import { ResolvedVisibility, Shop, VisibilityEntitlement, VisibilityLevel } from '../../../core/models';

/**
 * Super Admin → Visibility entitlements (§23).
 *
 * §23's free-launch grant: give a merchant Business or Premium *visibility*
 * without payment, with a reason and an expiry.
 *
 * This is not the feature-override screen and not a subscription change.
 * Granting here bills nobody, creates no Razorpay subscription, and leaves the
 * merchant on whatever plan they are actually paying for — it only raises what
 * they are eligible for. That separation is the whole point of §23: the
 * platform can be generous during launch without producing a wrong invoice.
 *
 * A level is deliberately not a boolean. "Founding Merchant, Premium
 * visibility, until 31 Dec 2026" is a rank, a reason and a date, and a flag
 * would lose all three — which is why this exists alongside feature overrides
 * rather than inside them.
 */
@Component({
  selector: 'app-visibility-entitlements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Visibility entitlements</h1>
          <p class="subtitle">
            Grant a merchant enhanced or priority visibility without changing what they pay.
          </p>
        </div>
      </div>

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
            @if (resolved()) {
              <button type="button" class="btn btn-secondary btn-sm" (click)="clear()">Clear</button>
            }
          </div>

          @if (shopResults().length && !resolved()) {
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

      @if (resolved(); as current) {
        <section class="card mb-2">
          <div class="card-header">
            <h2>{{ selectedName() }}</h2>
            <p class="small subtle">
              Paying for <span class="badge badge-brand">{{ current.planKey }}</span>
              · effective visibility
              <span class="badge" [class]="levelBadge(current.visibilityLevel)">
                {{ current.visibilityLevel }}
              </span>
              · via {{ current.source }}
            </p>
          </div>
          <div class="card-body">
            @if (current.override) {
              <div class="grant-note mb-2">
                <p class="strong">Active grant: {{ current.override.level }}</p>
                <p class="small subtle">
                  {{ current.override.reason ?? 'No reason recorded' }}
                  @if (current.override.expiresAt) {
                    · expires {{ current.override.expiresAt | date: 'mediumDate' }}
                  } @else {
                    · no expiry
                  }
                  @if (current.override.featuredAccess) {
                    · includes Featured placements
                  }
                </p>
                <button
                  type="button"
                  class="btn btn-danger btn-sm"
                  [disabled]="busy()"
                  (click)="revoke(current.shopId)"
                >
                  Revoke
                </button>
              </div>
            } @else {
              <p class="small subtle mb-2">
                This shop has no visibility grant — its level comes entirely from its plan.
              </p>
            }

            <h3 class="small strong">Grant visibility</h3>
            <div class="grant-grid">
              <div class="field">
                <label for="level">Level</label>
                <select id="level" [(ngModel)]="level">
                  <option value="ENHANCED">Enhanced (Business equivalent)</option>
                  <option value="PRIORITY">Priority (Premium equivalent)</option>
                  <option value="BASIC">Basic (no boost)</option>
                </select>
              </div>
              <div class="field">
                <label for="expires">Expires</label>
                <input id="expires" type="date" [(ngModel)]="expiresAt" />
                <span class="hint">Leave empty for an open-ended grant.</span>
              </div>
              <div class="field">
                <label for="reason">Reason</label>
                <input id="reason" type="text" [(ngModel)]="reason" placeholder="Founding Merchant" />
              </div>
              <label class="check">
                <input type="checkbox" [(ngModel)]="featuredAccess" />
                <span>Also allow Featured placements</span>
              </label>
            </div>

            <button type="button" class="btn" [disabled]="busy()" (click)="grant(current.shopId)">
              Grant
            </button>
            <p class="small subtle mt-1">
              This changes nothing about billing. The merchant stays on {{ current.planKey }} and is
              charged exactly as before.
            </p>
          </div>
        </section>
      }

      <section class="card">
        <div class="card-header">
          <h2>All grants</h2>
          <select [ngModel]="statusFilter()" (ngModelChange)="setStatus($event)" aria-label="Status">
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
            <option value="">All</option>
          </select>
        </div>
        <div class="card-body">
          @if (!grants().length) {
            <p class="small subtle">No grants match this filter.</p>
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Shop</th>
                    <th>Level</th>
                    <th>Featured</th>
                    <th>Reason</th>
                    <th>Expires</th>
                    <th>Granted by</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (grant of grants(); track grant.id) {
                    <tr>
                      <td class="strong">{{ grant.shopName }}</td>
                      <td>
                        <span class="badge" [class]="levelBadge(grant.level)">{{ grant.level }}</span>
                      </td>
                      <td>{{ grant.featuredAccess ? 'Yes' : 'No' }}</td>
                      <td class="reason small">{{ grant.reason ?? '—' }}</td>
                      <td class="small">{{ (grant.expiresAt | date: 'mediumDate') || 'Never' }}</td>
                      <td class="small">{{ grant.grantedByName ?? '—' }}</td>
                      <td>
                        <span class="badge" [class.badge-success]="grant.status === 'active'">
                          {{ grant.status }}
                        </span>
                      </td>
                      <td>
                        <button type="button" class="linklike" (click)="selectShop(grant.shopId)">
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
    </div>
  `,
  styles: [
    `
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
      }

      .grant-note {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 0.75rem 0.9rem;
      }

      .grant-note p {
        margin: 0 0 0.35rem;
      }

      .grant-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
        gap: 0.9rem;
        margin: 0.6rem 0 1rem;
        align-items: end;
      }

      .check {
        display: flex;
        gap: 0.45rem;
        align-items: center;
        font-size: 0.9rem;
      }

      .reason {
        max-width: 16rem;
      }

      .mt-1 {
        margin-top: 0.6rem;
      }
    `,
  ],
})
export class VisibilityEntitlementsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly grants = signal<VisibilityEntitlement[]>([]);
  readonly resolved = signal<ResolvedVisibility | null>(null);
  readonly selectedName = signal('');
  readonly shopResults = signal<Shop[]>([]);
  readonly shopQuery = signal('');
  readonly statusFilter = signal<'active' | 'expired' | 'revoked' | ''>('active');
  readonly busy = signal(false);

  level: VisibilityLevel = 'PRIORITY';
  reason = '';
  expiresAt = '';
  featuredAccess = true;

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.api
      .visibilityEntitlements({ status: this.statusFilter() || undefined, limit: 100 })
      .subscribe({ next: (rows) => this.grants.set(rows), error: () => undefined });
  }

  setStatus(status: 'active' | 'expired' | 'revoked' | ''): void {
    this.statusFilter.set(status);
    this.reload();
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

  /**
   * `knownName` is passed by callers that already have it - re-selecting after
   * a grant used to fall back to "Shop #3", because the name is looked up in
   * the search results and the grants list, and both are momentarily stale
   * while the write is still settling.
   */
  selectShop(shopId: number, knownName?: string): void {
    this.api.resolvedVisibility(shopId).subscribe({
      next: (current) => {
        this.resolved.set(current);
        this.selectedName.set(
          knownName ??
            this.shopResults().find((shop) => shop.id === shopId)?.name ??
            this.grants().find((grant) => grant.shopId === shopId)?.shopName ??
            this.selectedName() ??
            `Shop #${shopId}`,
        );
        this.shopResults.set([]);
        // Pre-fill with what is already granted, so "extend by six months" is
        // an edit rather than a retype — and a mistyped level cannot silently
        // downgrade a merchant who was on Priority.
        this.level = current.override?.level ?? 'PRIORITY';
        this.reason = current.override?.reason ?? '';
        this.featuredAccess = current.override?.featuredAccess ?? true;
        this.expiresAt = current.override?.expiresAt?.slice(0, 10) ?? '';
      },
      error: () => this.toast.error('That shop could not be loaded.'),
    });
  }

  clear(): void {
    this.resolved.set(null);
    this.shopQuery.set('');
    this.selectedName.set('');
  }

  levelBadge(level: VisibilityLevel): string {
    if (level === 'PRIORITY') return 'badge-brand';
    if (level === 'ENHANCED') return 'badge-info';
    return '';
  }

  grant(shopId: number): void {
    this.busy.set(true);
    this.api
      .grantVisibility({
        shopId,
        level: this.level,
        reason: this.reason.trim() || undefined,
        featuredAccess: this.featuredAccess,
        expiresAt: this.expiresAt || null,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.selectShop(shopId, this.selectedName() || undefined);
          this.reload();
          this.toast.success('Visibility granted.');
        },
        error: () => {
          this.busy.set(false);
          this.toast.error('That grant could not be saved.');
        },
      });
  }

  revoke(shopId: number): void {
    this.busy.set(true);
    this.api.revokeVisibility(shopId).subscribe({
      next: () => {
        this.busy.set(false);
        this.selectShop(shopId, this.selectedName() || undefined);
        this.reload();
        this.toast.success('Grant revoked. The merchant keeps their plan and their data.');
      },
      error: () => {
        this.busy.set(false);
        this.toast.error('That grant could not be revoked.');
      },
    });
  }
}
