import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { LocationService, SUGGESTED_CITIES } from '../../core/location.service';
import { ToastService } from '../../core/toast.service';
import { Category, Offer, OfferQuery, OfferSort, PageMeta, Shop } from '../../core/models';
import { OfferCardComponent } from '../../shared/offer-card.component';
import { CardSkeletonsComponent, EmptyStateComponent, PaginationComponent } from '../../shared/ui.components';

interface SortOption {
  value: OfferSort;
  label: string;
  needsLocation?: boolean;
}

const SORTS: SortOption[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'endingSoon', label: 'Ending soon' },
  { value: 'highestDiscount', label: 'Highest discount' },
  { value: 'mostViewed', label: 'Most viewed' },
  { value: 'mostPopular', label: 'Most popular' },
  { value: 'nearest', label: 'Nearest', needsLocation: true },
];

const OFFER_TYPES = [
  { value: 'percentage', label: 'Percentage off' },
  { value: 'flat', label: 'Flat amount off' },
  { value: 'buy_x_get_y', label: 'Buy X get Y' },
  { value: 'price_drop', label: 'Price drop' },
  { value: 'up_to', label: 'Up to' },
  { value: 'other', label: 'Other' },
];

/**
 * The View Offers page (§5). All filtering, sorting and distance work happens
 * server-side; this component only translates UI state into query parameters
 * and keeps them in the URL so a filtered view can be shared or bookmarked.
 */
@Component({
  selector: 'app-offer-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    OfferCardComponent,
    PaginationComponent,
    EmptyStateComponent,
    CardSkeletonsComponent,
  ],
  templateUrl: './offer-list.component.html',
  styleUrl: './offer-list.component.scss',
})
export class OfferListComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly locations = inject(LocationService);

  readonly sorts = SORTS;
  readonly offerTypes = OFFER_TYPES;
  readonly cities = SUGGESTED_CITIES;
  readonly radiusOptions = environment.radiusOptions;

  readonly offers = signal<Offer[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly categories = signal<Category[]>([]);
  readonly shops = signal<Shop[]>([]);
  readonly filtersOpen = signal(false);

  /** "Nearby" mode is the same page with the radius filter switched on (§8.4). */
  readonly nearbyMode = signal(false);

  // Filter state, hydrated from the URL on every navigation.
  search = '';
  categoryId: number | null = null;
  shopId: number | null = null;
  city = '';
  pincode = '';
  radius: number | null = null;
  minDiscount: number | null = null;
  offerType = '';
  expiringInDays: number | null = null;
  sort: OfferSort = 'newest';
  page = 1;

  private readonly searchInput$ = new Subject<string>();

  readonly activeFilterCount = computed(() => this.countActiveFilters());
  private readonly filterTick = signal(0);

  constructor() {
    this.nearbyMode.set(this.route.snapshot.data['nearby'] === true);

    this.searchInput$.pipe(debounceTime(350), distinctUntilChanged()).subscribe((value) => {
      this.search = value;
      this.page = 1;
      this.applyToUrl();
    });

    this.route.queryParamMap.subscribe((params) => {
      this.search = params.get('search') ?? '';
      this.categoryId = this.num(params.get('categoryId'));
      this.shopId = this.num(params.get('shopId'));
      this.city = params.get('city') ?? '';
      this.pincode = params.get('pincode') ?? '';
      this.minDiscount = this.num(params.get('minDiscount'));
      this.offerType = params.get('offerType') ?? '';
      this.expiringInDays = this.num(params.get('expiringInDays'));
      this.page = this.num(params.get('page')) ?? 1;

      const radiusParam = this.num(params.get('radius'));
      this.radius = radiusParam ?? (this.nearbyMode() ? environment.defaultRadiusKm : null);

      const sortParam = params.get('sort') as OfferSort | null;
      this.sort = sortParam ?? (this.nearbyMode() ? 'nearest' : 'newest');

      this.filterTick.update((tick) => tick + 1);
      this.load();
    });

    this.api.listCategories().subscribe((categories) => this.categories.set(categories));
    this.api
      .listShops({ limit: 100, sort: 'name' })
      .subscribe((page) => this.shops.set(page.items));
  }

  // ---- Data ---------------------------------------------------------------

  private load(): void {
    this.loading.set(true);
    const position = this.locations.position;

    const query: OfferQuery = {
      page: this.page,
      limit: environment.pageSize,
      search: this.search || undefined,
      categoryId: this.categoryId ?? undefined,
      shopId: this.shopId ?? undefined,
      city: this.city || undefined,
      pincode: this.pincode || undefined,
      minDiscount: this.minDiscount ?? undefined,
      offerType: (this.offerType || undefined) as OfferQuery['offerType'],
      expiringInDays: this.expiringInDays ?? undefined,
      sort: this.sort,
    };

    // Coordinates are only sent when we actually have them; the radius filter
    // and "nearest" sort are dropped otherwise so browsing never breaks (§8.6).
    if (position) {
      query.latitude = position.latitude!;
      query.longitude = position.longitude!;
      if (this.radius) query.radius = this.radius;
    } else if (this.sort === 'nearest') {
      query.sort = 'newest';
    }

    this.api.listOffers(query).subscribe({
      next: (result) => {
        this.offers.set(result.items);
        this.meta.set(result.meta);
        this.loading.set(false);
      },
      error: () => {
        this.offers.set([]);
        this.meta.set(null);
        this.loading.set(false);
      },
    });
  }

  // ---- Filter interactions ------------------------------------------------

  onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  setCategory(id: number | null): void {
    this.categoryId = this.categoryId === id ? null : id;
    this.page = 1;
    this.applyToUrl();
  }

  setSort(sort: OfferSort): void {
    if (sort === 'nearest' && !this.locations.hasPosition()) {
      this.toast.info('Share or choose a location to sort by distance.');
      return;
    }
    this.sort = sort;
    this.page = 1;
    this.applyToUrl();
  }

  setRadius(km: number | null): void {
    if (km !== null && !this.locations.hasPosition()) {
      this.toast.info('Share or choose a location to filter by distance.');
      return;
    }
    this.radius = this.radius === km ? null : km;
    this.page = 1;
    this.applyToUrl();
  }

  applyFilters(): void {
    this.page = 1;
    this.filtersOpen.set(false);
    this.applyToUrl();
  }

  clearFilters(): void {
    this.search = '';
    this.categoryId = null;
    this.shopId = null;
    this.city = '';
    this.pincode = '';
    this.minDiscount = null;
    this.offerType = '';
    this.expiringInDays = null;
    this.radius = this.nearbyMode() ? environment.defaultRadiusKm : null;
    this.sort = this.nearbyMode() ? 'nearest' : 'newest';
    this.page = 1;
    this.applyToUrl();
  }

  goToPage(page: number): void {
    this.page = page;
    this.applyToUrl();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useMyLocation(): void {
    this.locations.requestCurrentPosition();
    // The service updates asynchronously; reload once it settles.
    setTimeout(() => this.load(), 900);
  }

  pickCity(city: (typeof SUGGESTED_CITIES)[number]): void {
    this.locations.selectCity(city);
    this.load();
  }

  // ---- Favourites ---------------------------------------------------------

  toggleFavorite(offer: Offer): void {
    const request = offer.isFavorite
      ? this.api.removeFavorite(offer.id)
      : this.api.addFavorite(offer.id);

    // Optimistic: flip immediately, roll back if the call fails.
    this.patchOffer(offer.id, { isFavorite: !offer.isFavorite });
    request.subscribe({
      next: () => {
        this.toast.success(offer.isFavorite ? 'Removed from favourites' : 'Saved to favourites');
      },
      error: () => this.patchOffer(offer.id, { isFavorite: offer.isFavorite }),
    });
  }

  promptLogin(): void {
    this.toast.info('Sign in to save offers.');
    void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
  }

  private patchOffer(id: number, changes: Partial<Offer>): void {
    this.offers.update((list) =>
      list.map((offer) => (offer.id === id ? { ...offer, ...changes } : offer)),
    );
  }

  // ---- URL sync -----------------------------------------------------------

  private applyToUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        search: this.search || null,
        categoryId: this.categoryId,
        shopId: this.shopId,
        city: this.city || null,
        pincode: this.pincode || null,
        radius: this.radius,
        minDiscount: this.minDiscount,
        offerType: this.offerType || null,
        expiringInDays: this.expiringInDays,
        sort: this.sort,
        page: this.page > 1 ? this.page : null,
      },
      queryParamsHandling: 'merge',
    });
  }

  private countActiveFilters(): number {
    this.filterTick();
    let count = 0;
    if (this.categoryId) count++;
    if (this.shopId) count++;
    if (this.city) count++;
    if (this.pincode) count++;
    if (this.minDiscount) count++;
    if (this.offerType) count++;
    if (this.expiringInDays) count++;
    if (this.radius) count++;
    return count;
  }

  private num(value: string | null): number | null {
    if (value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  categoryName(id: number | null): string {
    return this.categories().find((category) => category.id === id)?.name ?? '';
  }
}
