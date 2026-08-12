import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { PERMISSIONS, PermissionName } from '../../core/permissions';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  /** Shown when the user holds any of these; omitted means always shown. */
  permissions?: PermissionName[];
  superAdminOnly?: boolean;
  exact?: boolean;
}

/**
 * Admin shell with a permission-filtered sidebar (§42). The menu adapts to what
 * the signed-in user may actually do, so an Admin never sees Super Admin areas.
 */
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-layout">
      <aside class="sidebar" [class.open]="sidebarOpen()">
        <div class="sidebar-head">
          <span class="small subtle">{{ contextLabel() }}</span>
          <strong class="truncate">{{ scopeName() }}</strong>
        </div>

        <nav aria-label="Admin">
          @for (item of visibleNav(); track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              (click)="sidebarOpen.set(false)"
            >
              <span class="icon" aria-hidden="true">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar-foot">
          <a routerLink="/offers" class="small">← Back to the customer site</a>
        </div>
      </aside>

      <div class="admin-content">
        <button type="button" class="sidebar-toggle btn btn-secondary btn-sm" (click)="sidebarOpen.set(!sidebarOpen())">
          ☰ Menu
        </button>
        <router-outlet />
      </div>
    </div>
  `,
  styles: [
    `
      .admin-layout {
        display: grid;
        grid-template-columns: 232px minmax(0, 1fr);
        min-height: calc(100vh - var(--header-height));
        align-items: start;
      }

      .sidebar {
        position: sticky;
        top: var(--header-height);
        height: calc(100vh - var(--header-height));
        background: var(--surface);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        overflow-y: auto;
      }

      .sidebar-head strong {
        background: var(--gradient-brand-deep);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        font-size: 1.05rem;
      }

      .sidebar-head {
        padding: 1rem 1rem 0.75rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        flex-direction: column;
      }

      .sidebar nav {
        display: flex;
        flex-direction: column;
        padding: 0.5rem;
        gap: 0.1rem;
        flex: 1;
      }

      .sidebar nav a {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.58rem 0.7rem;
        border-radius: var(--radius-sm);
        color: var(--text-muted);
        font-size: 0.9rem;
        font-weight: 560;
        overflow: hidden;
        transition:
          background var(--fast) var(--ease),
          color var(--fast) var(--ease),
          padding-left var(--normal) var(--ease-out);
      }

      /* Accent bar slides in from the left on hover and locks for the active route. */
      .sidebar nav a::before {
        content: '';
        position: absolute;
        left: 0;
        top: 20%;
        bottom: 20%;
        width: 3px;
        border-radius: 0 3px 3px 0;
        background: var(--gradient-brand);
        transform: translateX(-4px);
        opacity: 0;
        transition: transform var(--normal) var(--ease-out), opacity var(--fast) var(--ease);
      }

      .sidebar nav a:hover {
        background: var(--surface-alt);
        color: var(--text);
        text-decoration: none;
        padding-left: 0.9rem;
      }

      .sidebar nav a:hover::before {
        transform: translateX(0);
        opacity: 0.5;
      }

      .sidebar nav a.active {
        background: var(--brand-light);
        color: var(--brand-strong);
        padding-left: 0.9rem;
      }

      .sidebar nav a.active::before {
        transform: translateX(0);
        opacity: 1;
      }

      .sidebar nav a .icon {
        transition: transform var(--normal) var(--ease-spring);
      }

      .sidebar nav a:hover .icon {
        transform: scale(1.15);
      }

      .icon {
        width: 20px;
        text-align: center;
      }

      .sidebar-foot {
        padding: 0.75rem 1rem;
        border-top: 1px solid var(--border);
      }

      .admin-content {
        min-width: 0;
        padding-bottom: 2rem;
      }

      .sidebar-toggle {
        display: none;
        margin: 1rem 1rem 0;
      }

      @media (max-width: 900px) {
        .admin-layout {
          grid-template-columns: minmax(0, 1fr);
        }

        .sidebar {
          display: none;
          position: static;
          height: auto;
          border-right: none;
          border-bottom: 1px solid var(--border);
        }

        .sidebar.open {
          display: flex;
          animation: slide-down var(--normal) var(--ease-out);
        }

        .sidebar-toggle {
          display: inline-flex;
        }
      }
    `,
  ],
})
export class AdminShellComponent {
  readonly auth = inject(AuthService);
  readonly sidebarOpen = signal(false);

  private readonly nav: NavItem[] = [
    { label: 'Dashboard', route: '/admin/dashboard', icon: '📊' },
    { label: 'Offers', route: '/admin/offers', icon: '🏷️', permissions: [PERMISSIONS.VIEW_OFFERS] },
    { label: 'Post an offer', route: '/admin/offers/new', icon: '➕', permissions: [PERMISSIONS.CREATE_OFFER] },
    {
      label: 'Shops',
      route: '/admin/shops',
      icon: '🏬',
      permissions: [PERMISSIONS.VIEW_SHOP_MEMBERS, PERMISSIONS.EDIT_SHOP, PERMISSIONS.MANAGE_LOCATIONS],
    },
    { label: 'Analytics', route: '/admin/analytics', icon: '📈', permissions: [PERMISSIONS.VIEW_ANALYTICS] },
    { label: 'Categories', route: '/admin/categories', icon: '📚', permissions: [PERMISSIONS.MANAGE_CATEGORIES] },
    { label: 'Reviews', route: '/admin/reviews', icon: '⭐', permissions: [PERMISSIONS.MODERATE_REVIEWS] },
    { label: 'Users', route: '/admin/users', icon: '👥', permissions: [PERMISSIONS.VIEW_USERS] },
    { label: 'Roles & permissions', route: '/admin/roles', icon: '🔐', superAdminOnly: true },
    { label: 'Audit logs', route: '/admin/audit-logs', icon: '📜', permissions: [PERMISSIONS.VIEW_AUDIT_LOGS] },
  ];

  readonly visibleNav = computed(() => {
    // Reading the signal keeps the menu in step with role changes.
    this.auth.user();
    return this.nav.filter((item) => {
      if (item.superAdminOnly) return this.auth.isSuperAdmin;
      if (!item.permissions) return true;
      return this.auth.hasAny(...item.permissions);
    });
  });

  readonly contextLabel = computed(() => (this.auth.isSuperAdmin ? 'Signed in as' : 'Managing'));

  readonly scopeName = computed(() => {
    const user = this.auth.user();
    if (!user) return '';
    if (user.isSuperAdmin) return 'Super Admin';
    if (user.shops.length === 1) return user.shops[0].shopName;
    if (user.shops.length > 1) return `${user.shops.length} shops`;
    return user.name;
  });
}
