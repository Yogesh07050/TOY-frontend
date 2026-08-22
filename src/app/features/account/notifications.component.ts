import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { AppNotification, PageMeta } from '../../core/models';
import { EmptyStateComponent, PaginationComponent } from '../../shared/ui.components';
import { IconComponent } from '../../shared/icon.component';
import { IconName } from '../../shared/icons';

/** Notification centre (§24). */
@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, EmptyStateComponent, PaginationComponent, IconComponent],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Notifications</h1>
          <p class="subtitle">
            @if (meta()?.unread) {
              {{ meta()!.unread }} unread
            } @else {
              You are all caught up.
            }
          </p>
        </div>
        <div class="row">
          <button
            type="button"
            class="chip"
            [class.active]="!unreadOnly()"
            (click)="setFilter(false)"
          >
            All
          </button>
          <button type="button" class="chip" [class.active]="unreadOnly()" (click)="setFilter(true)">
            Unread
          </button>
          @if ((meta()?.unread ?? 0) > 0) {
            <button type="button" class="btn btn-secondary btn-sm" (click)="markAllRead()">
              Mark all read
            </button>
          }
          <a routerLink="/profile" class="btn btn-ghost btn-sm">Preferences</a>
        </div>
      </div>

      @if (loading()) {
        <div class="stack">
          @for (item of [1, 2, 3, 4]; track item) {
            <div class="skeleton" style="height: 70px"></div>
          }
        </div>
      } @else if (notifications().length === 0) {
        <app-empty-state
          icon="notifications-outline"
          title="No notifications"
          message="Follow shops and categories, and save offers, to get updates here."
        >
          <a routerLink="/shops" class="btn mt-2">Find shops to follow</a>
        </app-empty-state>
      } @else {
        <ul class="notif-list card">
          @for (notification of notifications(); track notification.id) {
            <li [class.unread]="!notification.isRead">
              <app-icon class="icon" [name]="iconFor(notification.type)" [size]="18" />

              <button type="button" class="body" (click)="open(notification)">
                <strong>{{ notification.title }}</strong>
                @if (notification.message) {
                  <span class="small muted">{{ notification.message }}</span>
                }
                <span class="small subtle">{{ timeAgo(notification.createdAt) }}</span>
              </button>

              <div class="actions">
                @if (!notification.isRead) {
                  <button type="button" class="icon-btn" title="Mark as read" (click)="markRead(notification)">
                    <app-icon name="checkmark-outline" [size]="15" /> </button>
                }
                <button type="button" class="icon-btn" title="Delete" (click)="remove(notification)"><app-icon name="close-outline" [size]="16" /></button>
              </div>
            </li>
          }
        </ul>

        <app-pagination [meta]="meta()" (pageChange)="goToPage($event)" />
      }
    </div>
  `,
  styles: [
    `
      .notif-list {
        list-style: none;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }

      .notif-list li {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.85rem 1rem;
        border-bottom: 1px solid var(--border);
      }

      .notif-list li:last-child {
        border-bottom: none;
      }

      .notif-list li.unread {
        background: var(--brand-light);
      }

      .icon {
        font-size: 1.15rem;
        line-height: 1.4;
      }

      .body {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        background: none;
        border: none;
        padding: 0;
        text-align: left;
        font: inherit;
        cursor: pointer;
        min-width: 0;
        color: var(--text);
      }

      .body:hover strong {
        color: var(--brand);
      }

      .actions {
        display: flex;
        gap: 0.25rem;
        flex-shrink: 0;
      }
    `,
  ],
})
export class NotificationsComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly notifications = signal<AppNotification[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly unreadOnly = signal(false);
  private page = 1;

  private readonly icons: Record<string, IconName> = {
    NEW_OFFER_FOLLOWED_SHOP: 'storefront-outline',
    NEW_OFFER_FOLLOWED_CATEGORY: 'pricetags-outline',
    NEW_OFFER_NEARBY: 'location-outline',
    FAVORITE_EXPIRING: 'hourglass-outline',
    SAVED_SERVICE_OFFER_EXPIRING: 'hourglass-outline',
    OFFER_UPDATED: 'create-outline',
    OFFER_DEACTIVATED: 'ban-outline',
    OFFER_PUBLISHED: 'megaphone-outline',
    ADMIN_ANNOUNCEMENT: 'megaphone-outline',
  };

  constructor() {
    this.load();
  }

  iconFor(type: string): IconName {
    return this.icons[type] ?? 'notifications-outline';
  }

  setFilter(unreadOnly: boolean): void {
    this.unreadOnly.set(unreadOnly);
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
      .listNotifications({ page: this.page, limit: 20, unreadOnly: this.unreadOnly() })
      .subscribe({
        next: (result) => {
          this.notifications.set(result.items);
          this.meta.set(result.meta);
          this.auth.unreadCount.set(result.meta.unread ?? 0);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  /** Opens the entity the notification points at, marking it read on the way. */
  open(notification: AppNotification): void {
    if (!notification.isRead) this.markRead(notification);
    if (notification.entityType === 'offer' && notification.entityId) {
      void this.router.navigate(['/offers', notification.entityId]);
    } else if (notification.entityType === 'service_offer' && notification.entityId) {
      // entityId is the service's own id (not the service_offer's) - a service
      // offer has no standalone detail page, only its parent service does.
      void this.router.navigate(['/services', notification.entityId]);
    }
  }

  markRead(notification: AppNotification): void {
    this.patch(notification.id, { isRead: true });
    this.auth.unreadCount.update((count) => Math.max(count - 1, 0));
    this.api.markNotificationRead(notification.id).subscribe({
      error: () => this.patch(notification.id, { isRead: false }),
    });
  }

  markAllRead(): void {
    this.notifications.update((list) => list.map((item) => ({ ...item, isRead: true })));
    this.auth.unreadCount.set(0);
    this.meta.update((meta) => (meta ? { ...meta, unread: 0 } : meta));
    this.api.markAllNotificationsRead().subscribe({
      next: () => this.toast.success('All notifications marked as read'),
      error: () => this.load(),
    });
  }

  remove(notification: AppNotification): void {
    const previous = this.notifications();
    this.notifications.update((list) => list.filter((item) => item.id !== notification.id));
    this.api.deleteNotification(notification.id).subscribe({
      error: () => this.notifications.set(previous),
    });
  }

  timeAgo(value: string): string {
    const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  private patch(id: number, changes: Partial<AppNotification>): void {
    this.notifications.update((list) =>
      list.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }
}
