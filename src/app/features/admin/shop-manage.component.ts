import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { PageMeta, Shop } from '../../core/models';
import { PERMISSIONS } from '../../core/permissions';
import { ConfirmComponent, EmptyStateComponent, PaginationComponent } from '../../shared/ui.components';

/** Shop administration list (§16, §17, §18 entry point). */
@Component({
  selector: 'app-shop-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PaginationComponent, EmptyStateComponent, ConfirmComponent],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Shops</h1>
          <p class="subtitle">
            @if (auth.isSuperAdmin) {
              Create shops, add branches and assign members.
            } @else {
              The shops you are a member of.
            }
          </p>
        </div>
        @if (canCreate) {
          <a routerLink="/admin/shops/new" class="btn">➕ Create a shop</a>
        }
      </div>

      @if (canCreate) {
        <div class="card mb-2">
          <div class="card-body row">
            <input
              type="search"
              class="grow"
              placeholder="Search shops"
              [(ngModel)]="search"
              (keyup.enter)="reload()"
              aria-label="Search shops"
            />
            <select [(ngModel)]="status" (change)="reload()" aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button type="button" class="btn btn-secondary" (click)="reload()">Search</button>
          </div>
        </div>
      }

      @if (loading()) {
        <div class="skeleton" style="height: 260px"></div>
      } @else if (shops().length === 0) {
        <app-empty-state emoji="🏬" title="No shops yet" message="Create a shop to start publishing offers.">
          @if (canCreate) {
            <a routerLink="/admin/shops/new" class="btn mt-2">Create a shop</a>
          }
        </app-empty-state>
      } @else {
        <div class="card">
          <div class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Shop</th>
                  <th>Categories</th>
                  <th>Branches</th>
                  <th>Active offers</th>
                  <th>Followers</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (shop of shops(); track shop.id) {
                  <tr>
                    <td>
                      <div class="shop-cell">
                        @if (shop.logoUrl) {
                          <img class="logo" [src]="shop.logoUrl" [alt]="shop.name" />
                        } @else {
                          <span class="logo placeholder">{{ shop.name.charAt(0) }}</span>
                        }
                        <span class="body">
                          <a [routerLink]="['/shops', shop.slug]" class="truncate">{{ shop.name }}</a>
                          <span class="small muted truncate">{{ shop.city || 'No branch yet' }}</span>
                        </span>
                      </div>
                    </td>
                    <td class="small muted">
                      {{ shop.categories.length ? namesOf(shop) : '—' }}
                    </td>
                    <td>{{ shop.branchCount ?? 0 }}</td>
                    <td>{{ shop.activeOfferCount ?? 0 }}</td>
                    <td>{{ shop.followerCount ?? 0 }}</td>
                    <td>
                      <span class="badge" [class.badge-success]="shop.status === 'active'" [class.badge-danger]="shop.status !== 'active'">
                        {{ shop.status }}
                      </span>
                    </td>
                    <td>
                      <div class="actions-cell">
                        @if (auth.hasForShop(shop.id, 'EDIT_SHOP')) {
                          <a class="btn btn-secondary btn-sm" [routerLink]="['/admin/shops', shop.id, 'edit']">Edit</a>
                        }
                        @if (auth.hasForShop(shop.id, 'MANAGE_LOCATIONS')) {
                          <a class="btn btn-ghost btn-sm" [routerLink]="['/admin/shops', shop.id, 'branches']">Branches</a>
                        }
                        @if (auth.hasForShop(shop.id, 'VIEW_SHOP_MEMBERS')) {
                          <a class="btn btn-ghost btn-sm" [routerLink]="['/admin/shops', shop.id, 'members']">Members</a>
                        }
                        @if (canDelete) {
                          <button type="button" class="btn btn-ghost btn-sm" (click)="pendingDelete.set(shop)">
                            Delete
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <app-pagination [meta]="meta()" (pageChange)="goToPage($event)" />
      }

      <app-confirm
        [open]="pendingDelete() !== null"
        title="Delete this shop?"
        [message]="
          'Deleting &quot;' +
          (pendingDelete()?.name || '') +
          '&quot; also removes its branches and members. Shops with offers cannot be deleted — deactivate them instead.'
        "
        confirmLabel="Delete shop"
        (confirm)="confirmDelete()"
        (cancel)="pendingDelete.set(null)"
      />
    </div>
  `,
  styles: [
    `
      .card-body .grow {
        flex: 1;
        min-width: 200px;
      }

      .card-body select {
        width: auto;
        min-width: 150px;
      }

      .shop-cell {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        min-width: 0;
      }

      .logo {
        width: 38px;
        height: 38px;
        border-radius: 9px;
        object-fit: cover;
        flex-shrink: 0;
      }

      .logo.placeholder {
        display: grid;
        place-items: center;
        background: var(--brand-light);
        color: var(--brand);
        font-weight: 700;
      }

      .shop-cell .body {
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
export class ShopManageComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly shops = signal<Shop[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly pendingDelete = signal<Shop | null>(null);

  readonly canCreate = this.auth.has(PERMISSIONS.CREATE_SHOP);
  readonly canDelete = this.auth.has(PERMISSIONS.DELETE_SHOP);

  search = '';
  status = 'all';
  page = 1;

  constructor() {
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

  namesOf(shop: Shop): string {
    return shop.categories.map((category) => category.name).join(', ');
  }

  private load(): void {
    this.loading.set(true);
    this.api
      .listShops({
        page: this.page,
        limit: 20,
        search: this.search || undefined,
        // Only a Super Admin can list every shop; an Admin sees their own.
        mine: this.auth.isSuperAdmin ? undefined : true,
        status: this.auth.isSuperAdmin ? this.status : undefined,
      })
      .subscribe({
        next: (result) => {
          this.shops.set(result.items);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: () => {
          this.shops.set([]);
          this.loading.set(false);
        },
      });
  }

  confirmDelete(): void {
    const shop = this.pendingDelete();
    if (!shop) return;

    this.api.deleteShop(shop.id).subscribe({
      next: () => {
        this.shops.update((list) => list.filter((item) => item.id !== shop.id));
        this.pendingDelete.set(null);
        this.toast.success('Shop deleted.');
      },
      error: () => this.pendingDelete.set(null),
    });
  }
}
