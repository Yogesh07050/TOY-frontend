import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { LocationService, SUGGESTED_CITIES } from '../../core/location.service';
import { ToastService } from '../../core/toast.service';
import { NotificationPreferences } from '../../core/models';
import { applyServerErrors, errorFor } from '../auth/auth-shell';
import { passwordStrength, passwordsMatch } from '../auth/password.validators';

/** Profile, preferred location, notification preferences and password (§40). */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styles: [
    `
      .profile-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 1rem;
        align-items: start;
      }

      .avatar-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .avatar {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        object-fit: cover;
        background: var(--gradient-brand);
        color: var(--brand-ink);
        display: grid;
        place-items: center;
        font-size: 1.5rem;
        font-weight: 700;
        flex-shrink: 0;
      }

      .toggle-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.6rem 0;
        border-bottom: 1px solid var(--border);
      }

      .toggle-row:last-of-type {
        border-bottom: none;
      }

      .toggle-row .label-block {
        display: flex;
        flex-direction: column;
      }

      .switch {
        position: relative;
        width: 42px;
        height: 24px;
        flex-shrink: 0;
      }

      .switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .slider {
        position: absolute;
        inset: 0;
        background: var(--border-strong);
        border-radius: 999px;
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .slider::before {
        content: '';
        position: absolute;
        width: 18px;
        height: 18px;
        left: 3px;
        top: 3px;
        background: #fff;
        border-radius: 50%;
        transition: transform 0.15s ease;
      }

      .switch input:checked + .slider {
        background: var(--brand);
      }

      .switch input:checked + .slider::before {
        transform: translateX(18px);
      }

      .verify-banner {
        background: var(--warning-bg);
        color: var(--warning);
        padding: 0.7rem 0.9rem;
        border-radius: var(--radius-sm);
        font-size: 0.88rem;
        margin-bottom: 1rem;
      }
    `,
  ],
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly locations = inject(LocationService);

  readonly cities = SUGGESTED_CITIES;
  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly savingPreferences = signal(false);
  readonly uploading = signal(false);
  readonly preferences = signal<NotificationPreferences | null>(null);
  readonly profileError = signal<string | null>(null);
  readonly passwordError = signal<string | null>(null);

  readonly profileForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: [''],
    city: [''],
  });

  readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      password: ['', [Validators.required, passwordStrength]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch() },
  );

  constructor() {
    const user = this.auth.user();
    if (user) {
      this.profileForm.patchValue({
        name: user.name,
        phone: user.phone ?? '',
        city: user.preferredLocation?.city ?? '',
      });
    }

    this.api.getNotificationPreferences().subscribe((preferences) => this.preferences.set(preferences));
  }

  get initials(): string {
    return (this.auth.user()?.name ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  error(form: 'profile' | 'password', control: string, label: string): string | null {
    // Widened to FormGroup: the two forms have different value shapes, and the
    // union of their typed `get()` overloads is not callable.
    const group: FormGroup = form === 'profile' ? this.profileForm : this.passwordForm;
    return errorFor(group.get(control), label);
  }

  saveProfile(): void {
    this.profileError.set(null);
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile.set(true);
    const { name, phone, city } = this.profileForm.getRawValue();
    // Store the coordinates of the chosen city so "offers near me" and nearby
    // notifications work even when the browser never shares GPS (§8.1).
    const match = this.cities.find((entry) => entry.city === city);

    this.api
      .updateProfile({
        name,
        phone: phone || null,
        preferredLocation: city
          ? { city, latitude: match?.latitude ?? null, longitude: match?.longitude ?? null }
          : null,
      })
      .subscribe({
        next: (user) => {
          this.savingProfile.set(false);
          this.auth.patchUser({
            name: user.name,
            phone: user.phone,
            preferredLocation: user.preferredLocation,
          });
          if (match) this.locations.selectCity(match);
          this.toast.success('Profile updated.');
        },
        error: (error: unknown) => {
          this.savingProfile.set(false);
          this.profileError.set(applyServerErrors(this.profileForm, error));
        },
      });
  }

  changePassword(): void {
    this.passwordError.set(null);
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.savingPassword.set(true);
    const { currentPassword, password, confirmPassword } = this.passwordForm.getRawValue();

    this.auth.changePassword(currentPassword, password, confirmPassword).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.toast.success('Password updated.');
      },
      error: (error: unknown) => {
        this.savingPassword.set(false);
        this.passwordError.set(applyServerErrors(this.passwordForm, error));
      },
    });
  }

  togglePreference(key: keyof NotificationPreferences): void {
    const current = this.preferences();
    if (!current) return;

    const next = { ...current, [key]: !current[key] };
    this.preferences.set(next);
    this.savingPreferences.set(true);

    this.api.updateNotificationPreferences({ [key]: next[key] }).subscribe({
      next: (updated) => {
        this.preferences.set(updated);
        this.savingPreferences.set(false);
      },
      error: () => {
        this.preferences.set(current);
        this.savingPreferences.set(false);
      },
    });
  }

  uploadAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading.set(true);
    this.api.uploadImage('avatars', file).subscribe({
      next: (result) => {
        this.api.updateProfile({ avatarUrl: result.url }).subscribe({
          next: (user) => {
            this.auth.patchUser({ avatarUrl: user.avatarUrl });
            this.uploading.set(false);
            this.toast.success('Photo updated.');
          },
          error: () => this.uploading.set(false),
        });
      },
      error: () => this.uploading.set(false),
    });
    input.value = '';
  }

  resendVerification(): void {
    const email = this.auth.user()?.email;
    if (!email) return;
    this.auth.resendVerification(email).subscribe({
      next: (response) => {
        if (response.data.delivered) {
          this.toast.success('Verification email sent. Check your inbox.');
        } else {
          // Saying "sent" when nothing left the server is what made this
          // look broken in the first place.
          this.toast.error(
            'Email delivery is not configured on the server, so nothing was sent. ' +
              'The link is in the server log and in TOY-backend/mail-outbox/.',
          );
        }
      },
    });
  }
}
