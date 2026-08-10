import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { AuthShellComponent, applyServerErrors, errorFor } from './auth-shell';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell heading="Welcome back" subheading="Sign in to save offers and follow your shops.">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (formError()) {
          <div class="alert" role="alert">{{ formError() }}</div>
        }

        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            formControlName="email"
            autocomplete="email"
            [class.invalid]="error('email')"
          />
          @if (error('email'); as message) {
            <span class="error-text">{{ message }}</span>
          }
        </div>

        <div class="field">
          <label for="password">Password</label>
          <div class="password-wrap">
            <input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
              [class.invalid]="error('password')"
            />
            <button
              type="button"
              class="reveal"
              (click)="showPassword.set(!showPassword())"
              [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
            >
              {{ showPassword() ? '🙈' : '👁' }}
            </button>
          </div>
          @if (error('password'); as message) {
            <span class="error-text">{{ message }}</span>
          }
        </div>

        <div class="row" style="justify-content: space-between">
          <label class="checkbox">
            <input type="checkbox" formControlName="rememberMe" />
            <span>Remember me</span>
          </label>
          <a routerLink="/auth/forgot-password" class="small">Forgot password?</a>
        </div>

        <button type="submit" class="btn btn-block mt-2" [disabled]="submitting()">
          @if (submitting()) {
            <span class="spinner"></span> Signing in…
          } @else {
            Sign in
          }
        </button>
      </form>

      <p class="center small mt-3 mb-0">
        New here? <a routerLink="/auth/register">Create an account</a>
      </p>
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

      .password-wrap {
        position: relative;
      }

      .password-wrap input {
        padding-right: 2.6rem;
      }

      .reveal {
        position: absolute;
        right: 0.4rem;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        padding: 0.25rem;
        line-height: 1;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  error(control: string): string | null {
    return errorFor(this.form.get(control), control === 'email' ? 'Email' : 'Password');
  }

  submit(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const { email, password, rememberMe } = this.form.getRawValue();

    this.auth.login(email, password, rememberMe).subscribe({
      next: (user) => {
        this.submitting.set(false);
        this.toast.success(`Welcome back, ${user.name.split(' ')[0]}.`);
        // Permission-based landing (§20): the returnUrl wins when present.
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(returnUrl || this.auth.landingRoute());
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.formError.set(applyServerErrors(this.form, error));
      },
    });
  }
}
