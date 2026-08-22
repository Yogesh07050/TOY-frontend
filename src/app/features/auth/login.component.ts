import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthPromptService } from '../../core/auth-prompt.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { AuthShellComponent, applyServerErrors, errorFor } from './auth-shell';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthShellComponent, IconComponent],
  template: `
    <app-auth-shell heading="Welcome back" subheading="Login to save offers and follow your shops.">
      <!-- §7: the guest was part-way through an action. Naming it here is what
           makes the login feel like a step in that action rather than a wall. -->
      @if (pendingCopy(); as pending) {
        <p class="pending" role="status">
          <app-icon [name]="pending.icon" [size]="15" /> {{ pending.title }} — we&rsquo;ll finish this
          for you as soon as you log in.
        </p>
      }

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
              <app-icon [name]="showPassword() ? 'eye-off-outline' : 'eye-outline'" [size]="17" />
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
            Login
          }
        </button>
      </form>

      <p class="center small mt-3 mb-0">
        New here? <a routerLink="/auth/register">Create a free account</a>
      </p>
      <p class="center small mt-1 mb-0">
        <a [routerLink]="['/offers']">Continue browsing as guest</a>
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

      .pending {
        background: var(--brand-tint, var(--surface-alt));
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 0.6rem 0.75rem;
        font-size: 0.85rem;
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
  private readonly prompt = inject(AuthPromptService);

  /** The action the guest started before being asked to log in (§7). */
  readonly pendingCopy = () => this.prompt.pendingCopy();

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
        // §7/§29: the action the guest started completes before they land back
        // on the page that started it, so it is already done when they get there.
        this.prompt.resumePending();
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
