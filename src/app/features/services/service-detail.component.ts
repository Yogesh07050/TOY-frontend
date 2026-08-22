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
import { Branch, Service } from '../../core/models';
import { PERMISSIONS } from '../../core/permissions';
import { DistancePipe } from '../../shared/offer-badge.pipe';
import {
  ServiceOfferChipPipe,
  ServiceOfferValidityPipe,
  ServicePriceLabelPipe,
  ServiceStatusClassPipe,
} from '../../shared/service-badge.pipe';
import { EmptyStateComponent } from '../../shared/ui.components';
import { IconComponent } from '../../shared/icon.component';

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

/** Service details page (§11): pricing, availability, booking and location information. */
@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DistancePipe,
    ServiceOfferChipPipe,
    ServiceOfferValidityPipe,
    ServicePriceLabelPipe,
    ServiceStatusClassPipe,
    EmptyStateComponent,
    IconComponent,
  ],
  templateUrl: './service-detail.component.html',
  styleUrl: './service-detail.component.scss',
})
export class ServiceDetailComponent implements OnDestroy {
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

  readonly service = signal<Service | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly activeImage = signal(0);
  readonly shareOpen = signal(false);
  readonly countdown = signal<Countdown | null>(null);
  readonly canEdit = signal(false);

  readonly bookingMode = signal<'book' | 'enquire' | null>(null);
  readonly bookingSubmitting = signal(false);
  readonly bookingBranchId = signal<number | null>(null);
  bookingRequestedAt = '';
  bookingNotes = '';

  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (Number.isFinite(id)) this.load(id);
    });

    // §14/§7: a guest who tapped Book Now and then signed in comes back to a
    // fresh instance of this page. The intent travels in the url rather than in
    // a closure over the component that no longer exists, so the form is open
    // and waiting for them.
    this.route.queryParamMap.subscribe((params) => {
      const mode = params.get('book');
      if (mode === 'book' || mode === 'enquire') this.bookingMode.set(mode);
    });
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private load(id: number): void {
    this.loading.set(true);
    this.notFound.set(false);

    this.api.getService(id, this.locations.position).subscribe({
      next: (service) => {
        this.service.set(service);
        this.seo.service(service);
        this.loading.set(false);
        this.activeImage.set(0);
        this.canEdit.set(this.auth.hasForShop(service.shop.id, PERMISSIONS.EDIT_SERVICE));
        this.bookingBranchId.set(service.branches?.[0]?.id ?? null);
        this.startCountdown(service);

        this.api.trackService(service.id, 'view').subscribe({ error: () => undefined });
      },
      error: () => {
        this.loading.set(false);
        this.notFound.set(true);
      },
    });
  }

  private startCountdown(service: Service): void {
    if (this.timer) clearInterval(this.timer);
    const endDate = service.activeOffer?.endDate;
    if (!endDate) {
      this.countdown.set(null);
      return;
    }

    const tick = () => {
      const remaining = new Date(endDate).getTime() - Date.now();
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

  toggleSave(): void {
    const service = this.service();
    if (!service) return;
    // §14: the whole service page is public; only the save needs an account.
    if (!this.prompt.require('save-service', () => this.toggleSave())) return;

    const request = service.isSaved ? this.api.unsaveService(service.id) : this.api.saveService(service.id);

    this.service.set({ ...service, isSaved: !service.isSaved });
    request.subscribe({
      next: () => this.toast.success(service.isSaved ? 'Removed from saved' : 'Saved'),
      error: () => this.service.set(service),
    });
  }

  // ---- Booking / enquiry ----------------------------------------------------

  get showBookButton(): boolean {
    const type = this.service()?.bookingType;
    return type === 'appointment' || type === 'both';
  }

  get showEnquireButton(): boolean {
    const type = this.service()?.bookingType;
    return type === 'enquiry_only' || type === 'both';
  }

  get isWalkInOnly(): boolean {
    return this.service()?.bookingType === 'walk_in';
  }

  /**
   * §14: "Guest -> [Book Now] -> Login / Sign Up". The booking form opens by
   * itself once the customer is back, so the tap is not wasted.
   */
  openBooking(mode: 'book' | 'enquire'): void {
    const intent = mode === 'book' ? 'book-service' : 'enquire-service';
    // The returnUrl the prompt captures is this page's current url, so adding
    // the mode to it now is what reopens the form after the login (§7).
    if (!this.prompt.require(intent, undefined, { returnTo: this.urlWithBooking(mode) })) return;
    this.bookingMode.set(this.bookingMode() === mode ? null : mode);
  }

  private urlWithBooking(mode: 'book' | 'enquire'): string {
    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: { book: mode },
      queryParamsHandling: 'merge',
    });
    return this.router.serializeUrl(tree);
  }

  submitBooking(): void {
    const service = this.service();
    const mode = this.bookingMode();
    if (!service || !mode) return;

    this.bookingSubmitting.set(true);
    this.api
      .bookService(service.id, {
        branchId: this.bookingBranchId(),
        serviceOfferId: service.activeOffer?.id ?? null,
        requestedAt: mode === 'book' && this.bookingRequestedAt ? new Date(this.bookingRequestedAt).toISOString() : null,
        notes: this.bookingNotes || null,
      })
      .subscribe({
        next: () => {
          this.bookingSubmitting.set(false);
          this.bookingMode.set(null);
          this.bookingNotes = '';
          this.bookingRequestedAt = '';
          this.toast.success(mode === 'book' ? 'Booking requested.' : 'Enquiry sent.');
        },
        error: () => this.bookingSubmitting.set(false),
      });
  }

  // ---- Sharing --------------------------------------------------------------

  get shareUrl(): string {
    return `${window.location.origin}/services/${this.service()?.id}`;
  }

  get shareText(): string {
    const service = this.service();
    if (!service) return '';
    return `${service.shop.name}: ${service.name}`;
  }

  share(channel: 'whatsapp' | 'email' | 'copy' | 'native'): void {
    const service = this.service();
    if (!service) return;

    this.api.trackService(service.id, 'share').subscribe({ error: () => undefined });
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
          void navigator.share({ title: service.name, text, url }).catch(() => undefined);
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

  // ---- Directions -------------------------------------------------------------

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
    const query = [branch.branchName, branch.address, branch.city, branch.pincode]
      .filter(Boolean)
      .join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  trackClick(branch: Branch): void {
    const service = this.service();
    if (service) this.api.trackService(service.id, 'click', branch.id).subscribe({ error: () => undefined });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /** MySQL TIME values arrive as "HH:MM:SS" - trim to "HH:MM" for display. */
  formatTime(value: string): string {
    return value.slice(0, 5);
  }

  formatDays(days: string[]): string {
    const labels: Record<string, string> = {
      mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
    };
    return days.map((day) => labels[day] ?? day).join(', ');
  }
}
