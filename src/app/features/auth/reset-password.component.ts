import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { AuthShellComponent, applyServerErrors, errorFor } from './auth-shell';
import { passwordStrength, passwordsMatch, strengthScore } from './password.validators';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell heading="Choose a new password" subheading="Pick something you have not used before.">
      @if (!token) {
        <div class="alert" role="alert">
          This reset link is incomplete. Request a new one from the
          <a routerLink="/auth/forgot-password">forgot password</a> page.
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (formError()) {
            <div class="alert" role="alert">{{ formError() }}</div>
          }

          <div class="field">
            <label for="password">New password</label>
            <input id="password" type="password" formControlName="password" autocomplete="new-password" [class.invalid]="error('password', 'Password')" />
            <div class="meter" aria-hidden="true">
              @for (step of [1, 2, 3, 4]; track step) {
                <span [class.on]="score() >= step" [class]="'level-' + score()"></span>
              }
            </div>
            @if (error('password', 'Password'); as message) {
              <span class="error-text">{{ message }}</span>
            }
          </div>

          <div class="field">
            <label for="confirmPassword">Confirm new password</label>
            <input id="confirmPassword" type="password" formControlName="confirmPassword" autocomplete="new-password" [class.invalid]="error('confirmPassword', 'Confirmation')" />
            @if (error('confirmPassword', 'Confirmation'); as message) {
              <span class="error-text">{{ message }}</span>
            }
          </div>

          <button type="submit" class="btn btn-block" [disabled]="submitting()">
            @if (submitting()) {
              <span class="spinner"></span> Updating…
            } @else {
              Update password
            }
          </button>
        </form>
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

      .meter {
        display: flex;
        gap: 4px;
        margin-top: 6px;
      }

      .meter span {
        flex: 1;
        height: 4px;
        border-radius: 2px;
        background: var(--border);
      }

      .meter span.on.level-1 {
        background: var(--danger);
      }
      .meter span.on.level-2 {
        background: var(--warning);
      }
      .meter span.on.level-3 {
        background: #0ea5e9;
      }
      .meter span.on.level-4 {
        background: var(--success);
      }
    `,
  ],
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, passwordStrength]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch() },
  );

  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });
  readonly score = computed(() => strengthScore(this.passwordValue()));

  error(control: string, label: string): string | null {
    return errorFor(this.form.get(control), label);
  }

  submit(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const { password, confirmPassword } = this.form.getRawValue();

    this.auth.resetPassword(this.token, password, confirmPassword).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success('Password updated. Please sign in.');
        void this.router.navigateByUrl('/auth/login');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.formError.set(applyServerErrors(this.form, error));
      },
    });
  }
}
