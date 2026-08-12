import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Banner, SelectableOffer } from '../../core/models';
import { PERMISSIONS } from '../../core/permissions';
import { applyServerErrors, errorFor } from '../auth/auth-shell';

/**
 * Create / edit a featured banner (§7).
 *
 * The associated offer is required and the picker only lists offers the caller
 * is allowed to promote — the API returns that list, so the form cannot offer
 * something the backend would then reject.
 */
@Component({
  selector: 'app-banner-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './banner-form.component.html',
  styleUrl: './banner-form.component.scss',
})
export class BannerFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly bannerId = signal<number | null>(null);
  readonly offers = signal<SelectableOffer[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal<'desktop' | 'mobile' | null>(null);
  readonly formError = signal<string | null>(null);
  readonly existing = signal<Banner | null>(null);

  readonly desktopImageUrl = signal<string | null>(null);
  readonly mobileImageUrl = signal<string | null>(null);

  readonly isEdit = computed(() => this.bannerId() !== null);
  readonly canPublish = this.auth.has(PERMISSIONS.PUBLISH_BANNER);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    subtitle: [''],
    description: [''],
    offerId: [null as number | null, [Validators.required]],
    buttonText: ['View Offer', [Validators.maxLength(60)]],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
    displayOrder: [0],
  });

  constructor() {
    this.api.bannerSelectableOffers().subscribe({
      next: (offers) => this.offers.set(offers),
      error: () => this.offers.set([]),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.bannerId.set(Number(id));
      this.load(Number(id));
    } else {
      this.form.patchValue({
        startDate: this.toLocalInput(new Date()),
        endDate: this.toLocalInput(new Date(Date.now() + 7 * 86400000)),
      });
    }
  }

  private load(id: number): void {
    this.loading.set(true);
    this.api.getBanner(id).subscribe({
      next: (banner) => {
        this.existing.set(banner);
        this.form.patchValue({
          title: banner.title,
          subtitle: banner.subtitle ?? '',
          description: banner.description ?? '',
          offerId: banner.offerId,
          buttonText: banner.buttonText,
          startDate: this.toLocalInput(new Date(banner.startDate)),
          endDate: this.toLocalInput(new Date(banner.endDate)),
          displayOrder: banner.displayOrder,
        });
        this.desktopImageUrl.set(banner.desktopImageUrl ?? banner.imageUrl);
        this.mobileImageUrl.set(banner.mobileImageUrl);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('That banner could not be loaded.');
        void this.router.navigateByUrl('/admin/banners');
      },
    });
  }

  error(control: string, label: string): string | null {
    return errorFor(this.form.get(control), label);
  }

  upload(event: Event, kind: 'desktop' | 'mobile'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading.set(kind);
    this.api.uploadImage('banners', file).subscribe({
      next: (result) => {
        if (kind === 'desktop') this.desktopImageUrl.set(result.url);
        else this.mobileImageUrl.set(result.url);
        this.uploading.set(null);
      },
      error: () => this.uploading.set(null),
    });
    input.value = '';
  }

  selectedOffer(): SelectableOffer | undefined {
    const id = this.form.controls.offerId.value;
    return this.offers().find((offer) => offer.id === id);
  }

  save(status: 'draft' | 'published'): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Some required fields still need attention.');
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      title: value.title,
      subtitle: value.subtitle || null,
      description: value.description || null,
      imageUrl: this.desktopImageUrl(),
      desktopImageUrl: this.desktopImageUrl(),
      mobileImageUrl: this.mobileImageUrl(),
      offerId: value.offerId!,
      buttonText: value.buttonText || 'View Offer',
      startDate: new Date(value.startDate).toISOString(),
      endDate: new Date(value.endDate).toISOString(),
      status,
      displayOrder: Number(value.displayOrder) || 0,
    };

    this.saving.set(true);
    const id = this.bannerId();
    const request = id ? this.api.updateBanner(id, payload) : this.api.createBanner(payload);

    request.subscribe({
      next: (banner) => {
        this.saving.set(false);
        this.toast.success(
          banner.isLive
            ? 'Banner published — it is live on the offers page now.'
            : `Banner saved as ${banner.status}.`,
        );
        void this.router.navigateByUrl('/admin/banners');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(applyServerErrors(this.form, error));
      },
    });
  }

  /** `datetime-local` wants local time with no timezone suffix. */
  private toLocalInput(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
  }
}
