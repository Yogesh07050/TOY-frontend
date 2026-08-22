import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Offer, OfferStatus, PageMeta, Shop } from '../../core/models';
import { PERMISSIONS } from '../../core/permissions';
import { DiscountChipPipe, StatusClassPipe, ValidityPipe } from '../../shared/offer-badge.pipe';
import { ConfirmComponent, EmptyStateComponent, PaginationComponent } from '../../shared/ui.components';
import { IconComponent } from '../../shared/icon.component';

const STATUS_TABS: { value: OfferStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'draft', label: 'Drafts' },
  { value: 'expired', label: 'Expired' },
  { value: 'deactivated', label: 'Deactivated' },
];

/** Offer management table, scoped by the API to the shops the user administers. */
@Component({
  selector: 'app-offer-manage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    StatusClassPipe,
    ValidityPipe,
    DiscountChipPipe,
    PaginationComponent,
    EmptyStateComponent,
    ConfirmComponent,
    IconComponent,
  ],
  templateUrl: './offer-manage.component.html',
  styles: [
    `
      .tabs {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
        margin-bottom: 1rem;
      }

      .filters {
        margin-bottom: 1rem;
      }

      .filters .grow {
        flex: 1;
        min-width: 200px;
      }

      .filters select {
        width: auto;
        min-width: 150px;
      }

      .offer-cell {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        min-width: 0;
      }

      .thumb {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-sm);
        object-fit: cover;
        flex-shrink: 0;
      }

      .thumb.placeholder {
        display: grid;
        place-items: center;
        background: var(--brand-light);
        color: var(--brand);
        font-weight: 700;
      }

      .offer-cell .body {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .actions-cell {
        display: flex;
        gap: 0.25rem;
        white-space: nowrap;
      }
    `,
  ],
})
export class OfferManageComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly tabs = STATUS_TABS;
  readonly offers = signal<Offer[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly shops = signal<Shop[]>([]);
  readonly pendingDelete = signal<Offer | null>(null);

  readonly canCreate = this.auth.has(PERMISSIONS.CREATE_OFFER);

  status: OfferStatus | 'all' = 'all';
  search = '';
  shopId: number | null = null;
  sort: 'newest' | 'endingSoon' | 'mostViewed' = 'newest';
  page = 1;

  readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$.pipe(debounceTime(350), distinctUntilChanged()).subscribe((value) => {
      this.search = value;
      this.page = 1;
      this.load();
    });

    const statusParam = this.route.snapshot.queryParamMap.get('status') as OfferStatus | null;
    if (statusParam) this.status = statusParam;

    this.api.listShops({ mine: !this.auth.isSuperAdmin, limit: 100 }).subscribe({
      next: (page) => this.shops.set(page.items),
      error: () => undefined,
    });

    this.load();
  }

  setStatus(status: OfferStatus | 'all'): void {
    this.status = status;
    this.page = 1;
    this.load();
  }

  reload(): void {
    this.page = 1;
    this.load();
  }

  goToPage(page: number): void {
    this.page = page;
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private load(): void {
    this.loading.set(true);
    this.api
      .listOffers({
        manage: true,
        status: this.status,
        search: this.search || undefined,
        shopId: this.shopId ?? undefined,
        sort: this.sort,
        page: this.page,
        limit: 20,
      })
      .subscribe({
        next: (result) => {
          this.offers.set(result.items);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: () => {
          this.offers.set([]);
          this.meta.set(null);
          this.loading.set(false);
        },
      });
  }

  canEdit(offer: Offer): boolean {
    return this.auth.hasForShop(offer.shop.id, PERMISSIONS.EDIT_OFFER);
  }

  canDelete(offer: Offer): boolean {
    return this.auth.hasForShop(offer.shop.id, PERMISSIONS.DELETE_OFFER);
  }

  /** Transitions the API accepts from the offer's current status (§14). */
  nextStatuses(offer: Offer): { value: OfferStatus; label: string }[] {
    const options: Record<OfferStatus, { value: OfferStatus; label: string }[]> = {
      draft: [
        { value: 'active', label: 'Publish' },
        { value: 'scheduled', label: 'Schedule' },
      ],
      scheduled: [
        { value: 'active', label: 'Publish now' },
        { value: 'deactivated', label: 'Deactivate' },
      ],
      active: [{ value: 'deactivated', label: 'Deactivate' }],
      expired: [{ value: 'active', label: 'Republish' }],
      deactivated: [{ value: 'active', label: 'Reactivate' }],
    };
    return options[offer.status] ?? [];
  }

  changeStatus(offer: Offer, status: OfferStatus): void {
    this.api.setOfferStatus(offer.id, status).subscribe({
      next: (updated) => {
        this.offers.update((list) =>
          list.map((item) => (item.id === updated.id ? { ...item, status: updated.status } : item)),
        );
        this.toast.success(`Offer is now ${updated.status}.`);
      },
    });
  }

  confirmDelete(): void {
    const offer = this.pendingDelete();
    if (!offer) return;

    this.api.deleteOffer(offer.id).subscribe({
      next: () => {
        this.offers.update((list) => list.filter((item) => item.id !== offer.id));
        this.pendingDelete.set(null);
        this.toast.success('Offer deleted.');
      },
      error: () => this.pendingDelete.set(null),
    });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
  }
}
