import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AiService } from '../../core/ai.service';
import { AuthService } from '../../core/auth.service';
import { PageMeta } from '../../core/models';
import { AiFeature, AiHistoryEntry, AiUsage } from '../../core/ai.models';
import { EmptyStateComponent, PaginationComponent } from '../../shared/ui.components';

const FEATURE_LABELS: Record<AiFeature, string> = {
  AI_OFFER_ASSISTANT: 'Offer Assistant',
  AI_CONTENT_GENERATOR: 'Content Generator',
  AI_OFFER_OPTIMIZER: 'Offer Optimisation',
};

/**
 * AI usage and generation history (§32, §33).
 *
 * Two questions on one screen: how much of the plan's allowance is left, and
 * what the AI has been asked for. The "accepted / rejected" column is the
 * useful part - it shows which suggestions the shop actually used.
 */
@Component({
  selector: 'app-ai-history',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, EmptyStateComponent, PaginationComponent],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>AI usage & history</h1>
          <p class="subtitle">What your plan includes, and what the AI has been asked for.</p>
        </div>
        <a routerLink="/admin/ai/assistant" class="btn btn-secondary">✨ AI Offer Assistant</a>
      </div>

      <!-- §32: the allowance, per feature. -->
      @if (usage(); as data) {
        @if (data.plan) {
          <section class="card">
            <div class="card-header">
              <h3>{{ data.plan.name }} plan</h3>
              <span class="small muted">Allowances reset at the start of each month</span>
            </div>
            <div class="card-body">
              <div class="allowance-grid">
                @for (entry of featureList(data); track entry.feature) {
                  <div class="allowance" [class.off]="!entry.enabled">
                    <span class="feature">{{ entry.label }}</span>
                    @if (!entry.enabled) {
                      <strong class="value muted">Not included</strong>
                    } @else if (entry.unlimited) {
                      <strong class="value">Unlimited</strong>
                      <span class="small muted">{{ entry.used }} used this month</span>
                    } @else {
                      <strong class="value">{{ entry.remaining }} left</strong>
                      <span class="small muted">of {{ entry.limit }} this month</span>
                      <div class="meter" role="img" [attr.aria-label]="entry.used + ' of ' + entry.limit + ' used'">
                        <span [style.width.%]="percentUsed(entry.used, entry.limit)"></span>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </section>
        }
      }

      <!-- §33: the history itself. -->
      <section class="card mt-2">
        <div class="card-header">
          <h3>Recent AI activity</h3>
          <div class="row">
            <button
              type="button"
              class="chip"
              [class.active]="outcomeFilter() === ''"
              (click)="filterOutcome('')"
            >
              All
            </button>
            <button
              type="button"
              class="chip"
              [class.active]="outcomeFilter() === 'accepted'"
              (click)="filterOutcome('accepted')"
            >
              Accepted
            </button>
            <button
              type="button"
              class="chip"
              [class.active]="outcomeFilter() === 'rejected'"
              (click)="filterOutcome('rejected')"
            >
              Rejected
            </button>
          </div>
        </div>

        @if (loading()) {
          <div class="card-body"><div class="skeleton" style="height: 180px"></div></div>
        } @else if (entries().length === 0) {
          <div class="card-body">
            <app-empty-state
              emoji="✨"
              title="Nothing generated yet"
              message="Recommendations and generated content will be listed here."
            />
          </div>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Feature</th>
                  <th>Asked for</th>
                  <th>Result</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of entries(); track entry.id) {
                  <tr>
                    <td class="nowrap">{{ entry.createdAt | date: 'd MMM, HH:mm' }}</td>
                    <td class="nowrap">{{ label(entry.feature) }}</td>
                    <td class="clamp-2">{{ entry.request || '—' }}</td>
                    <td class="clamp-2">
                      @if (entry.offerId) {
                        <a [routerLink]="['/admin/offers', entry.offerId, 'edit']">{{ entry.result || entry.offerTitle }}</a>
                      } @else {
                        {{ entry.result || '—' }}
                      }
                    </td>
                    <td>
                      <span class="badge" [class]="badgeFor(entry.outcome)">{{ entry.outcome }}</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="card-body">
            <app-pagination [meta]="meta()" (pageChange)="load($event)" />
          </div>
        }
      </section>
    </div>
  `,
  styles: [
    `
      .allowance-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.75rem;
      }

      .allowance {
        padding: 0.8rem 0.9rem;
        background: var(--surface-alt);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      .allowance.off {
        opacity: 0.65;
      }

      .feature {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-subtle);
      }

      .value {
        font-size: 1.25rem;
      }

      .meter {
        height: 5px;
        border-radius: 999px;
        background: var(--border);
        overflow: hidden;
        margin-top: 0.4rem;
      }

      .meter span {
        display: block;
        height: 100%;
        background: var(--gradient-brand);
      }
    `,
  ],
})
export class AiHistoryComponent {
  private readonly ai = inject(AiService);
  readonly auth = inject(AuthService);

  readonly usage = signal<AiUsage | null>(null);
  readonly entries = signal<AiHistoryEntry[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly outcomeFilter = signal<'' | 'accepted' | 'rejected'>('');

  constructor() {
    this.ai.usage(undefined, 6).subscribe({
      next: (usage) => this.usage.set(usage),
      error: () => this.usage.set(null),
    });
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.ai
      .history({ page, limit: 20, outcome: this.outcomeFilter() || undefined })
      .subscribe({
        next: (result) => {
          this.entries.set(result.items);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: () => {
          this.entries.set([]);
          this.loading.set(false);
        },
      });
  }

  filterOutcome(outcome: '' | 'accepted' | 'rejected'): void {
    this.outcomeFilter.set(outcome);
    this.load(1);
  }

  featureList(usage: AiUsage) {
    if (!usage.features) return [];
    return Object.values(usage.features);
  }

  percentUsed(used: number, limit: number | null): number {
    if (!limit) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  }

  label(feature: AiFeature): string {
    return FEATURE_LABELS[feature] ?? feature;
  }

  badgeFor(outcome: string): string {
    return {
      accepted: 'badge-success',
      rejected: 'badge-danger',
      pending: 'badge-info',
    }[outcome] ?? 'badge-info';
  }
}
