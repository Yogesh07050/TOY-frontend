import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../core/auth.service';
import { AuthShellComponent } from './auth-shell';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell heading="Email verification">
      @switch (state()) {
        @case ('working') {
          <p class="row"><span class="spinner dark"></span> Confirming your email address…</p>
        }
        @case ('done') {
          <div class="notice">Your email address is verified. Thanks!</div>
          <a routerLink="/offers" class="btn btn-block mt-2">Browse offers</a>
        }
        @case ('failed') {
          <div class="alert" role="alert">{{ message() }}</div>
          <p class="small muted">
            Verification links expire after 24 hours. Enter your email to get a new one.
          </p>
          <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" [value]="email()" (input)="email.set($any($event.target).value)" />
          </div>
          <button type="button" class="btn btn-block" [disabled]="resending()" (click)="resend()">
            @if (resending()) {
              <span class="spinner"></span> Sending…
            } @else {
              Send a new link
            }
          </button>
        }
        @case ('resent') {
          @if (delivered()) {
            <div class="notice">If that address still needs verifying, a new link is on its way.</div>
          } @else {
            <div class="warn">
              <strong>No email was sent.</strong>
              This server has no SMTP configured, so verification emails cannot be delivered.
              The link was written to the server log and to
              <code>TOY-backend/mail-outbox/</code> instead — open the newest file there, or set
              <code>SMTP_HOST</code> in <code>TOY-backend/.env</code> to send mail for real.
            </div>
          }
          <a routerLink="/offers" class="btn btn-block mt-2">Continue browsing</a>
        }
      }
    </app-auth-shell>
  `,
  styles: [
    `
      .alert {
        background: var(--danger-bg);
        color: var(--danger);
        padding: 0.65rem 0.8rem;
        border-radius: var(--radius-sm);
        font-size: 0.88rem;
        margin-bottom: 1rem;
      }

      .notice {
        background: var(--success-bg);
        color: var(--success);
        padding: 0.85rem 1rem;
        border-radius: var(--radius-sm);
        font-size: 0.9rem;
      }

      .warn {
        background: var(--warning-bg);
        color: var(--warning);
        padding: 0.85rem 1rem;
        border-radius: var(--radius-sm);
        font-size: 0.88rem;
        line-height: 1.55;
      }

      .warn code {
        background: rgba(0, 0, 0, 0.06);
        padding: 0.05rem 0.3rem;
        border-radius: 4px;
        font-size: 0.85em;
      }
    `,
  ],
})
export class VerifyEmailComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly state = signal<'working' | 'done' | 'failed' | 'resent'>('working');
  readonly message = signal('This verification link is invalid or has expired.');
  readonly email = signal('');
  readonly resending = signal(false);
  /** False when the server could not actually deliver the message. */
  readonly delivered = signal(true);

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('failed');
      this.message.set('This verification link is incomplete.');
      return;
    }

    this.auth.verifyEmail(token).subscribe({
      next: () => {
        this.state.set('done');
        // Reflect the new flag without forcing a re-login.
        this.auth.reload().subscribe();
      },
      error: (error: unknown) => {
        this.state.set('failed');
        if (error instanceof HttpErrorResponse && error.error?.error?.message) {
          this.message.set(error.error.error.message);
        }
      },
    });
  }

  resend(): void {
    if (!this.email()) return;
    this.resending.set(true);
    this.auth.resendVerification(this.email()).subscribe({
      next: (response) => {
        this.resending.set(false);
        this.delivered.set(response.data.delivered);
        this.state.set('resent');
      },
      error: () => this.resending.set(false),
    });
  }
}
