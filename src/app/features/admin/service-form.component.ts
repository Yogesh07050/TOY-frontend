import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { AvailableDay, Branch, Category, Service, ServicePayload, Shop } from '../../core/models';
import { PERMISSIONS } from '../../core/permissions';
import { applyServerErrors, errorFor } from '../auth/auth-shell';
import { IconComponent } from '../../shared/icon.component';

interface UploadedImage {
  url: string;
  thumbnailUrl: string | null;
}

const DAYS: { value: AvailableDay; label: string }[] = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
];

/** Add / edit a service (§4). Handles create and edit through the same form. */
@Component({
  selector: 'app-service-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './service-form.component.html',
  styleUrl: './service-form.component.scss',
})
export class ServiceFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly days = DAYS;
  readonly shops = signal<Shop[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly images = signal<UploadedImage[]>([]);
  readonly selectedBranchIds = signal<number[]>([]);
  readonly selectedDays = signal<AvailableDay[]>([]);

  readonly serviceId = signal<number | null>(null);
  readonly shopsLoaded = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly formError = signal<string | null>(null);
  readonly existing = signal<Service | null>(null);

  readonly isEdit = computed(() => this.serviceId() !== null);

  readonly form = this.fb.nonNullable.group({
    shopId: [null as number | null, [Validators.required]],
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    description: [''],
    categoryId: [null as number | null],
    subcategoryId: [null as number | null],

    pricingType: ['fixed' as 'fixed' | 'starting_from' | 'price_on_enquiry'],
    price: [null as number | null],
    durationMinutes: [null as number | null],
    durationLabel: [''],

    availableTimeStart: [''],
    availableTimeEnd: [''],
    homeService: [false],
    walkInAvailable: [false],
    appointmentRequired: [false],
    bookingType: ['walk_in' as 'walk_in' | 'appointment' | 'both' | 'enquiry_only'],
    serviceArea: [''],

    applicabilityType: ['shop_wide'],

    startDate: [''],
    endDate: [''],
    termsConditions: [''],

    status: ['draft' as 'draft' | 'scheduled' | 'active'],
  });

  constructor() {
    this.api
      .listShops(
        this.auth.isSuperAdmin
          ? { limit: 100, status: 'all', sort: 'name' }
          : { mine: true, limit: 100, status: 'all', sort: 'name' },
      )
      .subscribe({
        next: (page) => {
          const allowed = page.items.filter(
            (shop) =>
              this.auth.hasForShop(shop.id, PERMISSIONS.CREATE_SERVICE) ||
              this.auth.hasForShop(shop.id, PERMISSIONS.EDIT_SERVICE),
          );
          this.shops.set(allowed.length ? allowed : page.items);
          this.shopsLoaded.set(true);
          if (!this.isEdit() && !this.form.controls.shopId.value && this.shops().length) {
            this.form.patchValue({ shopId: this.shops()[0].id });
            this.onShopChange();
          }
        },
        error: () => this.shopsLoaded.set(true),
      });

    this.api.listCategories().subscribe((categories) => this.categories.set(categories));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.serviceId.set(Number(id));
      this.loadService(Number(id));
    }
  }

  private loadService(id: number): void {
    this.loading.set(true);
    this.api.getService(id).subscribe({
      next: (service) => {
        this.existing.set(service);
        this.form.patchValue({
          shopId: service.shop.id,
          name: service.name,
          description: service.description ?? '',
          categoryId: service.category?.id ?? null,
          subcategoryId: service.subcategory?.id ?? null,
          pricingType: service.pricingType,
          price: service.price,
          durationMinutes: service.durationMinutes,
          durationLabel: service.durationLabel ?? '',
          availableTimeStart: service.availableTimeStart ?? '',
          availableTimeEnd: service.availableTimeEnd ?? '',
          homeService: service.homeService,
          walkInAvailable: service.walkInAvailable,
          appointmentRequired: service.appointmentRequired,
          bookingType: service.bookingType,
          serviceArea: service.serviceArea ?? '',
          applicabilityType: service.applicabilityType,
          startDate: service.startDate ? this.toLocalInput(new Date(service.startDate)) : '',
          endDate: service.endDate ? this.toLocalInput(new Date(service.endDate)) : '',
          termsConditions: service.termsConditions ?? '',
          // Editing never silently republishes a draft or deactivated service.
          status: service.status === 'active' ? 'active' : 'draft',
        });

        this.images.set(
          (service.images ?? []).map((image) => ({ url: image.url, thumbnailUrl: image.thumbnailUrl })),
        );
        this.selectedBranchIds.set(service.branchIds ?? []);
        this.selectedDays.set(service.availableDays ?? []);
        this.loadBranches(service.shop.id);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('That service could not be loaded.');
        void this.router.navigateByUrl('/admin/services');
      },
    });
  }

  onShopChange(): void {
    const shopId = this.form.controls.shopId.value;
    this.selectedBranchIds.set([]);
    if (shopId) this.loadBranches(shopId);
    else this.branches.set([]);
  }

  private loadBranches(shopId: number): void {
    this.api.listBranches(shopId).subscribe({
      next: (branches) => this.branches.set(branches),
      error: () => this.branches.set([]),
    });
  }

  // ---- Pricing --------------------------------------------------------------

  get showPrice(): boolean {
    return this.form.controls.pricingType.value !== 'price_on_enquiry';
  }

  // ---- Available days ---------------------------------------------------------

  toggleDay(day: AvailableDay): void {
    this.selectedDays.update((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day]));
  }

  isDaySelected(day: AvailableDay): boolean {
    return this.selectedDays().includes(day);
  }

  // ---- Branches ---------------------------------------------------------------

  toggleBranch(branchId: number): void {
    this.selectedBranchIds.update((ids) =>
      ids.includes(branchId) ? ids.filter((id) => id !== branchId) : [...ids, branchId],
    );
  }

  isBranchSelected(branchId: number): boolean {
    return this.selectedBranchIds().includes(branchId);
  }

  selectAllBranches(): void {
    this.selectedBranchIds.set(this.branches().map((branch) => branch.id));
  }

  // ---- Images -------------------------------------------------------------

  uploadImages(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;

    const room = 8 - this.images().length;
    if (room <= 0) {
      this.toast.info('You can attach up to 8 images.');
      input.value = '';
      return;
    }

    this.uploading.set(true);
    let remaining = Math.min(files.length, room);

    for (const file of files.slice(0, room)) {
      this.api.uploadImage('services', file).subscribe({
        next: (result) => {
          this.images.update((list) => [
            ...list,
            { url: result.url, thumbnailUrl: result.thumbnailUrl },
          ]);
          if (--remaining === 0) this.uploading.set(false);
        },
        error: () => {
          if (--remaining === 0) this.uploading.set(false);
        },
      });
    }
    input.value = '';
  }

  removeImage(index: number): void {
    this.images.update((list) => list.filter((_, position) => position !== index));
  }

  moveImage(index: number, direction: -1 | 1): void {
    const target = index + direction;
    this.images.update((list) => {
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  // ---- Save ---------------------------------------------------------------

  error(control: string, label: string): string | null {
    return errorFor(this.form.get(control), label);
  }

  save(status: 'draft' | 'scheduled' | 'active'): void {
    this.formError.set(null);
    this.form.patchValue({ status });

    if (status === 'scheduled' && !this.form.controls.startDate.value) {
      this.formError.set('A start date is required to schedule a service.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Some required fields still need attention.');
      return;
    }

    const value = this.form.getRawValue();

    if (value.pricingType !== 'price_on_enquiry' && !value.price) {
      this.formError.set('Enter a price, or choose "Price on enquiry".');
      return;
    }

    if (value.applicabilityType === 'selected_branches' && this.selectedBranchIds().length === 0) {
      this.formError.set('Choose at least one branch, or make the service shop-wide.');
      return;
    }

    const payload: ServicePayload = {
      shopId: value.shopId!,
      categoryId: value.categoryId,
      subcategoryId: value.subcategoryId,
      name: value.name,
      description: value.description || null,
      pricingType: value.pricingType,
      price: value.pricingType === 'price_on_enquiry' ? null : value.price,
      durationMinutes: value.durationMinutes,
      durationLabel: value.durationLabel || null,
      availableDays: this.selectedDays(),
      availableTimeStart: value.availableTimeStart || null,
      availableTimeEnd: value.availableTimeEnd || null,
      homeService: value.homeService,
      walkInAvailable: value.walkInAvailable,
      appointmentRequired: value.appointmentRequired,
      bookingType: value.bookingType,
      serviceArea: value.serviceArea || null,
      termsConditions: value.termsConditions || null,
      applicabilityType: value.applicabilityType as ServicePayload['applicabilityType'],
      status,
      startDate: value.startDate ? new Date(value.startDate).toISOString() : null,
      endDate: value.endDate ? new Date(value.endDate).toISOString() : null,
      branchIds: value.applicabilityType === 'selected_branches' ? this.selectedBranchIds() : [],
      images: this.images().map((image) => ({ url: image.url, thumbnailUrl: image.thumbnailUrl })),
    };

    this.saving.set(true);
    const id = this.serviceId();
    const request = id ? this.api.updateService(id, payload) : this.api.createService(payload);

    request.subscribe({
      next: (service) => {
        this.saving.set(false);
        this.toast.success(id ? 'Service updated.' : `Service created and saved as ${service.status}.`);
        void this.router.navigateByUrl('/admin/services');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(applyServerErrors(this.form, error));
      },
    });
  }

  /** `datetime-local` needs a local-time string without a timezone suffix. */
  private toLocalInput(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
  }

  get hasSingleShop(): boolean {
    return this.shops().length === 1;
  }

  get selectedShopName(): string {
    const id = this.form.controls.shopId.value;
    return this.shops().find((shop) => shop.id === id)?.name ?? '';
  }
}
