import { Pipe, PipeTransform } from '@angular/core';

import { Service, ServiceStatus } from '../core/models';

/** Price shown on a service card/detail page, per its pricing model. */
@Pipe({ name: 'servicePriceLabel' })
export class ServicePriceLabelPipe implements PipeTransform {
  transform(service: Pick<Service, 'pricingType' | 'price'>): string {
    if (service.pricingType === 'price_on_enquiry' || service.price === null) return 'Price on enquiry';
    const amount = `₹${service.price.toLocaleString('en-IN')}`;
    return service.pricingType === 'starting_from' ? `From ${amount}` : amount;
  }
}

/** Compact offer chip sourced from `service.activeOffer`, e.g. "30% OFF". */
@Pipe({ name: 'serviceOfferChip' })
export class ServiceOfferChipPipe implements PipeTransform {
  transform(service: Pick<Service, 'activeOffer'>): string {
    const offer = service.activeOffer;
    if (!offer) return '';
    if (offer.discountType === 'percentage' && offer.discountValue) {
      return `${offer.discountValue}% OFF`;
    }
    if (offer.discountType === 'flat' && offer.discountValue) {
      return `₹${offer.discountValue.toLocaleString('en-IN')} OFF`;
    }
    return offer.offerText ?? '';
  }
}

/** Human wording for how soon the active offer ends, e.g. "Offer ends in 3 days". */
@Pipe({ name: 'serviceOfferValidity' })
export class ServiceOfferValidityPipe implements PipeTransform {
  transform(service: Pick<Service, 'activeOffer'>): string | null {
    const offer = service.activeOffer;
    if (!offer) return null;

    const now = Date.now();
    const end = new Date(offer.endDate).getTime();
    if (end < now) return null;

    const hours = Math.floor((end - now) / 3600000);
    if (hours < 1) return 'Offer ends within the hour';
    if (hours < 24) return `Offer ends in ${hours} hour${hours === 1 ? '' : 's'}`;
    const days = Math.ceil(hours / 24);
    if (days === 1) return 'Offer ends tomorrow';
    if (days <= 30) return `Offer ends in ${days} days`;
    return `Offer valid until ${new Date(offer.endDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    })}`;
  }
}

/** Badge colour class for a service status — extends the offer statuses with 'paused'. */
@Pipe({ name: 'serviceStatusClass' })
export class ServiceStatusClassPipe implements PipeTransform {
  transform(status: ServiceStatus | string): string {
    switch (status) {
      case 'active':
        return 'badge badge-success';
      case 'scheduled':
        return 'badge badge-info';
      case 'paused':
        return 'badge badge-warning';
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
