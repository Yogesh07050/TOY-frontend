import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { AuthShellComponent, applyServerErrors, errorFor } from './auth-shell';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell
      heading="Forgot your password?"
      subheading="Enter your email and we will send you a reset link."
    >
      @if (sent()) {
        @if (delivered()) {
          <div class="notice">
            <p class="mb-0">
              If an account exists for <strong>{{ form.controls.email.value }}</strong>, a reset link is
              on its way. The link expires in one hour.
            </p>
          </div>
        } @else {
          <div class="warn">
            <p class="mb-0">
              <strong>No email was sent.</strong> This server has no SMTP configured. The reset link was
              written to the server log and to <code>TOY-backend/mail-outbox/</code> instead.
            </p>
          </div>
        }
        <a routerLink="/auth/login" class="btn btn-block mt-2">Back to sign in</a>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (formError()) {
            <div class="alert" role="alert">{{ formError() }}</div>
          }

          <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" formControlName="email" autocomplete="email" [class.invalid]="error()" />
            @if (error(); as message) {
              <span class="error-text">{{ message }}</span>
            }
          </div>

          <button type="submit" class="btn btn-block" [disabled]="submitting()">
            @if (submitting()) {
              <span class="spinner"></span> Sending…
            } @else {
              Send reset link
            }
          </button>
        </form>

        <p class="center small mt-3 mb-0"><a routerLink="/auth/login">Back to sign in</a></p>
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
      }
    `,
  ],
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly submitting = signal(false);
  readonly sent = signal(false);
  readonly delivered = signal(true);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  error(): string | null {
    return errorFor(this.form.controls.email, 'Email');
  }

  submit(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.auth.forgotPassword(this.form.controls.email.value).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.delivered.set(response.data.delivered);
        this.sent.set(true);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.formError.set(applyServerErrors(this.form, error));
      },
    });
  }
}
