import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AbstractControl, FormGroup } from '@angular/forms';

import { HttpErrorResponse } from '@angular/common/http';

/** Card wrapper shared by every authentication screen. */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card card">
        <div class="card-body">
          <a class="brand" routerLink="/offers">
            <img class="brand-mark" src="logo.svg" alt="" aria-hidden="true" width="40" height="23" />
            <span>Offers<span class="accent">Offer</span></span>
          </a>
          <h1>{{ heading }}</h1>
          @if (subheading) {
            <p class="muted">{{ subheading }}</p>
          }
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-page {
        display: grid;
        place-items: center;
        padding: 2.5rem 1rem 4rem;
        min-height: calc(100vh - var(--header-height));
      }

      .auth-card {
        width: 100%;
        max-width: 430px;
        box-shadow: var(--shadow);
      }

      .card-body {
        padding: 1.75rem;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        font-weight: 750;
        color: var(--text);
        margin-bottom: 1.25rem;
      }

      .brand:hover {
        text-decoration: none;
      }

      .brand-mark {
        width: 40px;
        height: auto;
        display: block;
      }

      .accent {
        color: var(--brand);
      }

      h1 {
        font-size: 1.35rem;
        margin-bottom: 0.25rem;
      }
    `,
  ],
})
export class AuthShellComponent {
  @Input({ required: true }) heading!: string;
  @Input() subheading = '';
}

/**
 * Merges server-side validation errors (422) into a reactive form so each field
 * shows the message the API produced for it.
 */
export function applyServerErrors(form: FormGroup, error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return 'Something went wrong. Please try again.';

  const body = error.error?.error;
  // Only validation errors send `details` as a list of fields. Other errors -
  // a plan gate, for one - put an arbitrary object there, and iterating that
  // throws inside the very handler meant to display the failure.
  const details: { field: string; message: string }[] = Array.isArray(body?.details)
    ? body.details
    : [];

  let unmatched: string | null = null;
  for (const detail of details) {
    const control: AbstractControl | null = form.get(detail.field);
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), server: detail.message });
      control.markAsTouched();
    } else {
      unmatched = detail.message;
    }
  }

  if (details.length && !unmatched) return null;
  return unmatched ?? body?.message ?? 'Something went wrong. Please try again.';
}

/** First message to show under a control, server errors taking precedence. */
export function errorFor(control: AbstractControl | null, label = 'This field'): string | null {
  if (!control || !control.touched || !control.errors) return null;
  const errors = control.errors;
  if (errors['server']) return errors['server'];
  if (errors['required']) return `${label} is required`;
  if (errors['email']) return 'Enter a valid email address';
  if (errors['minlength']) return `${label} must be at least ${errors['minlength'].requiredLength} characters`;
  if (errors['maxlength']) return `${label} must be at most ${errors['maxlength'].requiredLength} characters`;
  if (errors['pattern']) return `${label} is not in the expected format`;
  if (errors['min']) return `${label} must be at least ${errors['min'].min}`;
  if (errors['max']) return `${label} must be at most ${errors['max'].max}`;
  if (errors['mismatch']) return 'Passwords do not match';
  if (errors['weak']) return errors['weak'];
  return 'Please check this value';
}
