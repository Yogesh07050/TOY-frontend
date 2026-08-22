import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Service } from '../core/models';
import { AuthService } from '../core/auth.service';
import { DistancePipe } from './offer-badge.pipe';
import { ServiceOfferChipPipe, ServicePriceLabelPipe, ServiceStatusClassPipe } from './service-badge.pipe';
import { IconComponent } from '../shared/icon.component';

/** The service card (§10). Shows shop, name, price, active offer, location and the save control. */
@Component({
  selector: 'app-service-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DistancePipe,
    ServicePriceLabelPipe,
    ServiceStatusClassPipe,
    IconComponent,
  ],
  template: `
    <article class="service-card" [class.dimmed]="service.status !== 'active'">
      <a class="media" [routerLink]="['/services', service.id]" [attr.aria-label]="service.name">
        @if (service.thumbnailUrl || service.imageUrl) {
          <img
            [src]="service.thumbnailUrl || service.imageUrl"
            [alt]="service.name"
            loading="lazy"
            decoding="async"
          />
        } @else {
          <div class="placeholder" aria-hidden="true">
            <span>{{ service.shop.name.charAt(0) }}</span>
          </div>
        }

        @if (offerChip) {
          <span class="discount-flag"><app-icon name="flame-outline" [size]="15" /> {{ offerChip }}</span>
        }
        @if (showStatus && service.status !== 'active') {
          <span class="status-flag" [class]="service.status | serviceStatusClass">{{ service.status }}</span>
        }
      </a>

      <div class="body">
        <div class="shop-row">
          @if (service.shop.logoUrl) {
            <img class="shop-logo" [src]="service.shop.logoUrl" [alt]="service.shop.name" loading="lazy" />
          }
          <a class="shop-name truncate" [routerLink]="['/shops', service.shop.slug]">{{ service.shop.name }}</a>
        </div>

        <a class="title clamp-2" [routerLink]="['/services', service.id]">{{ service.name }}</a>

        @if (service.category) {
          <a class="category" [routerLink]="['/services']" [queryParams]="{ categoryId: service.category.id }">
            {{ service.category.name }}
          </a>
        }

        <div class="meta">
          @if (service.locationLabel || service.distanceKm !== null) {
            <span class="meta-item">
              <app-icon name="location-outline" [size]="15" /> <span class="truncate">
                {{ service.locationLabel || 'Multiple locations' }}
                @if (service.distanceKm !== null) {
                  · {{ service.distanceKm | distance }}
                }
              </span>
            </span>
          }
          @if (service.durationLabel) {
            <span class="meta-item">⏱ {{ service.durationLabel }}</span>
          }
          @if (service.homeService) {
            <span class="meta-item"><app-icon name="home-outline" [size]="15" /> Home service</span>
          }
        </div>

        <div class="actions">
          <span class="price">{{ service | servicePriceLabel }}</span>
          <span class="spacer"></span>
          <button
            type="button"
            class="save-btn"
            [class.saved]="service.isSaved"
            (click)="onToggleSave($event)"
            [attr.aria-pressed]="service.isSaved"
            [attr.aria-label]="service.isSaved ? 'Remove from saved' : 'Save service'"
          >
            <app-icon class="heart" [name]="service.isSaved ? 'heart' : 'heart-outline'" [size]="15" />
            <span class="save-label">{{ service.isSaved ? 'Saved' : 'Save' }}</span>
          </button>
        </div>
      </div>
    </article>
  `,
  styles: [
    `
      .service-card {
        display: flex;
        flex-direction: column;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
        box-shadow: var(--shadow-sm);
        height: 100%;
        transition:
          transform var(--normal) var(--ease-out),
          box-shadow var(--normal) var(--ease-out),
          border-color var(--normal) var(--ease);
      }

      .service-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-lg);
        border-color: transparent;
      }

      .service-card.dimmed .media {
        opacity: 0.72;
        filter: grayscale(0.35);
      }

      .media {
        position: relative;
        display: block;
        aspect-ratio: 4 / 3;
        background: var(--surface-alt);
        overflow: hidden;
      }

      .media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform var(--slow) var(--ease-out);
      }

      .service-card:hover .media img {
        transform: scale(1.06);
      }

      .media::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(to bottom, rgba(20, 22, 31, 0.28) 0%, transparent 38%);
        opacity: 0.9;
        pointer-events: none;
      }

      .placeholder {
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, var(--brand-light) 0%, #fcd34d 100%);
        color: var(--brand-strong);
        font-size: 2.6rem;
        font-weight: 800;
        transition: transform var(--slow) var(--ease-out);
      }

      .service-card:hover .placeholder {
        transform: scale(1.05);
      }

      .discount-flag {
        position: absolute;
        top: 0.65rem;
        left: 0.65rem;
        z-index: 1;
        background: var(--gradient-accent);
        color: #fff;
        padding: 0.22rem 0.65rem;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 700;
        box-shadow: 0 4px 12px -2px rgba(249, 115, 22, 0.55);
        transition: transform var(--normal) var(--ease-spring);
      }

      .service-card:hover .discount-flag {
        transform: scale(1.06);
      }

      .status-flag {
        position: absolute;
        top: 0.65rem;
        right: 0.65rem;
        z-index: 1;
        text-transform: capitalize;
        backdrop-filter: blur(4px);
      }

      .body {
        padding: 0.85rem 0.95rem 0.95rem;
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
        font-size: 0.76rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.055em;
        color: var(--text-muted);
      }

      .shop-name:hover {
        color: var(--brand);
        text-decoration: none;
      }

      .title {
        font-size: 1.02rem;
        font-weight: 660;
        color: var(--text);
        line-height: 1.3;
        letter-spacing: -0.01em;
        transition: color var(--fast) var(--ease);
      }

      .title:hover {
        color: var(--brand-strong);
        text-decoration: none;
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
        padding-top: 0.45rem;
      }

      .meta-item {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        min-width: 0;
      }

      .actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding-top: 0.65rem;
        margin-top: 0.45rem;
        border-top: 1px solid var(--border);
      }

      .price {
        font-weight: 700;
        color: var(--text);
        font-size: 0.92rem;
      }

      .save-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.32rem;
        border: 1px solid var(--border-strong);
        background: var(--surface);
        border-radius: 999px;
        padding: 0.26rem 0.72rem;
        font: inherit;
        font-size: 0.82rem;
        cursor: pointer;
        color: var(--text-muted);
        transition:
          border-color var(--fast) var(--ease),
          color var(--fast) var(--ease),
          background var(--fast) var(--ease),
          transform var(--fast) var(--ease-spring);
      }

      .save-btn:hover {
        border-color: var(--danger);
        color: var(--danger);
        background: var(--danger-bg);
        transform: translateY(-1px);
      }

      .save-btn:active {
        transform: scale(0.94);
      }

      .save-btn.saved {
        background: var(--danger-bg);
        border-color: transparent;
        color: var(--danger);
        font-weight: 620;
      }

      .save-btn.saved .heart {
        animation: heart-beat 420ms var(--ease-spring);
      }

      @keyframes heart-beat {
        0% {
          transform: scale(1);
        }
        35% {
          transform: scale(1.45);
        }
        70% {
          transform: scale(0.92);
        }
        100% {
          transform: scale(1);
        }
      }

      @media (max-width: 420px) {
        .save-label {
          display: none;
        }
      }
    `,
  ],
})
export class ServiceCardComponent {
  private readonly auth = inject(AuthService);

  @Input({ required: true }) service!: Service;
  /** Shows the lifecycle badge - used in the admin lists, not in discovery. */
  @Input() showStatus = false;

  @Output() toggleSave = new EventEmitter<Service>();
  /**
   * Raised instead of the save when a guest taps the heart (§5). Carries the
   * service so the parent can replay the save once the visitor signs in (§7).
   */
  @Output() requireLogin = new EventEmitter<Service>();

  get offerChip(): string {
    return new ServiceOfferChipPipe().transform(this.service);
  }

  onToggleSave(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.auth.isAuthenticated()) {
      this.requireLogin.emit(this.service);
      return;
    }
    this.toggleSave.emit(this.service);
  }
}
