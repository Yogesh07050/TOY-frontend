import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { ApiService } from '../../core/api.service';
import { AuthPromptService } from '../../core/auth-prompt.service';
import { SeoService } from '../../core/seo.service';
import { AuthService } from '../../core/auth.service';
import { LocationService } from '../../core/location.service';
import { ToastService } from '../../core/toast.service';
import { Branch, Offer, Review } from '../../core/models';
import { PERMISSIONS } from '../../core/permissions';
import { DiscountChipPipe, DistancePipe, OfferHeadlinePipe, StatusClassPipe } from '../../shared/offer-badge.pipe';
import { EmptyStateComponent, StarsComponent } from '../../shared/ui.components';
import { IconComponent } from '../../shared/icon.component';

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

/** Offer details page (§11): full offer info, locations, map, sharing, reviews. */
@Component({
  selector: 'app-offer-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    OfferHeadlinePipe,
    DiscountChipPipe,
    DistancePipe,
    StatusClassPipe,
    StarsComponent,
    EmptyStateComponent,
    IconComponent,
  ],
  templateUrl: './offer-detail.component.html',
  styleUrl: './offer-detail.component.scss',
})
export class OfferDetailComponent implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly auth = inject(AuthService);
  readonly prompt = inject(AuthPromptService);
  private readonly seo = inject(SeoService);
  readonly locations = inject(LocationService);

  private readonly mapUrlCache = new Map<number, SafeResourceUrl | null>();

  readonly offer = signal<Offer | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly reviews = signal<Review[]>([]);
  readonly relatedOffers = signal<Offer[]>([]);
  readonly activeImage = signal(0);
  readonly shareOpen = signal(false);
  readonly countdown = signal<Countdown | null>(null);

  readonly canEdit = signal(false);
  myRating = 0;
  myComment = '';
  readonly submittingReview = signal(false);

  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (Number.isFinite(id)) this.load(id);
    });
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private load(id: number): void {
    this.loading.set(true);
    this.notFound.set(false);

    this.api.getOffer(id, this.locations.position).subscribe({
      next: (offer) => {
        this.offer.set(offer);
        // §27: public offer pages are indexable, so they describe themselves.
        this.seo.offer(offer);
        this.loading.set(false);
        this.activeImage.set(0);
        this.canEdit.set(this.auth.hasForShop(offer.shop.id, PERMISSIONS.EDIT_OFFER));
        this.startCountdown(offer);

        // Count the view once the page has actually rendered the offer.
        this.api.trackOffer(offer.id, 'view').subscribe({ error: () => undefined });

        this.api
          .listOfferReviews(offer.id, { limit: 20 })
          .subscribe((page) => this.reviews.set(page.items));

        this.loadRelated(offer);
        this.hydrateMyReview();
      },
      error: () => {
        this.loading.set(false);
        this.notFound.set(true);
      },
    });
  }

  private loadRelated(offer: Offer): void {
    const position = this.locations.position;
    this.api
      .listOffers({
        shopId: offer.shop.id,
        limit: 4,
        latitude: position?.latitude ?? undefined,
        longitude: position?.longitude ?? undefined,
      })
      .subscribe((page) =>
        this.relatedOffers.set(page.items.filter((item) => item.id !== offer.id).slice(0, 3)),
      );
  }

  private hydrateMyReview(): void {
    const userId = this.auth.user()?.id;
    if (!userId) return;
    const mine = this.reviews().find((review) => review.user.id === userId);
    if (mine) {
      this.myRating = mine.rating;
      this.myComment = mine.comment ?? '';
    }
  }

  /** Live "remaining validity" counter (§11). */
  private startCountdown(offer: Offer): void {
    if (this.timer) clearInterval(this.timer);
    const tick = () => {
      const remaining = new Date(offer.endDate).getTime() - Date.now();
      if (remaining <= 0) {
        this.countdown.set({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        if (this.timer) clearInterval(this.timer);
        return;
      }
      this.countdown.set({
        days: Math.floor(remaining / 86400000),
        hours: Math.floor((remaining / 3600000) % 24),
        minutes: Math.floor((remaining / 60000) % 60),
        seconds: Math.floor((remaining / 1000) % 60),
        expired: false,
      });
    };
    tick();
    this.timer = setInterval(tick, 1000);
  }

  // ---- Actions ------------------------------------------------------------

  toggleFavorite(): void {
    const offer = this.offer();
    if (!offer) return;
    // §13: the offer page is fully public; only the save needs an account.
    if (!this.prompt.require('save-offer', () => this.toggleFavorite())) return;

    const request = offer.isFavorite
      ? this.api.removeFavorite(offer.id)
      : this.api.addFavorite(offer.id);

    this.offer.set({ ...offer, isFavorite: !offer.isFavorite });
    request.subscribe({
      next: () => this.toast.success(offer.isFavorite ? 'Removed from favourites' : 'Saved'),
      error: () => this.offer.set(offer),
    });
  }

  // ---- Claiming (Claim/Redemption §3) --------------------------------------

  readonly claiming = signal(false);

  /**
   * Whether the Claim button belongs on screen at all.
   *
   * Only a live offer can produce a usable code, and an online-only offer has
   * no counter to walk into - showing a Claim button there would hand the
   * customer a code that §16 guarantees no branch will accept.
   */
  claimable(offer: Offer): boolean {
    return (
      offer.status === 'active' &&
      offer.applicabilityType !== 'online' &&
      new Date(offer.endDate) >= new Date()
    );
  }

  /**
   * §3: a guest who clicks Claim is asked to sign in, and the claim then
   * completes on its own - they do not have to find the offer again and press
   * the button a second time.
   */
  claimOffer(): void {
    const offer = this.offer();
    if (!offer) return;
    if (!this.prompt.require('claim-offer', () => this.claimOffer())) return;

    this.claiming.set(true);
    this.api.claimOffer(offer.id).subscribe({
      next: (claim) => {
        this.claiming.set(false);
        this.offer.set({
          ...offer,
          myClaim: {
            id: claim.id,
            code: claim.code,
            status: claim.status,
            expiresAt: claim.expiresAt,
          },
        });
        // Straight to the code: the customer claimed it because they intend to
        // use it, and the next thing they need is the thing to show at the till.
        void this.router.navigate(['/claims', claim.id]);
      },
      error: (error) => {
        this.claiming.set(false);
        this.toast.error(error?.error?.error?.message ?? 'This offer could not be claimed.');
      },
    });
  }

  followShop(): void {
    const offer = this.offer();
    if (!offer) return;
    if (!this.prompt.require('follow-shop', () => this.followShop())) return;
    this.api.followShop(offer.shop.id).subscribe({
      next: () => this.toast.success(`You are now following ${offer.shop.name}.`),
    });
  }

  // ---- Sharing (§25) ------------------------------------------------------

  get shareUrl(): string {
    return `${window.location.origin}/offers/${this.offer()?.id}`;
  }

  get shareText(): string {
    const offer = this.offer();
    if (!offer) return '';
    return `${offer.shop.name}: ${offer.offerText || offer.title}`;
  }

  share(channel: 'whatsapp' | 'email' | 'copy' | 'native'): void {
    const offer = this.offer();
    if (!offer) return;

    this.api.trackOffer(offer.id, 'share').subscribe({ error: () => undefined });
    const url = this.shareUrl;
    const text = this.shareText;

    switch (channel) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener');
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(
          `${text}\n\n${url}`,
        )}`;
        break;
      case 'native':
        if (navigator.share) {
          void navigator.share({ title: offer.title, text, url }).catch(() => undefined);
        }
        break;
      case 'copy':
      default:
        void navigator.clipboard
          .writeText(url)
          .then(() => this.toast.success('Link copied to clipboard'))
          .catch(() => this.toast.error('Could not copy the link'));
        break;
    }
    this.shareOpen.set(false);
  }

  get canUseNativeShare(): boolean {
    return typeof navigator !== 'undefined' && 'share' in navigator;
  }

  // ---- Directions ---------------------------------------------------------

  /**
   * Embedded map for a branch. OpenStreetMap needs no API key. The URL is built
   * entirely from numeric coordinates, so marking it trusted is safe here.
   */
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

    // Cached because a fresh SafeResourceUrl on every change-detection pass
    // would reload the iframe continuously.
    this.mapUrlCache.set(branch.id, result);
    return result;
  }

  directionsUrl(branch: Branch): string {
    if (branch.latitude !== null && branch.longitude !== null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`;
    }
    const query = [branch.branchName, branch.address, branch.city, branch.pincode]
      .filter(Boolean)
      .join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  trackClick(branch: Branch): void {
    const offer = this.offer();
    if (offer) this.api.trackOffer(offer.id, 'click', branch.id).subscribe({ error: () => undefined });
  }

  // ---- Reviews (§26) ------------------------------------------------------

  submitReview(): void {
    const offer = this.offer();
    if (!offer || !this.myRating) {
      this.toast.info('Choose a star rating first.');
      return;
    }

    this.submittingReview.set(true);
    this.api.submitReview(offer.id, this.myRating, this.myComment || null).subscribe({
      next: (review) => {
        this.submittingReview.set(false);
        this.reviews.update((list) => [review, ...list.filter((item) => item.id !== review.id)]);
        this.toast.success('Thanks for your review.');
      },
      error: () => this.submittingReview.set(false),
    });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  get savings(): number | null {
    const offer = this.offer();
    if (!offer?.originalPrice || !offer.discountedPrice) return null;
    return offer.originalPrice - offer.discountedPrice;
  }
}
