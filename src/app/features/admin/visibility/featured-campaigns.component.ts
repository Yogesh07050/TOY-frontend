import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { ToastService } from '../../../core/toast.service';
import { PERMISSIONS } from '../../../core/permissions';
import {
  FeaturedCampaign,
  FeaturedCampaignStatus,
  MerchantSlotOptions,
  Shop,
} from '../../../core/models';

/**
 * Merchant → Featured campaigns (§7, §8, §9, §27).
 *
 * The merchant's own promotional campaigns: what is scheduled, what is running,
 * and — the part that matters most in support — why an approved campaign is not
 * appearing.
 *
 * ## Why every row carries a live eligibility verdict
 *
 * §9's conditions include things that change without anyone touching the
 * campaign: an offer expires, a shop is deactivated, a plan lapses. So a
 * campaign can read `active` and still show nothing. Without the verdict the
 * merchant's only evidence is an empty home page, and their reasonable
 * conclusion is that the platform is broken. With it, they are told "your only
 * offer in this campaign expired" and can fix it in a minute.
 *
 * ## What this screen deliberately cannot do
 *
 * There is no approve button. §22 makes approval a Super Admin action and the
 * API refuses it here, so offering the control would only produce a 403 the
 * merchant cannot act on.
 */
@Component({
  selector: 'app-featured-campaigns',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Featured campaigns</h1>
          <p class="subtitle">Promotional placements for your shop.</p>
        </div>
        @if (options()?.featuredAccess) {
          <a class="btn" routerLink="/admin/featured-campaigns/new">New campaign</a>
        }
      </div>

      @if (shops().length > 1) {
        <div class="row gap mb-2">
          <label class="small subtle" for="shop">Shop</label>
          <select id="shop" [ngModel]="shopId()" (ngModelChange)="selectShop(+$event)">
            @for (shop of shops(); track shop.id) {
              <option [value]="shop.id">{{ shop.name }}</option>
            }
          </select>
        </div>
      }

      <!-- §21: what the plan actually buys, in the platform's own words rather
           than this screen's. Shown before the list so the expectation is set
           before the merchant reads their numbers. -->
      @if (options(); as opts) {
        <section class="card mb-2" [class.locked]="!opts.featuredAccess">
          <div class="card-body promise">
            <div>
              <p class="strong">
                Your visibility level:
                <span class="badge" [class]="levelBadge(opts.visibilityLevel)">
                  {{ opts.visibilityLevel }}
                </span>
              </p>
              <p class="small subtle">{{ opts.promise.explanation }}</p>
              <p class="small subtle">{{ opts.promise.disclaimer }}</p>
            </div>
            @if (!opts.featuredAccess) {
              <a class="btn btn-secondary btn-sm" routerLink="/admin/subscription">
                See plans
              </a>
            }
          </div>
        </section>

        @if (!opts.featuredAccess) {
          <section class="card">
            <div class="card-body">
              <p class="small">
                Featured placements are part of the Premium plan. Your offers still appear in search
                and Near Me — this only adds the promotional spaces.
              </p>
            </div>
          </section>
        }
      }

      @if (options()?.featuredAccess) {
        <section class="card">
          <div class="card-header">
            <h2>Your campaigns</h2>
            <select [ngModel]="filter()" (ngModelChange)="setFilter($event)" aria-label="Status">
              <option value="">All</option>
              <option value="pending_approval">Awaiting review</option>
              <option value="approved">Scheduled</option>
              <option value="active">Running</option>
              <option value="paused">Paused</option>
              <option value="completed">Finished</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div class="card-body">
            @if (loading()) {
              <div class="skeleton" style="height: 180px"></div>
            } @else if (!campaigns().length) {
              <p class="small subtle">
                No campaigns yet.
                <a routerLink="/admin/featured-campaigns/new">Create your first one.</a>
              </p>
            } @else {
              <ul class="list">
                @for (campaign of campaigns(); track campaign.id) {
                  <li>
                    <div class="head">
                      <div>
                        <p class="strong">{{ campaign.name }}</p>
                        <p class="small subtle">
                          {{ campaign.slotName }} ·
                          {{ campaign.startAt | date: 'mediumDate' }} –
                          {{ campaign.endAt | date: 'mediumDate' }}
                        </p>
                      </div>
                      <span class="badge" [class]="statusBadge(campaign.status)">
                        {{ statusText(campaign.status) }}
                      </span>
                    </div>

                    @if (campaign.status === 'rejected' && campaign.rejectionReason) {
                      <p class="small danger">
                        Not approved: {{ campaign.rejectionReason }}
                      </p>
                    }

                    <!-- The verdict that saves a support ticket. -->
                    @if (verdictFor(campaign.id); as verdict) {
                      @if (!verdict.eligible && isLive(campaign.status)) {
                        <div class="verdict">
                          <p class="small strong">This campaign is not showing right now</p>
                          <ul class="small">
                            @for (reason of verdict.reasons; track reason) {
                              <li>{{ reason }}</li>
                            }
                          </ul>
                        </div>
                      }
                    }

                    <div class="stats small subtle">
                      <span>{{ campaign.placementCount }} promoted</span>
                      <span>{{ campaign.exposureCount | number }} times shown</span>
                      @if (campaign.lastShownAt) {
                        <span>last {{ campaign.lastShownAt | date: 'short' }}</span>
                      }
                    </div>

                    <div class="actions">
                      <a class="btn btn-secondary btn-sm" [routerLink]="['/admin/featured-campaigns', campaign.id, 'edit']">
                        Edit
                      </a>
                      @if (campaign.status === 'active' || campaign.status === 'approved') {
                        <button
                          type="button"
                          class="btn btn-ghost btn-sm"
                          (click)="setStatus(campaign, 'paused')"
                        >
                          Pause
                        </button>
                      } @else if (campaign.status === 'paused') {
                        <button
                          type="button"
                          class="btn btn-ghost btn-sm"
                          (click)="setStatus(campaign, 'approved')"
                        >
                          Resume
                        </button>
                      }
                      <button type="button" class="btn btn-danger btn-sm" (click)="remove(campaign)">
                        Delete
                      </button>
                    </div>
                  </li>
                }
              </ul>
            }
          </div>
        </section>
      }
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

      .promise {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
      }

      .promise p {
        margin: 0 0 0.25rem;
      }

      .card.locked {
        border-style: dashed;
      }

      .list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 1rem;
      }

      .list li {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 0.9rem 1rem;
      }

      .head {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
      }

      .head p {
        margin: 0;
      }

      .danger {
        color: var(--danger, #b3261e);
        margin: 0.5rem 0 0;
      }

      .verdict {
        margin-top: 0.6rem;
        padding: 0.6rem 0.8rem;
        border-radius: var(--radius-sm);
        background: color-mix(in srgb, var(--accent, #fb923c) 12%, transparent);
      }

      .verdict p {
        margin: 0 0 0.25rem;
      }

      .verdict ul {
        margin: 0;
        padding-left: 1.1rem;
      }

      .stats {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        margin-top: 0.6rem;
      }

      .actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: 0.8rem;
      }
    `,
  ],
})
export class FeaturedCampaignsComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly shops = signal<Shop[]>([]);
  readonly shopId = signal<number | null>(null);
  readonly options = signal<MerchantSlotOptions | null>(null);
  readonly campaigns = signal<FeaturedCampaign[]>([]);
  readonly filter = signal<FeaturedCampaignStatus | ''>('');
  readonly loading = signal(true);

  /** Live §9 verdicts, fetched per campaign, keyed by id. */
  private readonly verdicts = signal<Map<number, { eligible: boolean; reasons: string[] }>>(new Map());

  constructor() {
    this.api
      .listShops(
        this.auth.isSuperAdmin
          ? { limit: 100, status: 'all', sort: 'name' }
          : { mine: true, limit: 100, status: 'all', sort: 'name' },
      )
      .subscribe({
        next: (page) => {
          const allowed = page.items.filter((shop) =>
            this.auth.hasForShop(shop.id, PERMISSIONS.MANAGE_FEATURED_CAMPAIGNS),
          );
          const shops = allowed.length ? allowed : page.items;
          this.shops.set(shops);
          if (shops.length) this.selectShop(shops[0].id);
          else this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  selectShop(shopId: number): void {
    this.shopId.set(shopId);
    this.api.merchantSlots(shopId).subscribe({
      next: (options) => this.options.set(options),
      error: () => this.options.set(null),
    });
    this.reload();
  }

  private reload(): void {
    const shopId = this.shopId();
    if (!shopId) return;
    this.loading.set(true);
    this.api
      .listFeaturedCampaigns({ shopId, status: this.filter() || undefined, limit: 100 })
      .subscribe({
        next: (rows) => {
          this.campaigns.set(rows);
          this.loading.set(false);
          this.loadVerdicts(rows);
        },
        error: () => this.loading.set(false),
      });
  }

  /**
   * The list endpoint returns the stored record; only the detail endpoint
   * recomputes §9. Fetching a verdict per live campaign is a few extra reads
   * for the one thing the merchant most needs to know, and it is limited to
   * campaigns that are supposed to be running — a finished campaign not showing
   * is not a mystery worth a request.
   */
  private loadVerdicts(rows: FeaturedCampaign[]): void {
    for (const campaign of rows.filter((row) => this.isLive(row.status))) {
      this.api.getFeaturedCampaign(campaign.id).subscribe({
        next: (detail) => {
          if (!detail.eligibility) return;
          this.verdicts.update((current) => {
            const next = new Map(current);
            next.set(campaign.id, detail.eligibility!);
            return next;
          });
        },
        error: () => undefined,
      });
    }
  }

  verdictFor(id: number): { eligible: boolean; reasons: string[] } | undefined {
    return this.verdicts().get(id);
  }

  isLive(status: FeaturedCampaignStatus): boolean {
    return status === 'active' || status === 'approved';
  }

  setFilter(status: FeaturedCampaignStatus | ''): void {
    this.filter.set(status);
    this.reload();
  }

  statusText(status: FeaturedCampaignStatus): string {
    return (
      {
        draft: 'Draft',
        pending_approval: 'Awaiting review',
        approved: 'Scheduled',
        active: 'Running',
        paused: 'Paused',
        completed: 'Finished',
        rejected: 'Not approved',
        archived: 'Archived',
      } as Record<FeaturedCampaignStatus, string>
    )[status];
  }

  statusBadge(status: FeaturedCampaignStatus): string {
    if (status === 'active') return 'badge-success';
    if (status === 'pending_approval') return 'badge-warning';
    if (status === 'rejected') return 'badge-danger';
    if (status === 'approved') return 'badge-info';
    return '';
  }

  levelBadge(level: string): string {
    if (level === 'PRIORITY') return 'badge-brand';
    if (level === 'ENHANCED') return 'badge-info';
    return '';
  }

  setStatus(campaign: FeaturedCampaign, status: 'paused' | 'approved'): void {
    this.api.setFeaturedCampaignStatus(campaign.id, status).subscribe({
      next: () => {
        this.reload();
        this.toast.success(status === 'paused' ? 'Campaign paused.' : 'Campaign resumed.');
      },
      error: () => this.toast.error('That change could not be saved.'),
    });
  }

  remove(campaign: FeaturedCampaign): void {
    if (!confirm(`Delete “${campaign.name}”? Its performance history goes with it.`)) return;
    this.api.deleteFeaturedCampaign(campaign.id).subscribe({
      next: () => {
        this.reload();
        this.toast.success('Campaign deleted.');
      },
      error: () => this.toast.error('That campaign could not be deleted.'),
    });
  }
}
