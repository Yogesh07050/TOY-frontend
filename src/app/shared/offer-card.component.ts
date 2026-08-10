import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Offer } from '../core/models';
import { AuthService } from '../core/auth.service';
import {
  DiscountChipPipe,
  DistancePipe,
  OfferHeadlinePipe,
  StatusClassPipe,
  ValidityPipe,
} from './offer-badge.pipe';

/**
 * The offer card from §40. Shows shop, headline, category, location, distance,
 * expiry and the save control.
 */
@Component({
  selector: 'app-offer-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    OfferHeadlinePipe,
    ValidityPipe,
    DistancePipe,
    StatusClassPipe,
  ],
  template: `
    <article class="offer-card" [class.dimmed]="offer.status !== 'active'">
      <a class="media" [routerLink]="['/offers', offer.id]" [attr.aria-label]="offer.title">
        @if (offer.thumbnailUrl || offer.imageUrl) {
          <img
            [src]="offer.thumbnailUrl || offer.imageUrl"
            [alt]="offer.title"
            loading="lazy"
            decoding="async"
          />
        } @else {
          <div class="placeholder" aria-hidden="true">
            <span>{{ offer.shop.name.charAt(0) }}</span>
          </div>
        }

        @if (discountChip) {
          <span class="discount-flag">{{ discountChip }}</span>
        }
        @if (showStatus && offer.status !== 'active') {
          <span class="status-flag" [class]="offer.status | statusClass">{{ offer.status }}</span>
        }
      </a>

      <div class="body">
        <div class="shop-row">
          @if (offer.shop.logoUrl) {
            <img class="shop-logo" [src]="offer.shop.logoUrl" [alt]="offer.shop.name" loading="lazy" />
          }
          <a class="shop-name truncate" [routerLink]="['/shops', offer.shop.slug]">{{ offer.shop.name }}</a>
        </div>

        <a class="title clamp-2" [routerLink]="['/offers', offer.id]">{{ offer | offerHeadline }}</a>

        @if (offer.productName) {
          <p class="product truncate">{{ offer.productName }}</p>
        }

        @if (offer.category) {
          <a class="category" [routerLink]="['/offers']" [queryParams]="{ categoryId: offer.category.id }">
            {{ offer.category.name }}
          </a>
        }

        <div class="meta">
          @if (offer.locationLabel || offer.distanceKm !== null) {
            <span class="meta-item">
              📍
              <span class="truncate">
                {{ offer.locationLabel || 'Multiple locations' }}
                @if (offer.distanceKm !== null) {
                  · {{ offer.distanceKm | distance }}
                }
              </span>
            </span>
          }
          <span class="meta-item" [class.urgent]="isEndingSoon">🗓 {{ offer | validity }}</span>
        </div>

        <div class="actions">
          @if (discountChip) {
            <span class="badge badge-brand">{{ discountChip }}</span>
          } @else {
            <span class="badge badge-brand">Offer</span>
          }
          <span class="spacer"></span>
          <button
            type="button"
            class="save-btn"
            [class.saved]="offer.isFavorite"
            (click)="onToggleFavorite($event)"
            [attr.aria-pressed]="offer.isFavorite"
            [attr.aria-label]="offer.isFavorite ? 'Remove from favourites' : 'Save offer'"
          >
            {{ offer.isFavorite ? '♥' : '♡' }}
            <span class="save-label">{{ offer.isFavorite ? 'Saved' : 'Save' }}</span>
          </button>
        </div>
      </div>
    </article>
  `,
  styles: [
    `
      .offer-card {
        display: flex;
        flex-direction: column;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
        box-shadow: var(--shadow-sm);
        transition:
          transform 0.15s ease,
          box-shadow 0.15s ease;
        height: 100%;
      }

      .offer-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow);
      }

      .offer-card.dimmed .media {
        opacity: 0.72;
      }

      .media {
        position: relative;
        display: block;
        aspect-ratio: 4 / 3;
        background: var(--surface-alt);
      }

      .media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .placeholder {
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, var(--brand-light), #e0e7ff);
        color: var(--brand);
        font-size: 2.5rem;
        font-weight: 700;
      }

      .discount-flag {
        position: absolute;
        top: 0.6rem;
        left: 0.6rem;
        background: var(--accent);
        color: #fff;
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 700;
        box-shadow: var(--shadow-sm);
      }

      .status-flag {
        position: absolute;
        top: 0.6rem;
        right: 0.6rem;
        text-transform: capitalize;
      }

      .body {
        padding: 0.8rem 0.9rem 0.9rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        flex: 1;
      }

      .shop-row {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        min-width: 0;
      }

      .shop-logo {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
      }

      .shop-name {
        font-size: 0.78rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
      }

      .title {
        font-size: 1rem;
        font-weight: 650;
        color: var(--text);
        line-height: 1.3;
      }

      .title:hover {
        color: var(--brand);
        text-decoration: none;
      }

      .product {
        margin: 0;
        font-size: 0.85rem;
        color: var(--text-muted);
      }

      .category {
        font-size: 0.78rem;
        color: var(--brand);
        align-self: flex-start;
      }

      .meta {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        font-size: 0.8rem;
        color: var(--text-muted);
        margin-top: auto;
        padding-top: 0.4rem;
      }

      .meta-item {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        min-width: 0;
      }

      .meta-item.urgent {
        color: var(--warning);
        font-weight: 600;
      }

      .actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding-top: 0.6rem;
        margin-top: 0.4rem;
        border-top: 1px solid var(--border);
      }

      .save-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        border: 1px solid var(--border-strong);
        background: var(--surface);
        border-radius: 999px;
        padding: 0.25rem 0.7rem;
        font: inherit;
        font-size: 0.82rem;
        cursor: pointer;
        color: var(--text-muted);
      }

      .save-btn:hover {
        border-color: var(--danger);
        color: var(--danger);
      }

      .save-btn.saved {
        background: var(--danger-bg);
        border-color: transparent;
        color: var(--danger);
        font-weight: 600;
      }

      @media (max-width: 420px) {
        .save-label {
          display: none;
        }
      }
    `,
  ],
})
export class OfferCardComponent {
  private readonly auth = inject(AuthService);

  @Input({ required: true }) offer!: Offer;
  /** Shows the lifecycle badge - used in the admin lists, not in discovery. */
  @Input() showStatus = false;

  @Output() toggleFavorite = new EventEmitter<Offer>();
  @Output() requireLogin = new EventEmitter<void>();

  get discountChip(): string {
    return new DiscountChipPipe().transform(this.offer);
  }

  get isEndingSoon(): boolean {
    if (this.offer.status !== 'active') return false;
    const hours = (new Date(this.offer.endDate).getTime() - Date.now()) / 3600000;
    return hours > 0 && hours <= 72;
  }

  onToggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.auth.isAuthenticated()) {
      this.requireLogin.emit();
      return;
    }
    this.toggleFavorite.emit(this.offer);
  }
}
