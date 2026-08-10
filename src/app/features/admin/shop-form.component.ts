import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { AuthService } from '../../core/auth.service';
import { Category } from '../../core/models';
import { applyServerErrors, errorFor } from '../auth/auth-shell';

/** Shop creation and editing (§16). Creation can seed the first branch. */
@Component({
  selector: 'app-shop-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './shop-form.component.html',
  styles: [
    `
      .alert {
        background: var(--danger-bg);
        color: var(--danger);
        padding: 0.7rem 0.9rem;
        border-radius: var(--radius-sm);
        font-size: 0.9rem;
        margin-bottom: 1rem;
      }

      .form-layout {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 300px);
        gap: 1.25rem;
        align-items: start;
      }

      .cat-picker {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 0.4rem;
      }

      .cat-option {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        padding: 0.5rem 0.6rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 0.9rem;
      }

      .cat-option.selected {
        border-color: var(--brand);
        background: var(--brand-light);
      }

      .cat-option input {
        accent-color: var(--brand);
      }

      .logo-preview {
        width: 100%;
        aspect-ratio: 1;
        max-width: 160px;
        border-radius: var(--radius);
        object-fit: cover;
        border: 1px solid var(--border);
        margin-bottom: 0.6rem;
      }

      .logo-placeholder {
        display: grid;
        place-items: center;
        background: var(--surface-alt);
        color: var(--text-subtle);
        font-size: 0.85rem;
      }

      @media (max-width: 960px) {
        .form-layout {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
  ],
})
export class ShopFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly categories = signal<Category[]>([]);
  readonly selectedCategories = signal<number[]>([]);
  readonly shopId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly logoUrl = signal<string | null>(null);
  readonly formError = signal<string | null>(null);

  readonly isEdit = computed(() => this.shopId() !== null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
    description: [''],
    contactNumber: [''],
    email: ['', [Validators.email]],
    websiteUrl: [''],
    instagram: [''],
    facebook: [''],
    status: ['active' as 'active' | 'inactive'],

    // Only used when creating: the shop's first branch (§16 + §17).
    branchName: [''],
    address: [''],
    city: [''],
    state: [''],
    country: ['India'],
    pincode: [''],
    latitude: [null as number | null],
    longitude: [null as number | null],
  });

  constructor() {
    this.api.listCategories({ status: 'all' }).subscribe((categories) => this.categories.set(categories));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.shopId.set(Number(id));
      this.loadShop(Number(id));
    }
  }

  private loadShop(id: number): void {
    this.loading.set(true);
    this.api.getShop(id).subscribe({
      next: (shop) => {
        this.form.patchValue({
          name: shop.name,
          description: shop.description ?? '',
          contactNumber: shop.contactNumber ?? '',
          email: shop.email ?? '',
          websiteUrl: shop.websiteUrl ?? '',
          instagram: shop.socialLinks?.['instagram'] ?? '',
          facebook: shop.socialLinks?.['facebook'] ?? '',
          status: shop.status,
        });
        this.logoUrl.set(shop.logoUrl);
        this.selectedCategories.set(shop.categories.map((category) => category.id));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('That shop could not be loaded.');
        void this.router.navigateByUrl('/admin/shops');
      },
    });
  }

  error(control: string, label: string): string | null {
    return errorFor(this.form.get(control), label);
  }

  toggleCategory(id: number): void {
    this.selectedCategories.update((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
    );
  }

  isCategorySelected(id: number): boolean {
    return this.selectedCategories().includes(id);
  }

  uploadLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading.set(true);
    this.api.uploadImage('shops', file).subscribe({
      next: (result) => {
        this.logoUrl.set(result.url);
        this.uploading.set(false);
      },
      error: () => this.uploading.set(false),
    });
    input.value = '';
  }

  save(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const socialLinks: Record<string, string> = {};
    if (value.instagram) socialLinks['instagram'] = value.instagram;
    if (value.facebook) socialLinks['facebook'] = value.facebook;

    const payload: Record<string, unknown> = {
      name: value.name,
      description: value.description || null,
      logoUrl: this.logoUrl(),
      contactNumber: value.contactNumber || null,
      email: value.email || null,
      websiteUrl: value.websiteUrl || null,
      socialLinks: Object.keys(socialLinks).length ? socialLinks : null,
      status: value.status,
      categoryIds: this.selectedCategories(),
    };

    if (!this.isEdit() && value.branchName && value.city) {
      payload['primaryBranch'] = {
        branchName: value.branchName,
        address: value.address || null,
        city: value.city,
        state: value.state || null,
        country: value.country || null,
        pincode: value.pincode || null,
        latitude: value.latitude,
        longitude: value.longitude,
        isPrimary: true,
      };
    }

    this.saving.set(true);
    const id = this.shopId();
    const request = id
      ? this.api.updateShop(id, payload as never)
      : this.api.createShop(payload as never);

    request.subscribe({
      next: (shop) => {
        this.saving.set(false);
        this.toast.success(id ? 'Shop updated.' : `${shop.name} created.`);
        // A new membership may have appeared, so refresh the cached user.
        this.auth.reload().subscribe();
        void this.router.navigateByUrl(id ? '/admin/shops' : `/admin/shops/${shop.id}/branches`);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(applyServerErrors(this.form, error));
      },
    });
  }
}
