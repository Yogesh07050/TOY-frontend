import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';
import { ApiService } from '../../core/api.service';
import { LocationService } from '../../core/location.service';
import { ToastService } from '../../core/toast.service';
import { Offer, PageMeta, Service } from '../../core/models';
import { OfferCardComponent } from '../../shared/offer-card.component';
import { ServiceCardComponent } from '../../shared/service-card.component';
import { CardSkeletonsComponent, EmptyStateComponent, PaginationComponent } from '../../shared/ui.components';

type SavedTab = 'offers' | 'services';

/** Saved (§22, §37): saved offers and saved services, in tabs. */
@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    OfferCardComponent,
    ServiceCardComponent,
    PaginationComponent,
    EmptyStateComponent,
    CardSkeletonsComponent,
  ],
  templateUrl: './favorites.component.html',
  styles: [
    `
      .tabs {
        display: flex;
        gap: 0.4rem;
        margin-bottom: 1.25rem;
      }
    `,
  ],
})
export class FavoritesComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly locations = inject(LocationService);

  readonly activeTab = signal<SavedTab>('offers');

  readonly offers = signal<Offer[]>([]);
  readonly offersMeta = signal<PageMeta | null>(null);
  readonly offersLoading = signal(true);
  private offersPage = 1;

  readonly services = signal<Service[]>([]);
  readonly servicesMeta = signal<PageMeta | null>(null);
  readonly servicesLoading = signal(true);
  private servicesPage = 1;

  constructor() {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    this.activeTab.set(tab === 'services' ? 'services' : 'offers');

    this.loadOffers();
    this.loadServices();
  }

  setTab(tab: SavedTab): void {
    this.activeTab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  private loadOffers(): void {
    this.offersLoading.set(true);
    const position = this.locations.position;

    this.api
      .listFavorites({
        page: this.offersPage,
        limit: environment.pageSize,
        latitude: position?.latitude ?? undefined,
        longitude: position?.longitude ?? undefined,
      })
      .subscribe({
        next: (result) => {
          this.offers.set(result.items);
          this.offersMeta.set(result.meta);
          this.offersLoading.set(false);
        },
        error: () => {
          this.offers.set([]);
          this.offersLoading.set(false);
        },
      });
  }

  private loadServices(): void {
    this.servicesLoading.set(true);
    const position = this.locations.position;

    this.api
      .listSavedServices({
        page: this.servicesPage,
        limit: environment.pageSize,
        latitude: position?.latitude ?? undefined,
        longitude: position?.longitude ?? undefined,
      })
      .subscribe({
        next: (result) => {
          this.services.set(result.items);
          this.servicesMeta.set(result.meta);
          this.servicesLoading.set(false);
        },
        error: () => {
          this.services.set([]);
          this.servicesLoading.set(false);
        },
      });
  }

  goToOffersPage(page: number): void {
    this.offersPage = page;
    this.loadOffers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToServicesPage(page: number): void {
    this.servicesPage = page;
    this.loadServices();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Unsaving removes the card from this list straight away. */
  removeOffer(offer: Offer): void {
    const previous = this.offers();
    this.offers.update((list) => list.filter((item) => item.id !== offer.id));

    this.api.removeFavorite(offer.id).subscribe({
      next: () => {
        this.toast.success('Removed from favourites');
        this.offersMeta.update((meta) => (meta ? { ...meta, total: Math.max(meta.total - 1, 0) } : meta));
      },
      error: () => this.offers.set(previous),
    });
  }

  removeService(service: Service): void {
    const previous = this.services();
    this.services.update((list) => list.filter((item) => item.id !== service.id));

    this.api.unsaveService(service.id).subscribe({
      next: () => {
        this.toast.success('Removed from saved');
        this.servicesMeta.update((meta) => (meta ? { ...meta, total: Math.max(meta.total - 1, 0) } : meta));
      },
      error: () => this.services.set(previous),
    });
  }
}
