import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { AuthShellComponent, applyServerErrors, errorFor } from './auth-shell';
import { passwordStrength, passwordsMatch, strengthScore } from './password.validators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthShellComponent],
  template: `
    <app-auth-shell heading="Create your account" subheading="Save offers, follow shops and get notified.">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (formError()) {
          <div class="alert" role="alert">{{ formError() }}</div>
        }

        <div class="field">
          <label for="name">Full name</label>
          <input id="name" type="text" formControlName="name" autocomplete="name" [class.invalid]="error('name', 'Name')" />
          @if (error('name', 'Name'); as message) {
            <span class="error-text">{{ message }}</span>
          }
        </div>

        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" formControlName="email" autocomplete="email" [class.invalid]="error('email', 'Email')" />
          @if (error('email', 'Email'); as message) {
            <span class="error-text">{{ message }}</span>
          }
        </div>

        <div class="field">
          <label for="phone">Phone number <span class="muted small">(optional)</span></label>
          <input id="phone" type="tel" formControlName="phone" autocomplete="tel" [class.invalid]="error('phone', 'Phone number')" />
          @if (error('phone', 'Phone number'); as message) {
            <span class="error-text">{{ message }}</span>
          }
        </div>

        <div class="field">
          <label for="password">Password</label>
          <input id="password" type="password" formControlName="password" autocomplete="new-password" [class.invalid]="error('password', 'Password')" />
          <div class="meter" aria-hidden="true">
            @for (step of [1, 2, 3, 4]; track step) {
              <span [class.on]="score() >= step" [class]="'level-' + score()"></span>
            }
          </div>
          @if (error('password', 'Password'); as message) {
            <span class="error-text">{{ message }}</span>
          } @else {
            <span class="hint">At least 8 characters, with upper and lower case letters and a number.</span>
          }
        </div>

        <div class="field">
          <label for="confirmPassword">Confirm password</label>
          <input id="confirmPassword" type="password" formControlName="confirmPassword" autocomplete="new-password" [class.invalid]="error('confirmPassword', 'Confirmation')" />
          @if (error('confirmPassword', 'Confirmation'); as message) {
            <span class="error-text">{{ message }}</span>
          }
        </div>

        <label class="checkbox">
          <input type="checkbox" formControlName="acceptedTerms" />
          <span>I accept the terms and conditions and the privacy policy.</span>
        </label>
        @if (error('acceptedTerms', 'Terms'); as message) {
          <span class="error-text">You must accept the terms and conditions</span>
        }

        <button type="submit" class="btn btn-block mt-2" [disabled]="submitting()">
          @if (submitting()) {
            <span class="spinner"></span> Creating account…
          } @else {
            Create account
          }
        </button>
      </form>

      <p class="center small mt-3 mb-0">Already registered? <a routerLink="/auth/login">Sign in</a></p>
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
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[+\d][\d\s-]{5,20}$/)]],
      password: ['', [Validators.required, passwordStrength]],
      confirmPassword: ['', [Validators.required]],
      acceptedTerms: [false, [Validators.requiredTrue]],
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
    const value = this.form.getRawValue();

    this.auth
      .register({
        name: value.name,
        email: value.email,
        password: value.password,
        confirmPassword: value.confirmPassword,
        phone: value.phone || undefined,
        acceptedTerms: true,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.success('Account created. Check your email to verify the address.');
          void this.router.navigateByUrl('/offers');
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          this.formError.set(applyServerErrors(this.form, error));
        },
      });
  }
}
