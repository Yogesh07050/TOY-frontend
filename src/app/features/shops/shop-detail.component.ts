import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { ApiService } from '../../core/api.service';
import { AuthPromptService } from '../../core/auth-prompt.service';
import { SeoService } from '../../core/seo.service';
import { AuthService } from '../../core/auth.service';
import { LocationService } from '../../core/location.service';
import { ToastService } from '../../core/toast.service';
import { Branch, Offer, OpeningHours, Shop } from '../../core/models';
import { PERMISSIONS } from '../../core/permissions';
import { DistancePipe } from '../../shared/offer-badge.pipe';
import { OfferCardComponent } from '../../shared/offer-card.component';
import { EmptyStateComponent, StarsComponent } from '../../shared/ui.components';
import { IconComponent } from '../../shared/icon.component';

/** One row of the opening-hours table. */
interface DayHours {
  key: string;
  label: string;
  hours: string;
  isToday: boolean;
}

/** Shop details page (§12): profile, branches, map, and the shop's offers. */
@Component({
  selector: 'app-shop-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DistancePipe,
    OfferCardComponent,
    EmptyStateComponent,
    StarsComponent,
    IconComponent,
  ],
  templateUrl: './shop-detail.component.html',
  styleUrl: './shop-detail.component.scss',
})
export class ShopDetailComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly auth = inject(AuthService);
  readonly prompt = inject(AuthPromptService);
  private readonly seo = inject(SeoService);
  readonly locations = inject(LocationService);

  readonly shop = signal<Shop | null>(null);
  readonly offers = signal<Offer[]>([]);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly loadingOffers = signal(false);
  readonly selectedBranch = signal<number | null>(null);
  /** 'active' shows live offers; 'expired' shows the archive (§12). */
  readonly tab = signal<'active' | 'expired'>('active');
  readonly canManage = signal(false);

  private readonly mapUrlCache = new Map<number, SafeResourceUrl | null>();

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const idOrSlug = params.get('idOrSlug');
      if (idOrSlug) this.load(idOrSlug);
    });
  }

  private load(idOrSlug: string): void {
    this.loading.set(true);
    this.notFound.set(false);
    this.mapUrlCache.clear();

    this.api.getShop(idOrSlug, this.locations.position).subscribe({
      next: (shop) => {
        this.shop.set(shop);
        this.seo.shop(shop);
        this.loading.set(false);
        this.canManage.set(this.auth.hasForShop(shop.id, PERMISSIONS.EDIT_SHOP));
        this.loadOffers();
      },
      error: () => {
        this.loading.set(false);
        this.notFound.set(true);
      },
    });
  }

  loadOffers(): void {
    const shop = this.shop();
    if (!shop) return;

    this.loadingOffers.set(true);
    const position = this.locations.position;

    this.api
      .listOffers({
        shopId: shop.id,
        branchId: this.selectedBranch() ?? undefined,
        limit: 24,
        // Expired offers are only reachable through the management view.
        manage: this.tab() === 'expired' ? true : undefined,
        status: this.tab() === 'expired' ? 'expired' : undefined,
        latitude: position?.latitude ?? undefined,
        longitude: position?.longitude ?? undefined,
      })
      .subscribe({
        next: (page) => {
          this.offers.set(page.items);
          this.loadingOffers.set(false);
        },
        error: () => {
          this.offers.set([]);
          this.loadingOffers.set(false);
        },
      });
  }

  selectTab(tab: 'active' | 'expired'): void {
    this.tab.set(tab);
    this.loadOffers();
  }

  selectBranch(branchId: number | null): void {
    this.selectedBranch.set(this.selectedBranch() === branchId ? null : branchId);
    this.loadOffers();
  }

  toggleFollow(): void {
    const shop = this.shop();
    if (!shop) return;
    if (!this.prompt.require('follow-shop', () => this.toggleFollow())) return;

    const following = Boolean(shop.isFollowing);
    const request = following ? this.api.unfollowShop(shop.id) : this.api.followShop(shop.id);

    this.shop.set({
      ...shop,
      isFollowing: !following,
      followerCount: (shop.followerCount ?? 0) + (following ? -1 : 1),
    });
    request.subscribe({
      next: () => this.toast.success(following ? `Unfollowed ${shop.name}` : `Following ${shop.name}`),
      error: () => this.shop.set(shop),
    });
  }

  toggleFavorite(offer: Offer): void {
    const request = offer.isFavorite
      ? this.api.removeFavorite(offer.id)
      : this.api.addFavorite(offer.id);

    this.offers.update((list) =>
      list.map((item) => (item.id === offer.id ? { ...item, isFavorite: !item.isFavorite } : item)),
    );
    request.subscribe({
      error: () =>
        this.offers.update((list) =>
          list.map((item) => (item.id === offer.id ? { ...item, isFavorite: offer.isFavorite } : item)),
        ),
    });
  }

  promptLogin(offer: Offer): void {
    this.prompt.require('save-offer', () => this.toggleFavorite(offer));
  }

  /** Cached so the iframe is not recreated on every change-detection pass. */
  mapUrl(branch: Branch): SafeResourceUrl | null {
    const cached = this.mapUrlCache.get(branch.id);
    if (cached !== undefined) return cached;

    let result: SafeResourceUrl | null = null;
    if (branch.latitude !== null && branch.longitude !== null) {
      const delta = 0.008;
      const bbox = [
        branch.longitude - delta,
        branch.latitude - delta,
        branch.longitude + delta,
        branch.latitude + delta,
      ]
        .map((value) => value.toFixed(6))
        .join(',');
      result = this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik` +
          `&marker=${branch.latitude},${branch.longitude}`,
      );
    }
    this.mapUrlCache.set(branch.id, result);
    return result;
  }

  directionsUrl(branch: Branch): string {
    if (branch.latitude !== null && branch.longitude !== null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`;
    }
    const query = [branch.branchName, branch.address, branch.city].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  /**
   * The branch address on one line (§11).
   *
   * `area` is dropped when the street address already names it - merchants
   * routinely write "123 Avinashi Road, Peelamedu" and then pick Peelamedu
   * from the map as well, and printing both reads as a stutter.
   */
  addressLine(branch: Branch): string {
    const parts = [branch.address, branch.addressLine2, branch.area, branch.city];
    const seen: string[] = [];
    for (const part of parts) {
      const value = part?.trim();
      if (!value) continue;
      const lower = value.toLowerCase();
      if (seen.some((existing) => existing.toLowerCase().includes(lower))) continue;
      seen.push(value);
    }
    return seen.join(', ');
  }

  /**
   * The week as a customer reads it (§3, §11).
   *
   * Days the merchant never filled in are left out rather than shown as
   * closed - an unanswered question is not a "no", and printing "Closed"
   * against a day the shop actually opens is worse than saying nothing.
   */
  openingHours(hours: OpeningHours | null): DayHours[] | null {
    if (!hours) return null;

    const days: { key: keyof OpeningHours; label: string }[] = [
      { key: 'mon', label: 'Monday' },
      { key: 'tue', label: 'Tuesday' },
      { key: 'wed', label: 'Wednesday' },
      { key: 'thu', label: 'Thursday' },
      { key: 'fri', label: 'Friday' },
      { key: 'sat', label: 'Saturday' },
      { key: 'sun', label: 'Sunday' },
    ];
    // JavaScript starts its week on Sunday; the list above starts on Monday.
    const todayKey = days[(new Date().getDay() + 6) % 7].key;

    const rows = days.flatMap(({ key, label }) => {
      const value = hours[key];
      if (value === undefined) return [];
      const text =
        value === 'closed'
          ? 'Closed'
          : value.map((window) => `${window.open}–${window.close}`).join(', ');
      return [{ key, label, hours: text, isToday: key === todayKey }];
    });

    return rows.length ? rows : null;
  }

  websiteLabel(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  socialEntries(links: Record<string, string> | null): { key: string; url: string }[] {
    if (!links) return [];
    return Object.entries(links).map(([key, url]) => ({ key, url }));
  }
}
