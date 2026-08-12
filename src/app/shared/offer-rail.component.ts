import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Offer } from '../core/models';
import { OfferCardComponent } from './offer-card.component';

/**
 * A titled, horizontally scrolling row of offer cards - the shape the V2
 * discovery sections (Ending Soon, Near Me, Recommended) all share.
 *
 * The section renders nothing at all when it has no offers, which is what §2
 * asks for: hide an empty section rather than showing an empty one.
 */
@Component({
  selector: 'app-offer-rail',
  standalone: true,
  imports: [CommonModule, RouterLink, OfferCardComponent],
  template: `
    @if (loading) {
      <section class="rail-section">
        <div class="rail-head">
          <h2>{{ icon }} {{ title }}</h2>
        </div>
        <div class="rail">
          @for (item of [1, 2, 3, 4]; track item) {
            <div class="rail-item skeleton" style="height: 320px"></div>
          }
        </div>
      </section>
    } @else if (offers.length) {
      <section class="rail-section">
        <div class="rail-head">
          <div>
            <h2>{{ icon }} {{ title }}</h2>
            @if (subtitle) {
              <p class="small muted mb-0">{{ subtitle }}</p>
            }
          </div>
          @if (seeAllLink) {
            <a class="see-all" [routerLink]="seeAllLink" [queryParams]="seeAllParams">See all →</a>
          }
        </div>

        <div class="rail stagger">
          @for (offer of offers; track offer.id) {
            <div class="rail-item">
              <!-- The per-offer note (urgency bucket, or why it was recommended)
                   sits above the card so the card itself stays identical
                   everywhere it appears. -->
              @if (noteFor(offer); as note) {
                <span class="note" [class.urgent]="isUrgent(offer)">{{ note }}</span>
              }
              <app-offer-card
                [offer]="offer"
                (toggleFavorite)="toggleFavorite.emit($event)"
                (requireLogin)="requireLogin.emit()"
              />
            </div>
          }
        </div>
      </section>
    }
  `,
  styleUrl: './offer-rail.component.scss',
})
export class OfferRailComponent {
  @Input({ required: true }) title!: string;
  @Input() icon = '';
  @Input() subtitle = '';
  @Input() offers: Offer[] = [];
  @Input() loading = false;
  @Input() seeAllLink: string | null = null;
  @Input() seeAllParams: Record<string, unknown> = {};

  /** Optional per-offer caption, e.g. "Ends in 3 hours" or a recommendation reason. */
  @Input() note: ((offer: Offer) => string | null) | null = null;

  @Output() toggleFavorite = new EventEmitter<Offer>();
  @Output() requireLogin = new EventEmitter<void>();

  noteFor(offer: Offer): string | null {
    return this.note ? this.note(offer) : null;
  }

  isUrgent(offer: Offer): boolean {
    const bucket = (offer as Offer & { endingBucket?: { key: string } }).endingBucket;
    return bucket ? ['urgent', 'today'].includes(bucket.key) : false;
  }
}
