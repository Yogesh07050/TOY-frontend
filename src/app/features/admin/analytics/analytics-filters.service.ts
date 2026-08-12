import { Injectable, computed, inject, signal } from '@angular/core';

import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { SubscriptionService } from '../../../core/subscription.service';
import { AnalyticsFilters, Branch, Campaign, Category, DatePreset, Shop } from '../../../core/models';

/**
 * The filter state shared by every premium dashboard (V3 §27).
 *
 * Held in one service rather than per component so moving between Overview,
 * Offer Performance and Reports keeps the merchant's date range and branch
 * selection — re-picking "last 90 days" on every tab is the main thing that
 * makes a multi-page analytics area tiring to use.
 */

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'custom', label: 'Custom range' },
];

@Injectable({ providedIn: 'root' })
export class AnalyticsFiltersService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly subscriptions = inject(SubscriptionService);

  readonly preset = signal<DatePreset>('last30');
  readonly from = signal<string>('');
  readonly to = signal<string>('');
  readonly shopId = signal<number | null>(null);
  readonly branchId = signal<number | null>(null);
  readonly categoryId = signal<number | null>(null);
  readonly campaignId = signal<number | null>(null);
  readonly city = signal<string | null>(null);

  /** Options for the selects, loaded once. */
  readonly shops = signal<Shop[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly campaigns = signal<Campaign[]>([]);

  private optionsLoaded = false;

  /**
   * The query every dashboard sends. A custom range without both ends is
   * ignored rather than sent half-formed, which the API would otherwise have to
   * guess at.
   */
  readonly query = computed<AnalyticsFilters>(() => {
    const preset = this.preset();
    const custom = preset === 'custom' && this.from() && this.to();

    return {
      preset: custom ? 'custom' : preset === 'custom' ? 'last30' : preset,
      from: custom ? this.from() : undefined,
      to: custom ? this.to() : undefined,
      shopId: this.shopId(),
      branchId: this.branchId(),
      categoryId: this.categoryId(),
      campaignId: this.campaignId(),
      city: this.city(),
    };
  });

  /** A stable string, so components can react to "the filters changed". */
  readonly signature = computed(() => JSON.stringify(this.query()));

  readonly presetLabel = computed(
    () => DATE_PRESETS.find((option) => option.value === this.preset())?.label ?? '',
  );

  loadOptions(): void {
    if (this.optionsLoaded) return;
    this.optionsLoaded = true;

    this.api.listShops({ mine: !this.auth.isSuperAdmin, limit: 100, status: 'all' }).subscribe({
      next: (page) => {
        this.shops.set(page.items);
        // With exactly one shop there is nothing to choose, so it is selected
        // outright - that also narrows the plan the analytics area reports on.
        if (page.items.length === 1) this.setShop(page.items[0].id);
      },
      error: () => undefined,
    });

    this.api.listCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => undefined,
    });

    this.api.listCampaigns().subscribe({
      next: (campaigns) => this.campaigns.set(campaigns),
      error: () => undefined,
    });
  }

  setShop(shopId: number | null): void {
    this.shopId.set(shopId);
    // A branch belongs to a shop, so it cannot survive the shop changing.
    this.branchId.set(null);
    this.branches.set([]);
    this.subscriptions.activeShopId.set(shopId);

    if (shopId !== null) {
      this.api.listBranches(shopId).subscribe({
        next: (branches) => this.branches.set(branches),
        error: () => undefined,
      });
    }
  }

  setPreset(preset: DatePreset): void {
    this.preset.set(preset);
  }

  reset(): void {
    this.preset.set('last30');
    this.from.set('');
    this.to.set('');
    this.branchId.set(null);
    this.categoryId.set(null);
    this.campaignId.set(null);
    this.city.set(null);
  }

  /** True when a filter beyond the date range is applied. */
  readonly hasNarrowing = computed(
    () =>
      this.branchId() !== null ||
      this.categoryId() !== null ||
      this.campaignId() !== null ||
      this.city() !== null,
  );
}
