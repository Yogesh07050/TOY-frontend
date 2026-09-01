import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { SupportTicket } from '../../core/models';
import { IconComponent } from '../../shared/icon.component';

/**
 * The conversation on a ticket, and the box to add to it.
 *
 * Shared by the customer's "My requests" and the support queue, because it is
 * literally the same thread read from two sides — and a reply box implemented
 * twice is a reply box that behaves differently depending on who is typing.
 *
 * The one difference between the sides is the internal-note checkbox, which
 * appears only where `allowInternal` is set. Its absence here is a convenience,
 * not the control: the API decides what an internal note is from who the caller
 * is, and ignores the flag from anyone else.
 */
@Component({
  selector: 'app-support-thread',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, IconComponent],
  template: `
    <div class="thread">
      @for (message of ticket().messages ?? []; track message.id) {
        <article
          class="message"
          [class.mine]="message.authorRole === ownSide()"
          [class.internal]="message.isInternal"
        >
          <header>
            <strong>{{ message.authorName ?? (message.authorRole === 'support' ? 'Support' : 'You') }}</strong>
            @if (message.isInternal) {
              <span class="badge badge-warning">Internal note</span>
            }
            <span class="small subtle">{{ message.createdAt | date: 'd MMM y, h:mm a' }}</span>
          </header>
          <p>{{ message.body }}</p>
        </article>
      }
    </div>

    @if (ticket().status === 'closed') {
      <p class="small muted closed">
        This request is closed. If it is still a problem, please raise a new one.
      </p>
    } @else {
      <form class="reply" (ngSubmit)="send()">
        <label class="label" [attr.for]="'reply-' + ticket().id">{{ replyLabel() }}</label>
        <textarea
          [id]="'reply-' + ticket().id"
          rows="3"
          [(ngModel)]="draft"
          name="body"
          maxlength="5000"
          [disabled]="sending()"
          [placeholder]="placeholder()"
        ></textarea>

        <div class="reply-actions">
          @if (allowInternal()) {
            <label class="checkbox small">
              <input type="checkbox" [(ngModel)]="internal" name="internal" [disabled]="sending()" />
              <span>Internal note — not sent to the customer</span>
            </label>
          }
          <button type="submit" class="btn btn-sm" [disabled]="sending() || !draft.trim()">
            @if (sending()) {
              <span class="spinner"></span> Sending…
            } @else {
              <app-icon name="chatbubble-ellipses-outline" [size]="15" /> Send
            }
          </button>
        </div>
      </form>
    }
  `,
  styles: [
    `
      .thread {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1.1rem;
      }

      .message {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 0.7rem 0.85rem;
        background: var(--surface);
      }

      /* The reader's own messages sit on the tinted side. Which side that is
         depends on who is reading, which is what ownSide decides. */
      .message.mine {
        background: var(--surface-alt);
      }

      .message.internal {
        border-style: dashed;
        border-color: var(--warning);
      }

      .message header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 0.35rem;
      }

      .message p {
        margin: 0;
        white-space: pre-wrap;
        line-height: 1.6;
        font-size: 0.93rem;
      }

      .reply textarea {
        width: 100%;
      }

      .reply-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-top: 0.5rem;
      }

      .checkbox {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        cursor: pointer;
      }

      .closed {
        border-top: 1px solid var(--border);
        padding-top: 0.85rem;
      }
    `,
  ],
})
export class SupportThreadComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly ticket = input.required<SupportTicket>();
  /** Which role the reader is, so their own messages are the tinted ones. */
  readonly ownSide = input<'customer' | 'support'>('customer');
  readonly allowInternal = input(false);

  /** The updated ticket, thread included — the API returns it, so no refetch. */
  readonly updated = output<SupportTicket>();

  draft = '';
  internal = false;
  readonly sending = signal(false);

  replyLabel(): string {
    return this.ownSide() === 'support' ? 'Reply to the customer' : 'Add to this request';
  }

  placeholder(): string {
    return this.ownSide() === 'support'
      ? 'What you found, and what happens next.'
      : 'Anything else that would help us — a code, a shop name, when it happened.';
  }

  send(): void {
    const body = this.draft.trim();
    if (!body || this.sending()) return;

    this.sending.set(true);
    this.api.replyToSupportTicket(this.ticket().id, body, this.allowInternal() && this.internal).subscribe({
      next: (ticket) => {
        this.sending.set(false);
        this.draft = '';
        this.internal = false;
        this.updated.emit(ticket);
      },
      error: () => {
        // The draft is deliberately left in the box. The interceptor has
        // already said what went wrong; clearing what they typed on top of
        // that would be the second thing to go wrong.
        this.sending.set(false);
        this.toast.error('Your message wasn’t sent. It’s still here — please try again.');
      },
    });
  }
}
