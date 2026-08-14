import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { PageMeta, Service, ServiceStatus, Shop } from '../../core/models';
import { PERMISSIONS } from '../../core/permissions';
import { ServiceOfferChipPipe, ServicePriceLabelPipe, ServiceStatusClassPipe } from '../../shared/service-badge.pipe';
import { ConfirmComponent, EmptyStateComponent, PaginationComponent } from '../../shared/ui.components';

const STATUS_TABS: { value: ServiceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'draft', label: 'Drafts' },
  { value: 'expired', label: 'Expired' },
  { value: 'deactivated', label: 'Deactivated' },
];

/** Service management table, scoped by the API to the shops the user administers. */
@Component({
  selector: 'app-service-manage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ServiceStatusClassPipe,
    ServicePriceLabelPipe,
    PaginationComponent,
    EmptyStateComponent,
    ConfirmComponent,
  ],
  templateUrl: './service-manage.component.html',
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

      .service-cell {
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

      .service-cell .body {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .actions-cell {
        display: flex;
        gap: 0.25rem;
        flex-wrap: wrap;
        white-space: nowrap;
      }
    `,
  ],
})
export class ServiceManageComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly tabs = STATUS_TABS;
  readonly services = signal<Service[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly shops = signal<Shop[]>([]);
  readonly pendingDelete = signal<Service | null>(null);

  readonly canCreate = this.auth.has(PERMISSIONS.CREATE_SERVICE);

  status: ServiceStatus | 'all' = 'all';
  search = '';
  shopId: number | null = null;
  sort: 'newest' | 'mostViewed' | 'mostPopular' = 'newest';
  page = 1;

  readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$.pipe(debounceTime(350), distinctUntilChanged()).subscribe((value) => {
      this.search = value;
      this.page = 1;
      this.load();
    });

    const statusParam = this.route.snapshot.queryParamMap.get('status') as ServiceStatus | null;
    if (statusParam) this.status = statusParam;

    this.api.listShops({ mine: !this.auth.isSuperAdmin, limit: 100 }).subscribe({
      next: (page) => this.shops.set(page.items),
      error: () => undefined,
    });

    this.load();
  }

  setStatus(status: ServiceStatus | 'all'): void {
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
      .listServices({
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
          this.services.set(result.items);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: () => {
          this.services.set([]);
          this.meta.set(null);
          this.loading.set(false);
        },
      });
  }

  canEdit(service: Service): boolean {
    return this.auth.hasForShop(service.shop.id, PERMISSIONS.EDIT_SERVICE);
  }

  canDelete(service: Service): boolean {
    return this.auth.hasForShop(service.shop.id, PERMISSIONS.DELETE_SERVICE);
  }

  canManageOffers(service: Service): boolean {
    return this.auth.hasForShop(service.shop.id, PERMISSIONS.MANAGE_SERVICE_OFFER);
  }

  /** Transitions the API accepts from the service's current status. */
  nextStatuses(service: Service): { value: ServiceStatus; label: string }[] {
    const options: Record<ServiceStatus, { value: ServiceStatus; label: string }[]> = {
      draft: [
        { value: 'active', label: 'Publish' },
        { value: 'scheduled', label: 'Schedule' },
      ],
      scheduled: [
        { value: 'active', label: 'Publish now' },
        { value: 'deactivated', label: 'Deactivate' },
      ],
      active: [
        { value: 'paused', label: 'Pause' },
        { value: 'deactivated', label: 'Deactivate' },
      ],
      paused: [
        { value: 'active', label: 'Resume' },
        { value: 'deactivated', label: 'Deactivate' },
      ],
      expired: [{ value: 'active', label: 'Republish' }],
      deactivated: [{ value: 'active', label: 'Reactivate' }],
    };
    return options[service.status] ?? [];
  }

  changeStatus(service: Service, status: ServiceStatus): void {
    this.api.setServiceStatus(service.id, status).subscribe({
      next: (updated) => {
        this.services.update((list) =>
          list.map((item) => (item.id === updated.id ? { ...item, status: updated.status } : item)),
        );
        this.toast.success(`Service is now ${updated.status}.`);
      },
    });
  }

  duplicate(service: Service): void {
    this.api.duplicateService(service.id).subscribe({
      next: () => {
        this.toast.success('Service duplicated as a draft.');
        this.reload();
      },
    });
  }

  confirmDelete(): void {
    const service = this.pendingDelete();
    if (!service) return;

    this.api.deleteService(service.id).subscribe({
      next: () => {
        this.services.update((list) => list.filter((item) => item.id !== service.id));
        this.pendingDelete.set(null);
        this.toast.success('Service deleted.');
      },
      error: () => this.pendingDelete.set(null),
    });
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
  }

  offerChip(service: Service): string {
    return new ServiceOfferChipPipe().transform(service);
  }
}
