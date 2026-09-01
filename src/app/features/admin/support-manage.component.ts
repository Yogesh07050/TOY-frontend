import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { NetworkStatusService } from '../../core/network-status.service';
import { SeoService } from '../../core/seo.service';
import { ToastService } from '../../core/toast.service';
import { PERMISSIONS } from '../../core/permissions';
import { PageMeta, SupportStatus, SupportTicket } from '../../core/models';
import { EmptyStateComponent, PaginationComponent } from '../../shared/ui.components';
import { ErrorStateComponent } from '../../shared/state.components';
import { IconComponent } from '../../shared/icon.component';
import { SupportThreadComponent } from '../pages/support-thread.component';
import { STATUS_BADGES, STATUS_LABELS, categoryLabel } from '../pages/support-status';
import { SUPPORT_CATEGORIES } from '../pages/content';

const STATUSES: SupportStatus[] = [
  'open',
  'in_progress',
  'waiting_on_customer',
  'resolved',
  'closed',
];

/**
 * The support queue.
 *
 * The half of the flow that is not on the customer's screen: a request has to
 * be picked up, investigated, answered and closed, and none of that happens if
 * tickets only exist in a database table.
 *
 * Ordering is the API's, not this screen's — high priority first, then oldest —
 * so a content report is not buried under a week of "how do I save an offer".
 * The default filter is outstanding work rather than everything ever filed;
 * "All" is how you reach the archive.
 */
@Component({
  selector: 'app-support-manage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    EmptyStateComponent,
    ErrorStateComponent,
    PaginationComponent,
    IconComponent,
    SupportThreadComponent,
  ],
  template: `
    <div class="page-header">
      <div>
        <h1>Support</h1>
        <p class="subtitle">
          @if (total() === 1) {
            1 request in this view.
          } @else {
            {{ total() }} requests in this view.
          }
        </p>
      </div>
    </div>

    <div class="filters card">
      <div class="card-body">
        <div class="field">
          <label for="status">Status</label>
          <select id="status" [(ngModel)]="status" (ngModelChange)="reload()">
            <option value="">Outstanding</option>
            <option value="all">All</option>
            @for (option of statuses; track option) {
              <option [value]="option">{{ label(option) }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label for="category">Category</label>
          <select id="category" [(ngModel)]="category" (ngModelChange)="reload()">
            <option value="">Any</option>
            @for (option of categories; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </div>

        <div class="field grow">
          <label for="search">Search</label>
          <input
            id="search"
            type="search"
            [(ngModel)]="search"
            (keyup.enter)="reload()"
            placeholder="Reference, subject, name or email"
          />
        </div>

        <button type="button" class="btn btn-secondary btn-sm" (click)="reload()">
          <app-icon name="search-outline" [size]="15" /> Apply
        </button>
      </div>
    </div>

    @if (loading()) {
      <p class="muted"><span class="spinner dark"></span> Loading the queue…</p>
    } @else if (failed()) {
      <app-error-state
        [offline]="!network.online()"
        message="We couldn’t load the support queue."
        (retry)="load()"
      />
    } @else if (!tickets().length) {
      <app-empty-state
        icon="checkmark-circle-outline"
        title="Nothing waiting"
        message="No support requests match this view."
      />
    } @else {
      @for (ticket of tickets(); track ticket.id) {
        <article class="card ticket" [class.high]="ticket.priority === 'high'">
          <button type="button" class="ticket-head" (click)="toggle(ticket)" [attr.aria-expanded]="expanded() === ticket.id">
            <span class="line">
              <span class="reference">{{ ticket.reference }}</span>
              <span class="badge" [class]="badge(ticket)">{{ label(ticket.status) }}</span>
              @if (ticket.priority === 'high') {
                <span class="badge badge-danger">High</span>
              }
              @if (ticket.entityType) {
                <span class="badge badge-warning">
                  Report · {{ ticket.entityType }} #{{ ticket.entityId }}
                </span>
              }
            </span>
            <strong class="subject">{{ ticket.subject }}</strong>
            <span class="small muted">
              {{ categoryOf(ticket.category) }} · {{ ticket.name }} ({{ ticket.userType }}) ·
              {{ ticket.createdAt | date: 'd MMM y, h:mm a' }}
              @if (ticket.assigneeName) {
                · assigned to {{ ticket.assigneeName }}
              }
            </span>
            <app-icon class="caret" [class.open]="expanded() === ticket.id" name="chevron-down-outline" [size]="16" />
          </button>

          @if (expanded() === ticket.id) {
            <div class="ticket-body">
              @if (detail(); as full) {
                <dl class="contact">
                  <div><dt>Email</dt><dd><a [href]="'mailto:' + full.email">{{ full.email }}</a></dd></div>
                  @if (full.phone) {
                    <div><dt>Phone</dt><dd><a [href]="'tel:' + full.phone">{{ full.phone }}</a></dd></div>
                  }
                  <div>
                    <dt>Account</dt>
                    <dd>{{ full.userId ? '#' + full.userId : 'Not signed in' }}</dd>
                  </div>
                  @if (full.attachmentUrl) {
                    <div>
                      <dt>Attachment</dt>
                      <dd><a [href]="full.attachmentUrl" target="_blank" rel="noopener">Screenshot</a></dd>
                    </div>
                  }
                </dl>

                @if (canManage()) {
                  <div class="controls">
                    <label class="label" for="set-status">Status</label>
                    <select id="set-status" [ngModel]="full.status" (ngModelChange)="setStatus(full, $event)" [disabled]="saving()">
                      @for (option of statuses; track option) {
                        <option [value]="option">{{ label(option) }}</option>
                      }
                    </select>

                    <label class="label" for="set-priority">Priority</label>
                    <select id="set-priority" [ngModel]="full.priority" (ngModelChange)="setPriority(full, $event)" [disabled]="saving()">
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>

                    <button type="button" class="btn btn-secondary btn-sm" (click)="assignToMe(full)" [disabled]="saving() || full.assignedTo === auth.user()?.id">
                      @if (full.assignedTo === auth.user()?.id) {
                        Assigned to you
                      } @else {
                        Assign to me
                      }
                    </button>
                  </div>
                }

                <app-support-thread
                  [ticket]="full"
                  ownSide="support"
                  [allowInternal]="canManage()"
                  (updated)="replace($event)"
                />
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

      <app-pagination [meta]="meta()" (pageChange)="goTo($event)" />
    }
  `,
  styles: [
    `
      .filters .card-body {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 0.75rem;
      }

      .filters .field {
        margin-bottom: 0;
      }

      .filters .grow {
        flex: 1;
        min-width: 200px;
      }

      .ticket {
        margin-bottom: 0.7rem;
      }

      /* A left edge rather than a fill: high priority has to be noticeable
         down a long list without shouting over the text of every row. */
      .ticket.high {
        border-left: 3px solid var(--danger);
      }

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
        padding: 0.95rem 1.15rem;
        cursor: pointer;
      }

      .line {
        grid-area: line;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        flex-wrap: wrap;
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
        padding: 1rem 1.15rem 1.15rem;
        border-top: 1px solid var(--border);
      }

      .contact {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem 1.75rem;
        margin: 0 0 1rem;
        font-size: 0.87rem;
      }

      .contact dt {
        color: var(--text-subtle);
        font-size: 0.76rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .contact dd {
        margin: 0;
      }

      .controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 0.85rem;
        margin-bottom: 1rem;
        background: var(--surface-alt);
        border-radius: var(--radius-sm);
      }

      .controls select {
        max-width: 190px;
      }
    `,
  ],
})
export class SupportManageComponent {
  private readonly api = inject(ApiService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly network = inject(NetworkStatusService);

  readonly statuses = STATUSES;
  readonly categories = SUPPORT_CATEGORIES;
  readonly label = (status: SupportStatus) => STATUS_LABELS[status];
  readonly badge = (ticket: SupportTicket) => STATUS_BADGES[ticket.status];
  readonly categoryOf = categoryLabel;

  status = '';
  category = '';
  search = '';

  readonly tickets = signal<SupportTicket[]>([]);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly saving = signal(false);
  readonly page = signal(1);
  readonly meta = signal<PageMeta | null>(null);
  readonly total = computed(() => this.meta()?.total ?? 0);

  readonly expanded = signal<number | null>(null);
  readonly detail = signal<SupportTicket | null>(null);
  readonly detailFailed = signal(false);

  /**
   * Replying and changing status need MANAGE; the queue itself only needs
   * VIEW. Hiding the controls is a courtesy — the API refuses either way.
   */
  readonly canManage = computed(() => this.auth.hasAny(PERMISSIONS.MANAGE_SUPPORT_TICKETS));

  constructor() {
    this.seo.account('Support');
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api
      .supportTickets({
        page: this.page(),
        limit: 20,
        status: (this.status || undefined) as SupportTicket['status'] | 'all' | undefined,
        category: this.category || undefined,
        search: this.search.trim() || undefined,
      })
      .subscribe({
        next: (result) => {
          this.tickets.set(result.items);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.failed.set(true);
        },
      });
  }

  /** A changed filter is a different list, so it starts at page one. */
  reload(): void {
    this.page.set(1);
    this.expanded.set(null);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.expanded.set(null);
    this.load();
  }

  toggle(ticket: SupportTicket): void {
    if (this.expanded() === ticket.id) {
      this.expanded.set(null);
      return;
    }
    this.open(ticket.id);
  }

  open(id: number): void {
    this.expanded.set(id);
    this.detail.set(null);
    this.detailFailed.set(false);
    this.api.supportTicket(id).subscribe({
      next: (ticket) => {
        if (this.expanded() === id) this.detail.set(ticket);
      },
      error: () => {
        if (this.expanded() === id) this.detailFailed.set(true);
      },
    });
  }

  setStatus(ticket: SupportTicket, status: SupportStatus): void {
    this.save(ticket, { status }, `Marked ${STATUS_LABELS[status].toLowerCase()}.`);
  }

  setPriority(ticket: SupportTicket, priority: string): void {
    this.save(ticket, { priority }, 'Priority updated.');
  }

  assignToMe(ticket: SupportTicket): void {
    const id = this.auth.user()?.id;
    if (!id) return;
    this.save(ticket, { assignedTo: id }, 'Assigned to you.');
  }

  private save(
    ticket: SupportTicket,
    changes: { status?: string; priority?: string; assignedTo?: number | null },
    message: string,
  ): void {
    this.saving.set(true);
    this.api.updateSupportTicket(ticket.id, changes).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.replace(updated);
        this.toast.success(message);
      },
      error: () => {
        this.saving.set(false);
        // The select has already moved to the value that did not save, so put
        // the ticket back rather than leaving the screen claiming otherwise.
        this.detail.set({ ...ticket });
      },
    });
  }

  replace(ticket: SupportTicket): void {
    this.detail.set(ticket);
    this.tickets.update((list) => list.map((item) => (item.id === ticket.id ? ticket : item)));
  }
}
