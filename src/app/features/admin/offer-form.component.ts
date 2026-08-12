import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Branch, Category, Offer, OfferPayload, Shop } from '../../core/models';
import { PERMISSIONS } from '../../core/permissions';
import { applyServerErrors, errorFor } from '../auth/auth-shell';

interface UploadedImage {
  url: string;
  thumbnailUrl: string | null;
}

/** Suggested headlines, matching the promotion examples in §13. */
const HEADLINE_PRESETS = [
  'Buy 2 Get 1 Free',
  'Buy 3 Get 3 Free',
  'Flat 50% Off',
  'Up to 70% Off',
  '₹500 Off on purchases above ₹2,000',
];

/** Post / edit an offer (§13). Handles create and edit through the same form. */
@Component({
  selector: 'app-offer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './offer-form.component.html',
  styleUrl: './offer-form.component.scss',
})
export class OfferFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly headlinePresets = HEADLINE_PRESETS;
  readonly shops = signal<Shop[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly images = signal<UploadedImage[]>([]);
  readonly selectedBranchIds = signal<number[]>([]);

  readonly offerId = signal<number | null>(null);
  readonly shopsLoaded = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly formError = signal<string | null>(null);
  readonly existing = signal<Offer | null>(null);

  readonly isEdit = computed(() => this.offerId() !== null);

  readonly form = this.fb.nonNullable.group({
    shopId: [null as number | null, [Validators.required]],
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    productName: [''],
    description: [''],
    categoryId: [null as number | null],
    subcategoryId: [null as number | null],

    offerText: ['', [Validators.maxLength(200)]],
    offerType: ['percentage'],
    discountType: ['percentage'],
    discountValue: [null as number | null],
    originalPrice: [null as number | null],
    discountedPrice: [null as number | null],
    buyQuantity: [null as number | null],
    getQuantity: [null as number | null],

    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
    isRecurring: [false],
    recurrenceType: ['' as string],

    applicabilityType: ['shop_wide'],

    minPurchase: [null as number | null],
    applicableProducts: [''],
    eligibility: [''],
    usageRestrictions: [''],
    termsConditions: [''],

    status: ['draft' as 'draft' | 'scheduled' | 'active'],
  });

  constructor() {
    // Only shops the user may post for; the API enforces the same restriction.
    // `mine` keeps an Admin scoped to their own shops without needing the
    // wider EDIT_SHOP permission that listing every shop would require.
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
              this.auth.hasForShop(shop.id, PERMISSIONS.CREATE_OFFER) ||
              this.auth.hasForShop(shop.id, PERMISSIONS.EDIT_OFFER),
          );
          this.shops.set(allowed.length ? allowed : page.items);
          this.shopsLoaded.set(true);
          // The shop comes from the user's role, so pick it for them rather
          // than presenting a one-option dropdown.
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
      this.offerId.set(Number(id));
      this.loadOffer(Number(id));
    } else {
      // Sensible defaults: starts now, runs for two weeks.
      this.form.patchValue({
        startDate: this.toLocalInput(new Date()),
        endDate: this.toLocalInput(new Date(Date.now() + 14 * 86400000)),
      });
    }
  }

  private loadOffer(id: number): void {
    this.loading.set(true);
    this.api.getOffer(id).subscribe({
      next: (offer) => {
        this.existing.set(offer);
        this.form.patchValue({
          shopId: offer.shop.id,
          title: offer.title,
          productName: offer.productName ?? '',
          description: offer.description ?? '',
          categoryId: offer.category?.id ?? null,
          subcategoryId: offer.subcategory?.id ?? null,
          offerText: offer.offerText ?? '',
          offerType: offer.offerType,
          discountType: offer.discountType,
          discountValue: offer.discountValue,
          originalPrice: offer.originalPrice,
          discountedPrice: offer.discountedPrice,
          buyQuantity: offer.buyQuantity,
          getQuantity: offer.getQuantity,
          startDate: this.toLocalInput(new Date(offer.startDate)),
          endDate: this.toLocalInput(new Date(offer.endDate)),
          isRecurring: offer.isRecurring,
          recurrenceType: offer.recurrenceType ?? '',
          applicabilityType: offer.applicabilityType,
          minPurchase: offer.minPurchase,
          applicableProducts: offer.applicableProducts ?? '',
          eligibility: offer.eligibility ?? '',
          usageRestrictions: offer.usageRestrictions ?? '',
          termsConditions: offer.termsConditions ?? '',
          // Editing never silently republishes a draft or deactivated offer.
          status: offer.status === 'active' ? 'active' : 'draft',
        });

        this.images.set(
          (offer.images ?? []).map((image) => ({ url: image.url, thumbnailUrl: image.thumbnailUrl })),
        );
        this.selectedBranchIds.set(offer.branchIds ?? []);
        this.loadBranches(offer.shop.id);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('That offer could not be loaded.');
        void this.router.navigateByUrl('/admin/offers');
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

  // ---- Offer type helpers -------------------------------------------------

  /** Keeps discountType consistent with the chosen offerType (§31). */
  onOfferTypeChange(): void {
    const type = this.form.controls.offerType.value;
    const mapping: Record<string, string> = {
      percentage: 'percentage',
      up_to: 'percentage',
      flat: 'flat',
      price_drop: 'flat',
      buy_x_get_y: 'none',
      other: 'none',
    };
    this.form.patchValue({ discountType: mapping[type] ?? 'percentage' });
  }

  get showPercentage(): boolean {
    return ['percentage', 'up_to'].includes(this.form.controls.offerType.value);
  }

  get showFlat(): boolean {
    return ['flat', 'price_drop'].includes(this.form.controls.offerType.value);
  }

  get showBuyGet(): boolean {
    return this.form.controls.offerType.value === 'buy_x_get_y';
  }

  get showPricing(): boolean {
    return ['price_drop', 'flat', 'percentage', 'up_to'].includes(this.form.controls.offerType.value);
  }

  applyPreset(preset: string): void {
    this.form.patchValue({ offerText: preset });
  }

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
      this.api.uploadImage('offers', file).subscribe({
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

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Some required fields still need attention.');
      return;
    }

    const value = this.form.getRawValue();

    if (value.applicabilityType === 'selected_branches' && this.selectedBranchIds().length === 0) {
      this.formError.set('Choose at least one branch, or make the offer shop-wide.');
      return;
    }

    const payload: OfferPayload = {
      shopId: value.shopId!,
      categoryId: value.categoryId,
      subcategoryId: value.subcategoryId,
      title: value.title,
      productName: value.productName || null,
      description: value.description || null,
      offerText: value.offerText || null,
      offerType: value.offerType as OfferPayload['offerType'],
      discountType: value.discountType as OfferPayload['discountType'],
      discountValue: value.discountValue,
      originalPrice: value.originalPrice,
      discountedPrice: value.discountedPrice,
      buyQuantity: value.buyQuantity,
      getQuantity: value.getQuantity,
      minPurchase: value.minPurchase,
      termsConditions: value.termsConditions || null,
      eligibility: value.eligibility || null,
      usageRestrictions: value.usageRestrictions || null,
      applicableProducts: value.applicableProducts || null,
      isRecurring: value.isRecurring,
      recurrenceType: value.isRecurring ? value.recurrenceType || null : null,
      startDate: new Date(value.startDate).toISOString(),
      endDate: new Date(value.endDate).toISOString(),
      status,
      applicabilityType: value.applicabilityType as OfferPayload['applicabilityType'],
      branchIds: value.applicabilityType === 'selected_branches' ? this.selectedBranchIds() : [],
      images: this.images().map((image) => ({ url: image.url, thumbnailUrl: image.thumbnailUrl })),
    };

    this.saving.set(true);
    const id = this.offerId();
    const request = id ? this.api.updateOffer(id, payload) : this.api.createOffer(payload);

    request.subscribe({
      next: (offer) => {
        this.saving.set(false);
        this.toast.success(
          id ? 'Offer updated.' : `Offer created and saved as ${offer.status}.`,
        );
        void this.router.navigateByUrl('/admin/offers');
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

  shopName(): string {
    const id = this.form.controls.shopId.value;
    return this.shops().find((shop) => shop.id === id)?.name ?? 'YOUR SHOP';
  }

  /** With a single shop there is nothing to choose - show it as a fact. */
  get hasSingleShop(): boolean {
    return this.shops().length === 1;
  }

  get selectedShopName(): string {
    const id = this.form.controls.shopId.value;
    return this.shops().find((shop) => shop.id === id)?.name ?? '';
  }

  /** Live preview of what the card will say. */
  get previewHeadline(): string {
    const value = this.form.getRawValue();
    if (value.offerText) return value.offerText;
    switch (value.offerType) {
      case 'buy_x_get_y':
        return value.buyQuantity && value.getQuantity
          ? `Buy ${value.buyQuantity} Get ${value.getQuantity} Free`
          : 'Buy X Get Y';
      case 'up_to':
        return value.discountValue ? `Up to ${value.discountValue}% OFF` : 'Up to … % OFF';
      case 'price_drop':
        return value.discountedPrice
          ? `₹${value.discountedPrice}${value.originalPrice ? ` instead of ₹${value.originalPrice}` : ''}`
          : 'Price drop';
      case 'flat':
        return value.discountValue ? `₹${value.discountValue} OFF` : 'Flat discount';
      default:
        return value.discountValue ? `${value.discountValue}% OFF` : 'Percentage off';
    }
  }
}
