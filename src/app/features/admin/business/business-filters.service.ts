import { Injectable, computed, inject, signal } from '@angular/core';

import { ApiService } from '../../../core/api.service';
import {
  BusinessFilterOptions,
  BusinessFilters,
  DatePreset,
  ListingTypeFilter,
} from '../../../core/models';

/**
 * The filter state shared by every Business Dashboard page (Business §32).
 *
 * A separate service from `AnalyticsFiltersService` rather than a superset of
 * it. The two overlap on the date range and little else: a merchant filters by
 * their own branches and campaigns, a platform owner filters by city,
 * subscription plan and acquisition channel. Sharing one service would mean a
 * merchant's branch selection surviving into a platform-wide revenue query,
 * and a plan filter appearing on a screen where it means nothing.
 */

export const BUSINESS_DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'custom', label: 'Custom' },
];

@Injectable({ providedIn: 'root' })
export class BusinessFiltersService {
  private readonly api = inject(ApiService);

  readonly preset = signal<DatePreset>('last30');
  readonly from = signal('');
  readonly to = signal('');
  readonly city = signal<string | null>(null);
  readonly area = signal<string | null>(null);
  readonly categoryId = signal<number | null>(null);
  readonly listingType = signal<ListingTypeFilter>('all');
  readonly plan = signal<string | null>(null);
  readonly shopId = signal<number | null>(null);
  readonly acquisitionChannel = signal<string | null>(null);

  readonly options = signal<BusinessFilterOptions | null>(null);
  private optionsLoaded = false;

  /**
   * A half-finished custom range is dropped rather than sent, because the API
   * would have to invent the missing end and would invent a different one than
   * the label on screen implies.
   */
  readonly query = computed<BusinessFilters>(() => {
    const preset = this.preset();
    const custom = preset === 'custom' && this.from() && this.to();

    return {
      preset: custom ? 'custom' : preset === 'custom' ? 'last30' : preset,
      from: custom ? this.from() : undefined,
      to: custom ? this.to() : undefined,
      city: this.city(),
      area: this.area(),
      categoryId: this.categoryId(),
      listingType: this.listingType(),
      plan: this.plan(),
      shopId: this.shopId(),
      acquisitionChannel: this.acquisitionChannel(),
    };
  });

  /** A stable string, so a page can react to "the filters changed". */
  readonly signature = computed(() => JSON.stringify(this.query()));

  readonly presetLabel = computed(
    () => BUSINESS_DATE_PRESETS.find((option) => option.value === this.preset())?.label ?? '',
  );

  /** True when something beyond the date range is narrowing the numbers. */
  readonly hasNarrowing = computed(
    () =>
      this.city() !== null ||
      this.area() !== null ||
      this.categoryId() !== null ||
      this.plan() !== null ||
      this.shopId() !== null ||
      this.acquisitionChannel() !== null ||
      this.listingType() !== 'all',
  );

  loadOptions(): void {
    if (this.optionsLoaded) return;
    this.optionsLoaded = true;

    this.api.businessFilterOptions().subscribe({
      next: (options) => this.options.set(options),
      // A failed options load costs the selects their contents, not the page
      // its numbers. Leaving it silent keeps a dependency wobble from
      // producing a second error message about something the reader did not
      // ask for (§37: unaffected areas remain usable).
      error: () => {
        this.optionsLoaded = false;
      },
    });
  }

  setPreset(preset: DatePreset): void {
    this.preset.set(preset);
  }

  setCity(city: string | null): void {
    this.city.set(city);
    // An area belongs to a city, so it cannot survive the city changing.
    this.area.set(null);
  }

  reset(): void {
    this.preset.set('last30');
    this.from.set('');
    this.to.set('');
    this.city.set(null);
    this.area.set(null);
    this.categoryId.set(null);
    this.listingType.set('all');
    this.plan.set(null);
    this.shopId.set(null);
    this.acquisitionChannel.set(null);
  }
}
