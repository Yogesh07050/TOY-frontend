import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../../core/api.service';
import { ToastService } from '../../../core/toast.service';
import { FeaturedCampaign, FeaturedCampaignStatus } from '../../../core/models';

/**
 * Super Admin → Featured campaign approvals (§22).
 *
 * A promotional space is shared by every merchant on the platform, so §22 puts
 * a person between "a merchant typed something" and "every customer sees it".
 * Campaigns arrive here as `pending_approval` and cannot display until approved
 * — the scheduler will not activate an unapproved campaign no matter what its
 * dates say.
 *
 * Approving does not launch anything. It schedules: a campaign starting next
 * Tuesday stays `approved` until Tuesday, which is why the queue shows the
 * window rather than just the decision.
 */
@Component({
  selector: 'app-campaign-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Featured campaigns</h1>
          <p class="subtitle">
            Promotional placements across the platform. Nothing runs until it is approved here.
          </p>
        </div>
      </div>

      <div class="tiles mb-2">
        <div class="tile">
          <p class="value">{{ countOf('pending_approval') }}</p>
          <p class="label">Awaiting review</p>
        </div>
        <div class="tile">
          <p class="value">{{ countOf('active') }}</p>
          <p class="label">Running now</p>
        </div>
        <div class="tile">
          <p class="value">{{ countOf('approved') }}</p>
          <p class="label">Scheduled</p>
        </div>
        <div class="tile">
          <p class="value">{{ countOf('rejected') }}</p>
          <p class="label">Rejected</p>
        </div>
      </div>

      <section class="card">
        <div class="card-header">
          <h2>{{ statusLabel() }}</h2>
          <select [ngModel]="filter()" (ngModelChange)="setFilter($event)" aria-label="Status">
            <option value="pending_approval">Awaiting review</option>
            <option value="active">Running</option>
            <option value="approved">Scheduled</option>
            <option value="paused">Paused</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Finished</option>
            <option value="">All</option>
          </select>
        </div>
        <div class="card-body">
          @if (loading()) {
            <div class="skeleton" style="height: 180px"></div>
          } @else if (!campaigns().length) {
            <p class="small subtle">Nothing here right now.</p>
          } @else {
            <ul class="queue">
              @for (campaign of campaigns(); track campaign.id) {
                <li>
                  <div class="head">
                    <div>
                      <p class="strong">{{ campaign.name }}</p>
                      <p class="small subtle">
                        {{ campaign.shopName }} · {{ campaign.slotName }} ·
                        {{ campaign.placementCount }}
                        {{ campaign.placementCount === 1 ? 'listing' : 'listings' }}
                      </p>
                    </div>
                    <span class="badge" [class]="statusBadge(campaign.status)">
                      {{ statusText(campaign.status) }}
                    </span>
                  </div>

                  <p class="small subtle window">
                    {{ campaign.startAt | date: 'medium' }} → {{ campaign.endAt | date: 'medium' }}
                    @if (campaign.target.categoryName) {
                      · targets {{ campaign.target.categoryName }}
                    }
                    @if (campaign.target.city) {
                      · {{ campaign.target.city }}
                    }
                    @if (campaign.target.radiusKm) {
                      · within {{ campaign.target.radiusKm }} km
                    }
                  </p>

                  @if (campaign.description) {
                    <p class="small message">“{{ campaign.description }}”</p>
                  }

                  @if (campaign.rejectionReason) {
                    <p class="small danger">Rejected: {{ campaign.rejectionReason }}</p>
                  }

                  @if (campaign.status === 'active' && campaign.exposureCount) {
                    <p class="small subtle">
                      Shown {{ campaign.exposureCount | number }} times
                      @if (campaign.lastShownAt) {
                        · last {{ campaign.lastShownAt | date: 'short' }}
                      }
                    </p>
                  }

                  <div class="actions">
                    @if (campaign.status === 'pending_approval') {
                      <button
                        type="button"
                        class="btn btn-sm"
                        [disabled]="busy() === campaign.id"
                        (click)="approve(campaign)"
                      >
                        Approve
                      </button>
                      <input
                        type="text"
                        class="reason-input"
                        placeholder="Reason, if rejecting"
                        [(ngModel)]="reasons[campaign.id]"
                        [attr.aria-label]="'Rejection reason for ' + campaign.name"
                      />
                      <button
                        type="button"
                        class="btn btn-danger btn-sm"
                        [disabled]="busy() === campaign.id"
                        (click)="reject(campaign)"
                      >
                        Reject
                      </button>
                    } @else if (campaign.status === 'active' || campaign.status === 'approved') {
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        [disabled]="busy() === campaign.id"
                        (click)="setStatus(campaign, 'paused')"
                      >
                        Suspend
                      </button>
                    } @else if (campaign.status === 'paused') {
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        [disabled]="busy() === campaign.id"
                        (click)="setStatus(campaign, 'approved')"
                      >
                        Resume
                      </button>
                    }
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      </section>
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

      .queue {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 1rem;
      }

      .queue li {
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

      .window,
      .message {
        margin: 0.45rem 0 0;
      }

      .message {
        font-style: italic;
      }

      .danger {
        color: var(--danger, #b3261e);
        margin: 0.4rem 0 0;
      }

      .actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        flex-wrap: wrap;
        margin-top: 0.8rem;
      }

      .reason-input {
        flex: 1 1 14rem;
        min-width: 10rem;
      }
    `,
  ],
})
export class CampaignApprovalsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly campaigns = signal<FeaturedCampaign[]>([]);
  readonly counts = signal<FeaturedCampaign[]>([]);
  readonly filter = signal<FeaturedCampaignStatus | ''>('pending_approval');
  readonly loading = signal(true);
  readonly busy = signal<number | null>(null);

  /** Rejection reasons, keyed by campaign, so each row keeps its own draft. */
  reasons: Record<number, string> = {};

  readonly statusLabel = computed(() => {
    const filter = this.filter();
    if (!filter) return 'All campaigns';
    return this.statusText(filter);
  });

  constructor() {
    this.reload();
    this.reloadCounts();
  }

  private reload(): void {
    this.loading.set(true);
    this.api.adminFeaturedCampaigns({ status: this.filter() || undefined, limit: 100 }).subscribe({
      next: (rows) => {
        this.campaigns.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Campaigns could not be loaded.');
      },
    });
  }

  /**
   * The tiles are counted from an unfiltered read rather than from the list.
   * Counting the filtered list would make every tile equal the one being
   * viewed, which reads as a bug even when the number is right.
   */
  private reloadCounts(): void {
    this.api
      .adminFeaturedCampaigns({ limit: 200 })
      .subscribe({ next: (rows) => this.counts.set(rows), error: () => undefined });
  }

  countOf(status: FeaturedCampaignStatus): number {
    return this.counts().filter((campaign) => campaign.status === status).length;
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
        rejected: 'Rejected',
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

  approve(campaign: FeaturedCampaign): void {
    this.busy.set(campaign.id);
    this.api.approveFeaturedCampaign(campaign.id).subscribe({
      next: () => this.afterChange(`${campaign.name} approved.`),
      error: () => this.afterError(),
    });
  }

  reject(campaign: FeaturedCampaign): void {
    const reason = (this.reasons[campaign.id] ?? '').trim();
    if (reason.length < 3) {
      // §22 makes rejection a decision someone has to answer for later, and a
      // merchant who is told only "no" has nothing to fix.
      this.toast.error('Give the merchant a reason for the rejection.');
      return;
    }
    this.busy.set(campaign.id);
    this.api.rejectFeaturedCampaign(campaign.id, reason).subscribe({
      next: () => {
        delete this.reasons[campaign.id];
        this.afterChange(`${campaign.name} rejected.`);
      },
      error: () => this.afterError(),
    });
  }

  setStatus(campaign: FeaturedCampaign, status: FeaturedCampaignStatus): void {
    this.busy.set(campaign.id);
    this.api.setFeaturedCampaignStatusAsAdmin(campaign.id, status).subscribe({
      next: () => this.afterChange(`${campaign.name} is now ${this.statusText(status).toLowerCase()}.`),
      error: () => this.afterError(),
    });
  }

  private afterChange(message: string): void {
    this.busy.set(null);
    this.reload();
    this.reloadCounts();
    this.toast.success(message);
  }

  private afterError(): void {
    this.busy.set(null);
    this.toast.error('That change could not be saved.');
  }
}
