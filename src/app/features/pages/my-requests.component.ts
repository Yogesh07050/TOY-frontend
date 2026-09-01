import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { NetworkStatusService } from '../../core/network-status.service';
import { SeoService } from '../../core/seo.service';
import { SupportTicket } from '../../core/models';
import { EmptyStateComponent } from '../../shared/ui.components';
import { ErrorStateComponent } from '../../shared/state.components';
import { IconComponent } from '../../shared/icon.component';
import { SupportThreadComponent } from './support-thread.component';
import { STATUS_BADGES, STATUS_LABELS, categoryLabel } from './support-status';

/**
 * The customer's own support requests.
 *
 * The support flow ends with "response sent" and "ticket resolved", and both
 * of those have to be visible to the person who filed it — otherwise the
 * reference on the confirmation screen is a number that leads nowhere.
 *
 * Guest tickets are not listed here and cannot be: they have no owner, so
 * there is nobody to show them to. That is the cost of letting people file
 * without an account, and it is the right trade — the reply reaches them by
 * email either way.
 */
@Component({
  selector: 'app-my-requests',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DatePipe,
    EmptyStateComponent,
    ErrorStateComponent,
    IconComponent,
    SupportThreadComponent,
  ],
  template: `
    <div class="container page requests">
      <div class="page-header">
        <div>
          <h1>My support requests</h1>
          <p class="subtitle">Everything you’ve raised, and what we said back.</p>
        </div>
        <a routerLink="/support" class="btn btn-sm">
          <app-icon name="add-outline" [size]="15" /> New request
        </a>
      </div>

      @if (loading()) {
        <p class="muted"><span class="spinner dark"></span> Loading your requests…</p>
      } @else if (failed()) {
        <app-error-state
          [offline]="!network.online()"
          message="We couldn’t load your support requests."
          (retry)="load()"
        />
      } @else if (!tickets().length) {
        <app-empty-state
          icon="chatbubbles-outline"
          title="No requests yet"
          message="If something goes wrong, tell us and we’ll look into it."
        >
          <a routerLink="/support" class="btn">Raise a request</a>
        </app-empty-state>
      } @else {
        @for (ticket of tickets(); track ticket.id) {
          <article class="card ticket">
            <button type="button" class="ticket-head" (click)="toggle(ticket)" [attr.aria-expanded]="expanded() === ticket.id">
              <span class="line">
                <span class="reference">{{ ticket.reference }}</span>
                <span class="badge" [class]="badge(ticket)">{{ status(ticket) }}</span>
              </span>
              <strong class="subject">{{ ticket.subject }}</strong>
              <span class="small muted">
                {{ category(ticket.category) }} · raised {{ ticket.createdAt | date: 'd MMM y' }}
              </span>
              <app-icon class="caret" [class.open]="expanded() === ticket.id" name="chevron-down-outline" [size]="16" />
            </button>

            @if (expanded() === ticket.id) {
              <div class="ticket-body">
                @if (detail(); as full) {
                  <app-support-thread [ticket]="full" ownSide="customer" (updated)="replace($event)" />
                } @else if (detailFailed()) {
                  <app-error-state
                    [offline]="!network.online()"
                    message="We couldn’t open this request."
                    (retry)="open(ticket.id)"
                  />
                } @else {
                  <p class="muted mb-0"><span class="spinner dark"></span> Loading…</p>
                }
              </div>
            }
          </article>
        }
      }
    </div>
  `,
  styles: [
    `
      .requests {
        max-width: 780px;
      }

      .ticket {
        margin-bottom: 0.75rem;
      }

      /* The whole header row is the control, so the target is the card rather
         than a chevron somebody has to aim at. */
      .ticket-head {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-areas:
          'line caret'
          'subject caret'
          'meta caret';
        gap: 0.2rem 0.75rem;
        width: 100%;
        text-align: left;
        background: none;
        border: 0;
        font: inherit;
        color: inherit;
        padding: 1rem 1.2rem;
        cursor: pointer;
      }

      .line {
        grid-area: line;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .subject {
        grid-area: subject;
      }

      .ticket-head .small {
        grid-area: meta;
      }

      .reference {
        font-family: var(--font-mono, ui-monospace, monospace);
        font-size: 0.82rem;
        color: var(--text-subtle);
        letter-spacing: 0.03em;
      }

      .caret {
        grid-area: caret;
        align-self: center;
        color: var(--text-subtle);
        transition: transform var(--fast) var(--ease);
      }

      .caret.open {
        transform: rotate(180deg);
      }

      .ticket-body {
        padding: 0 1.2rem 1.2rem;
        border-top: 1px solid var(--border);
        padding-top: 1rem;
      }
    `,
  ],
})
export class MyRequestsComponent {
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);
  readonly network = inject(NetworkStatusService);

  readonly tickets = signal<SupportTicket[]>([]);
  readonly loading = signal(true);
  readonly failed = signal(false);

  /** Which row is open, and the full ticket behind it once it has arrived. */
  readonly expanded = signal<number | null>(null);
  readonly detail = signal<SupportTicket | null>(null);
  readonly detailFailed = signal(false);

  readonly status = (ticket: SupportTicket) => STATUS_LABELS[ticket.status];
  readonly badge = (ticket: SupportTicket) => STATUS_BADGES[ticket.status];
  readonly category = categoryLabel;

  constructor() {
    this.seo.account('My support requests');
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.mySupportTickets({ limit: 50 }).subscribe({
      next: (page) => {
        this.tickets.set(page.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.failed.set(true);
      },
    });
  }

  toggle(ticket: SupportTicket): void {
    if (this.expanded() === ticket.id) {
      this.expanded.set(null);
      return;
    }
    this.open(ticket.id);
  }

  /**
   * The list carries every field except the thread, so opening a row is a
   * second request. Deliberately not prefetched for all of them: a customer
   * with twenty requests would load twenty conversations to read one.
   */
  open(id: number): void {
    this.expanded.set(id);
    this.detail.set(null);
    this.detailFailed.set(false);
    this.api.supportTicket(id).subscribe({
      next: (ticket) => {
        // Guard against a slow response for a row that has since been closed
        // or replaced by another - otherwise the wrong thread lands in it.
        if (this.expanded() !== id) return;
        // `replace` rather than `detail.set`, so the collapsed row above is
        // corrected too. The list is fetched once and the thread per row, so a
        // reply that arrived after the list loaded left the header reading
        // "Open" above a conversation that plainly was not.
        this.replace(ticket);
      },
      error: () => {
        if (this.expanded() === id) this.detailFailed.set(true);
      },
    });
  }

  /** A reply changes the status too, so the row above updates with it. */
  replace(ticket: SupportTicket): void {
    this.detail.set(ticket);
    this.tickets.update((list) => list.map((item) => (item.id === ticket.id ? ticket : item)));
  }
}
