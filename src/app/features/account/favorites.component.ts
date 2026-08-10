import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';
import { ApiService } from '../../core/api.service';
import { LocationService } from '../../core/location.service';
import { ToastService } from '../../core/toast.service';
import { Offer, PageMeta } from '../../core/models';
import { OfferCardComponent } from '../../shared/offer-card.component';
import { CardSkeletonsComponent, EmptyStateComponent, PaginationComponent } from '../../shared/ui.components';

/** My Favourites (§22). */
@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    OfferCardComponent,
    PaginationComponent,
    EmptyStateComponent,
    CardSkeletonsComponent,
  ],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>My favourites</h1>
          <p class="subtitle">
            @if (meta()) {
              {{ meta()!.total }} saved offer{{ meta()!.total === 1 ? '' : 's' }} · we will remind you before
              they expire
            } @else {
              Offers you saved for later.
            }
          </p>
        </div>
      </div>

      @if (loading()) {
        <app-card-skeletons [count]="6" />
      } @else if (offers().length === 0) {
        <app-empty-state
          emoji="♡"
          title="Nothing saved yet"
          message="Tap the heart on any offer to keep it here and get a reminder before it ends."
        >
          <a routerLink="/offers" class="btn mt-2">Browse offers</a>
        </app-empty-state>
      } @else {
        <div class="grid grid-cards">
          @for (offer of offers(); track offer.id) {
            <app-offer-card [offer]="offer" (toggleFavorite)="remove($event)" />
          }
        </div>
        <app-pagination [meta]="meta()" (pageChange)="goToPage($event)" />
      }
    </div>
  `,
})
export class FavoritesComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly locations = inject(LocationService);

  readonly offers = signal<Offer[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  private page = 1;

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    const position = this.locations.position;

    this.api
      .listFavorites({
        page: this.page,
        limit: environment.pageSize,
        latitude: position?.latitude ?? undefined,
        longitude: position?.longitude ?? undefined,
      })
      .subscribe({
        next: (result) => {
          this.offers.set(result.items);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: () => {
          this.offers.set([]);
          this.loading.set(false);
        },
      });
  }

  goToPage(page: number): void {
    this.page = page;
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Unsaving removes the card from this list straight away. */
  remove(offer: Offer): void {
    const previous = this.offers();
    this.offers.update((list) => list.filter((item) => item.id !== offer.id));

    this.api.removeFavorite(offer.id).subscribe({
      next: () => {
        this.toast.success('Removed from favourites');
        this.meta.update((meta) => (meta ? { ...meta, total: Math.max(meta.total - 1, 0) } : meta));
      },
      error: () => this.offers.set(previous),
    });
  }
}
