import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiService } from '../../core/api.service';
import { AuthPromptService } from '../../core/auth-prompt.service';
import { AuthService } from '../../core/auth.service';
import { LocationService } from '../../core/location.service';
import { ToastService } from '../../core/toast.service';
import { Category, PageMeta, Shop } from '../../core/models';
import { DistancePipe } from '../../shared/offer-badge.pipe';
import { EmptyStateComponent, PaginationComponent } from '../../shared/ui.components';
import { IconComponent } from '../../shared/icon.component';

/** Shop directory (§42 - customer navigation). */
@Component({
  selector: 'app-shop-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DistancePipe, EmptyStateComponent, PaginationComponent, IconComponent],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Shops</h1>
          <p class="subtitle">
            @if (meta()) {
              {{ meta()!.total }} shop{{ meta()!.total === 1 ? '' : 's' }} publishing offers
            } @else {
              Browse every shop on the platform.
            }
          </p>
        </div>
      </div>

      <div class="filters card">
        <div class="card-body row">
          <input
            type="search"
            class="grow"
            placeholder="Search shops"
            [value]="search"
            (input)="searchInput$.next($any($event.target).value)"
            aria-label="Search shops"
          />

          <select [(ngModel)]="categoryId" (change)="reload()" aria-label="Filter by category">
            <option [ngValue]="null">All categories</option>
            @for (category of categories(); track category.id) {
              <option [ngValue]="category.id">{{ category.name }}</option>
            }
          </select>

          <select [(ngModel)]="sort" (change)="reload()" aria-label="Sort shops">
            <option value="name">Name (A–Z)</option>
            <option value="popular">Most followed</option>
            <option value="newest">Newest</option>
            <option value="nearest" [disabled]="!locations.hasPosition()">Nearest</option>
          </select>
        </div>
      </div>

      @if (loading()) {
        <div class="grid grid-cards stagger">
          @for (item of [1, 2, 3, 4, 5, 6]; track item) {
            <div class="skeleton" style="height: 160px"></div>
          }
        </div>
      } @else if (shops().length === 0) {
        <app-empty-state icon="storefront-outline" title="No shops found" message="Try a different search or category." />
      } @else {
        <div class="grid grid-cards stagger">
          @for (shop of shops(); track shop.id) {
            <article class="shop-card card">
              <a class="shop-main" [routerLink]="['/shops', shop.slug]">
                <div class="head">
                  @if (shop.logoUrl) {
                    <img class="logo" [src]="shop.logoUrl" [alt]="shop.name" loading="lazy" />
                  } @else {
                    <span class="logo placeholder">{{ shop.name.charAt(0) }}</span>
                  }
                  <div class="min-w-0">
                    <h2 class="truncate">{{ shop.name }}</h2>
                    <p class="small muted mb-0 truncate">
                      @if (shop.city) { <app-icon name="location-outline" [size]="15" /> {{ shop.city }} }
                      @if (shop.distanceKm !== null) { · {{ shop.distanceKm | distance }} }
                    </p>
                  </div>
                </div>

                @if (shop.description) {
                  <p class="small muted clamp-2">{{ shop.description }}</p>
                }

                <div class="cats">
                  @for (category of shop.categories.slice(0, 3); track category.id) {
                    <span class="badge">{{ category.name }}</span>
                  }
                </div>

                <p class="small strong mb-0">
                  {{ shop.activeOfferCount || 0 }} active offer{{ shop.activeOfferCount === 1 ? '' : 's' }}
                  @if (shop.branchCount) {
                    · {{ shop.branchCount }} branch{{ shop.branchCount === 1 ? '' : 'es' }}
                  }
                </p>
              </a>

              <div class="shop-actions">
                <button
                  type="button"
                  class="btn btn-sm"
                  [class.btn-secondary]="shop.isFollowing"
                  (click)="toggleFollow(shop)"
                >
                  <app-icon
                    [name]="shop.isFollowing ? 'checkmark-outline' : 'add-outline'"
                    [size]="14"
                  />
                  {{ shop.isFollowing ? 'Following' : 'Follow' }}
                </button>
                <a class="btn btn-ghost btn-sm" [routerLink]="['/offers']" [queryParams]="{ shopId: shop.id }">
                  See offers
                </a>
              </div>
            </article>
          }
        </div>

        <app-pagination [meta]="meta()" (pageChange)="goToPage($event)" />
      }
    </div>
  `,
  styles: [
    `
      .filters {
        margin-bottom: 1.25rem;
      }

      .filters .grow {
        flex: 1;
        min-width: 200px;
      }

      .filters select {
        width: auto;
        min-width: 160px;
      }

      .shop-card {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition:
          transform var(--normal) var(--ease-out),
          box-shadow var(--normal) var(--ease-out),
          border-color var(--normal) var(--ease);
      }

      .shop-card:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-lg);
        border-color: transparent;
      }

      .shop-card:hover .logo {
        transform: scale(1.06) rotate(-2deg);
      }

      .shop-main {
        display: block;
        padding: 1rem;
        color: var(--text);
        flex: 1;
      }

      .shop-main:hover {
        text-decoration: none;
      }

      .shop-main:hover h2 {
        color: var(--brand);
      }

      .head {
        display: flex;
        gap: 0.7rem;
        align-items: center;
        margin-bottom: 0.6rem;
      }

      .min-w-0 {
        min-width: 0;
      }

      .logo {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        object-fit: cover;
        flex-shrink: 0;
        transition: transform var(--normal) var(--ease-spring);
      }

      .logo.placeholder {
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, var(--brand-light) 0%, #fcd34d 100%);
        color: var(--brand-strong);
        font-size: 1.35rem;
        font-weight: 800;
      }

      h2 {
        font-size: 1.02rem;
        margin: 0;
      }

      .cats {
        display: flex;
        gap: 0.3rem;
        flex-wrap: wrap;
        margin-bottom: 0.5rem;
      }

      .shop-actions {
        display: flex;
        gap: 0.4rem;
        padding: 0.6rem 1rem;
        border-top: 1px solid var(--border);
        background: var(--surface-alt);
      }
    `,
  ],
})
export class ShopListComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly prompt = inject(AuthPromptService);
  readonly locations = inject(LocationService);

  readonly shops = signal<Shop[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);

  search = '';
  categoryId: number | null = null;
  sort = 'name';
  page = 1;

  readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$.pipe(debounceTime(350), distinctUntilChanged()).subscribe((value) => {
      this.search = value;
      this.page = 1;
      this.load();
    });

    const params = this.route.snapshot.queryParamMap;
    this.categoryId = params.get('categoryId') ? Number(params.get('categoryId')) : null;
    this.search = params.get('search') ?? '';

    this.api.listCategories().subscribe((categories) => this.categories.set(categories));
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
    const position = this.locations.position;

    this.api
      .listShops({
        page: this.page,
        limit: environment.pageSize,
        search: this.search || undefined,
        categoryId: this.categoryId ?? undefined,
        sort: this.sort === 'nearest' && !position ? 'name' : this.sort,
        latitude: position?.latitude ?? undefined,
        longitude: position?.longitude ?? undefined,
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

  toggleFollow(shop: Shop): void {
    // §15: the shop directory is public; only following needs an account.
    if (!this.prompt.require('follow-shop', () => this.toggleFollow(shop))) return;

    const following = Boolean(shop.isFollowing);
    const request = following ? this.api.unfollowShop(shop.id) : this.api.followShop(shop.id);

    this.patch(shop.id, { isFollowing: !following });
    request.subscribe({
      next: () => this.toast.success(following ? `Unfollowed ${shop.name}` : `Following ${shop.name}`),
      error: () => this.patch(shop.id, { isFollowing: following }),
    });
  }

  private patch(id: number, changes: Partial<Shop>): void {
    this.shops.update((list) => list.map((shop) => (shop.id === id ? { ...shop, ...changes } : shop)));
  }
}
