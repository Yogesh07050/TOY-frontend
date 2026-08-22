import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Banner, BannerStatus, PageMeta } from '../../core/models';
import { PERMISSIONS } from '../../core/permissions';
import { ConfirmComponent, EmptyStateComponent, PaginationComponent } from '../../shared/ui.components';
import { IconComponent } from '../../shared/icon.component';

const TABS: { value: BannerStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'draft', label: 'Drafts' },
  { value: 'expired', label: 'Expired' },
  { value: 'deactivated', label: 'Deactivated' },
];

/**
 * Banner management (§5). Reachable only through the admin area and only with
 * banner permissions; every control here is additionally gated on the specific
 * permission it needs, because CREATE, EDIT, DELETE and PUBLISH are granted
 * independently (§6).
 */
@Component({
  selector: 'app-banner-manage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    PaginationComponent,
    EmptyStateComponent,
    ConfirmComponent,
    IconComponent,
  ],
  templateUrl: './banner-manage.component.html',
  styleUrl: './banner-manage.component.scss',
})
export class BannerManageComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly tabs = TABS;
  readonly banners = signal<Banner[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly pendingDelete = signal<Banner | null>(null);

  readonly canCreate = this.auth.has(PERMISSIONS.CREATE_BANNER);
  readonly canEdit = this.auth.has(PERMISSIONS.EDIT_BANNER);
  readonly canDelete = this.auth.has(PERMISSIONS.DELETE_BANNER);
  readonly canPublish = this.auth.has(PERMISSIONS.PUBLISH_BANNER);

  status: BannerStatus | 'all' = 'all';
  search = '';
  page = 1;

  constructor() {
    this.load();
  }

  setStatus(status: BannerStatus | 'all'): void {
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
  }

  private load(): void {
    this.loading.set(true);
    this.api
      .listBanners({ page: this.page, limit: 20, status: this.status, search: this.search || undefined })
      .subscribe({
        next: (result) => {
          this.banners.set(result.items);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: () => {
          this.banners.set([]);
          this.loading.set(false);
        },
      });
  }

  /** Transitions offered for a banner's current state. */
  nextStatuses(banner: Banner): { value: BannerStatus; label: string }[] {
    if (!this.canPublish) return [];
    switch (banner.status) {
      case 'draft':
      case 'scheduled':
        return [{ value: 'published', label: 'Publish' }];
      case 'published':
        return [{ value: 'deactivated', label: 'Deactivate' }];
      case 'expired':
      case 'deactivated':
        return [{ value: 'published', label: 'Republish' }];
      default:
        return [];
    }
  }

  changeStatus(banner: Banner, status: BannerStatus): void {
    this.api.setBannerStatus(banner.id, status).subscribe({
      next: (updated) => {
        this.banners.update((list) =>
          list.map((item) => (item.id === updated.id ? updated : item)),
        );
        this.toast.success(
          updated.isLive
            ? 'Banner published — it is live on the offers page now.'
            : `Banner is now ${updated.status}.`,
        );
      },
    });
  }

  confirmDelete(): void {
    const banner = this.pendingDelete();
    if (!banner) return;

    this.api.deleteBanner(banner.id).subscribe({
      next: () => {
        this.banners.update((list) => list.filter((item) => item.id !== banner.id));
        this.pendingDelete.set(null);
        this.toast.success('Banner deleted.');
      },
      error: () => this.pendingDelete.set(null),
    });
  }

  statusClass(status: BannerStatus): string {
    return {
      published: 'badge badge-success',
      scheduled: 'badge badge-info',
      expired: 'badge badge-warning',
      deactivated: 'badge badge-danger',
      draft: 'badge',
    }[status];
  }

  /** Explains why a banner that looks published still is not showing (§10). */
  notLiveReason(banner: Banner): string | null {
    if (banner.isLive) return null;
    if (banner.status !== 'published') return null;

    if (banner.offerStatus !== 'active') return `The offer is ${banner.offerStatus}`;
    if (new Date(banner.offerEndDate) < new Date()) return 'The offer has expired';
    if (new Date(banner.startDate) > new Date()) return 'Starts later';
    if (new Date(banner.endDate) < new Date()) return 'Window has passed';
    return 'Not currently eligible';
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    });
  }
}
