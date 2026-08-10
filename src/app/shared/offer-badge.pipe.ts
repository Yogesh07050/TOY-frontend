import { Pipe, PipeTransform } from '@angular/core';

import { Offer, OfferStatus } from '../core/models';

/**
 * The headline shown on an offer card. Falls back to deriving text from the
 * discount model when no explicit `offerText` was entered (§31).
 */
@Pipe({ name: 'offerHeadline' })
export class OfferHeadlinePipe implements PipeTransform {
  transform(offer: Offer): string {
    if (offer.offerText) return offer.offerText;

    switch (offer.offerType) {
      case 'buy_x_get_y':
        return offer.buyQuantity && offer.getQuantity
          ? `Buy ${offer.buyQuantity} Get ${offer.getQuantity} Free`
          : 'Special offer';
      case 'up_to':
        return offer.discountValue ? `Up to ${offer.discountValue}% OFF` : 'Big savings';
      case 'price_drop':
        return offer.discountedPrice
          ? `₹${offer.discountedPrice.toLocaleString('en-IN')}${
              offer.originalPrice ? ` instead of ₹${offer.originalPrice.toLocaleString('en-IN')}` : ''
            }`
          : 'Price drop';
      case 'flat':
        return offer.discountValue ? `₹${offer.discountValue.toLocaleString('en-IN')} OFF` : 'Flat discount';
      case 'percentage':
      default:
        return offer.discountValue ? `${offer.discountValue}% OFF` : 'Special offer';
    }
  }
}

/** Compact discount chip, e.g. "30% OFF" / "₹500 OFF". Empty when not applicable. */
@Pipe({ name: 'discountChip' })
export class DiscountChipPipe implements PipeTransform {
  transform(offer: Offer): string {
    if (offer.discountType === 'percentage' && offer.discountValue) {
      return `${offer.offerType === 'up_to' ? 'Up to ' : ''}${offer.discountValue}% OFF`;
    }
    if (offer.discountType === 'flat' && offer.discountValue) {
      return `₹${offer.discountValue.toLocaleString('en-IN')} OFF`;
    }
    if (offer.offerType === 'buy_x_get_y' && offer.buyQuantity && offer.getQuantity) {
      return `${offer.buyQuantity}+${offer.getQuantity}`;
    }
    return '';
  }
}

/** Human wording for the validity window, e.g. "Ends in 3 days". */
@Pipe({ name: 'validity' })
export class ValidityPipe implements PipeTransform {
  transform(offer: Pick<Offer, 'endDate' | 'startDate' | 'status'>): string {
    const now = Date.now();
    const end = new Date(offer.endDate).getTime();
    const start = new Date(offer.startDate).getTime();

    if (offer.status === 'expired' || end < now) return 'Expired';
    if (offer.status === 'deactivated') return 'Not available';
    if (start > now) {
      const days = Math.ceil((start - now) / 86400000);
      return days <= 1 ? 'Starts tomorrow' : `Starts in ${days} days`;
    }

    const hours = Math.floor((end - now) / 3600000);
    if (hours < 1) return 'Ends within the hour';
    if (hours < 24) return `Ends in ${hours} hour${hours === 1 ? '' : 's'}`;
    const days = Math.ceil(hours / 24);
    if (days === 1) return 'Ends tomorrow';
    if (days <= 30) return `Ends in ${days} days`;
    return `Valid until ${new Date(offer.endDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    })}`;
  }
}

/** Distance shown on cards: "3.2 km away" / "250 m away". */
@Pipe({ name: 'distance' })
export class DistancePipe implements PipeTransform {
  transform(km: number | null | undefined): string {
    if (km === null || km === undefined) return '';
    if (km < 1) return `${Math.round(km * 1000)} m away`;
    return `${km.toFixed(1)} km away`;
  }
}

/** Badge colour class for an offer status. */
@Pipe({ name: 'statusClass' })
export class StatusClassPipe implements PipeTransform {
  transform(status: OfferStatus | string): string {
    switch (status) {
      case 'active':
        return 'badge badge-success';
      case 'scheduled':
        return 'badge badge-info';
      case 'expired':
        return 'badge badge-warning';
      case 'deactivated':
        return 'badge badge-danger';
      case 'draft':
      default:
        return 'badge';
    }
  }
}
