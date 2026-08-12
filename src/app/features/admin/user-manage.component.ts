import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { ManagedUser, PageMeta, Role, Shop } from '../../core/models';
import { PERMISSIONS } from '../../core/permissions';
import { ConfirmComponent, EmptyStateComponent, PaginationComponent } from '../../shared/ui.components';
import { ShopAccessComponent } from './shop-access.component';

/** User administration and role assignment (§3.1, §4). */
@Component({
  selector: 'app-user-manage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    EmptyStateComponent,
    ConfirmComponent,
    ShopAccessComponent,
  ],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Users</h1>
          <p class="subtitle">
            @if (meta()) {
              {{ meta()!.total }} registered user{{ meta()!.total === 1 ? '' : 's' }}
            } @else {
              Assign roles and control account access.
            }
          </p>
        </div>
      </div>

      <div class="card mb-2">
        <div class="card-body row">
          <input
            type="search"
            class="grow"
            placeholder="Search by name, email or phone"
            [value]="search"
            (input)="searchInput$.next($any($event.target).value)"
            aria-label="Search users"
          />
          <select [(ngModel)]="roleId" (change)="reload()" aria-label="Filter by role">
            <option [ngValue]="null">All roles</option>
            @for (role of roles(); track role.id) {
              <option [ngValue]="role.id">{{ role.name }}</option>
            }
          </select>
          <select [(ngModel)]="status" (change)="reload()" aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      @if (loading()) {
        <div class="skeleton" style="height: 300px"></div>
      } @else if (users().length === 0) {
        <app-empty-state emoji="👥" title="No users found" message="Try a different search." />
      } @else {
        <div class="card">
          <div class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Roles</th>
                  <th>Shops</th>
                  <th>Verified</th>
                  <th>Last login</th>
                  <th>Status</th>
                  @if (canManage) {
                    <th></th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (user of users(); track user.id) {
                  <tr>
                    <td>
                      <strong>{{ user.name }}</strong><br />
                      <span class="small muted">{{ user.email }}</span>
                      @if (user.phone) {
                        <br /><span class="small muted">{{ user.phone }}</span>
                      }
                    </td>
                    <td>
                      @if (editingRolesFor() === user.id) {
                        <div class="role-picker">
                          @for (role of roles(); track role.id) {
                            <label class="checkbox small">
                              <input
                                type="checkbox"
                                [checked]="draftRoles().includes(role.id)"
                                (change)="toggleDraftRole(role.id)"
                              />
                              <span>{{ role.name }}</span>
                            </label>
                          }
                          <div class="row mt-1">
                            <button type="button" class="btn btn-sm" (click)="saveRoles(user)">Save</button>
                            <button type="button" class="btn btn-ghost btn-sm" (click)="editingRolesFor.set(null)">
                              Cancel
                            </button>
                          </div>
                        </div>
                      } @else {
                        @for (role of user.roles; track role.id) {
                          <span class="badge badge-brand">{{ role.name }}</span>
                        }
                        @if (user.roles.length === 0) {
                          <span class="small muted">None</span>
                        }
                      }
                    </td>
                    <td class="small">
                      <button type="button" class="link-btn" (click)="toggleAccess(user)">
                        @if (user.shops.length) {
                          <span class="truncate">{{ shopNames(user) }}</span>
                        } @else if (needsShopAssignment(user)) {
                          <span class="badge badge-warning">Needs a shop</span>
                        } @else {
                          <span class="muted">—</span>
                        }
                      </button>
                    </td>
                    <td>
                      @if (user.emailVerified) {
                        <span class="badge badge-success">Yes</span>
                      } @else {
                        <span class="badge badge-warning">No</span>
                      }
                    </td>
                    <td class="small muted">
                      {{ user.lastLoginAt ? (user.lastLoginAt | date: 'd MMM y') : 'Never' }}
                    </td>
                    <td>
                      <span
                        class="badge"
                        [class.badge-success]="user.status === 'active'"
                        [class.badge-danger]="user.status !== 'active'"
                      >
                        {{ user.status }}
                      </span>
                    </td>
                    @if (canManage) {
                      <td>
                        <div class="actions-cell">
                          <button type="button" class="btn btn-secondary btn-sm" (click)="startEditRoles(user)">
                            Roles
                          </button>
                          @if (user.id !== auth.user()?.id) {
                            <button
                              type="button"
                              class="btn btn-ghost btn-sm"
                              (click)="pendingToggle.set(user)"
                            >
                              {{ user.status === 'active' ? 'Deactivate' : 'Activate' }}
                            </button>
                          }
                        </div>
                      </td>
                    }
                  </tr>

                  @if (accessFor() === user.id) {
                    <tr class="access-row">
                      <td [attr.colspan]="canManage ? 7 : 6">
                        @if (accessUser(); as detailed) {
                          <app-shop-access
                            [user]="detailed"
                            [shops]="shops()"
                            [roles]="roles()"
                            (changed)="onAccessChanged()"
                          />
                        } @else {
                          <div class="skeleton" style="height: 90px"></div>
                        }
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>

        <app-pagination [meta]="meta()" (pageChange)="goToPage($event)" />
      }

      <app-confirm
        [open]="pendingToggle() !== null"
        [title]="pendingToggle()?.status === 'active' ? 'Deactivate this account?' : 'Activate this account?'"
        [message]="
          pendingToggle()?.status === 'active'
            ? 'The user is signed out everywhere and cannot sign back in until reactivated.'
            : 'The user will be able to sign in again.'
        "
        [confirmLabel]="pendingToggle()?.status === 'active' ? 'Deactivate' : 'Activate'"
        [danger]="pendingToggle()?.status === 'active'"
        (confirm)="confirmToggle()"
        (cancel)="pendingToggle.set(null)"
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

      .role-picker {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 170px;
      }

      .actions-cell {
        display: flex;
        gap: 0.25rem;
        white-space: nowrap;
      }

      .link-btn {
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        color: var(--brand);
        cursor: pointer;
        text-align: left;
        max-width: 200px;
      }

      .link-btn:hover {
        text-decoration: underline;
      }

      .access-row > td {
        background: var(--surface-alt);
      }
    `,
  ],
})
export class UserManageComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly users = signal<ManagedUser[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly roles = signal<Role[]>([]);
  readonly loading = signal(true);
  readonly editingRolesFor = signal<number | null>(null);
  readonly draftRoles = signal<number[]>([]);
  readonly pendingToggle = signal<ManagedUser | null>(null);
  readonly shops = signal<Shop[]>([]);
  /** Id of the user whose shop-access panel is expanded. */
  readonly accessFor = signal<number | null>(null);
  readonly accessUser = signal<ManagedUser | null>(null);

  readonly canManage = this.auth.has(PERMISSIONS.MANAGE_USERS);

  search = '';
  roleId: number | null = null;
  status = 'all';
  page = 1;

  readonly searchInput$ = new Subject<string>();

  constructor() {
    this.searchInput$.pipe(debounceTime(350), distinctUntilChanged()).subscribe((value) => {
      this.search = value;
      this.page = 1;
      this.load();
    });

    if (this.auth.has(PERMISSIONS.MANAGE_ROLES)) {
      this.api.listRoles().subscribe({
        next: (roles) => this.roles.set(roles),
        error: () => undefined,
      });
    }

    // Needed to offer shops when assigning access.
    this.api.listShops({ limit: 100, status: 'all', sort: 'name' }).subscribe({
      next: (page) => this.shops.set(page.items),
      error: () => undefined,
    });

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
      .listUsers({
        page: this.page,
        limit: 20,
        search: this.search || undefined,
        roleId: this.roleId ?? undefined,
        status: this.status,
      })
      .subscribe({
        next: (result) => {
          this.users.set(result.items);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: () => {
          this.users.set([]);
          this.loading.set(false);
        },
      });
  }

  shopNames(user: ManagedUser): string {
    return user.shops.map((shop) => shop.name).join(', ');
  }

  /** A shop-scoped role with no shop behind it is a half-finished assignment. */
  needsShopAssignment(user: ManagedUser): boolean {
    if (user.shops.length > 0) return false;
    const scoped = new Set(
      this.roles().filter((role) => role.scope === 'shop').map((role) => role.name),
    );
    return user.roles.some((role) => scoped.has(role.name));
  }

  toggleAccess(user: ManagedUser): void {
    if (this.accessFor() === user.id) {
      this.accessFor.set(null);
      return;
    }
    this.accessFor.set(user.id);
    this.accessUser.set(null);
    // The list response omits memberships, so fetch the detailed record.
    this.api.getUser(user.id).subscribe({
      next: (detailed) => this.accessUser.set(detailed),
      error: () => this.accessFor.set(null),
    });
  }

  onAccessChanged(): void {
    this.load();
    if (this.accessFor() === this.auth.user()?.id) this.auth.reload().subscribe();
  }

  startEditRoles(user: ManagedUser): void {
    this.editingRolesFor.set(user.id);
    this.draftRoles.set(user.roles.map((role) => role.id));
  }

  toggleDraftRole(roleId: number): void {
    this.draftRoles.update((ids) =>
      ids.includes(roleId) ? ids.filter((id) => id !== roleId) : [...ids, roleId],
    );
  }

  saveRoles(user: ManagedUser): void {
    this.api.updateUser(user.id, { roleIds: this.draftRoles() }).subscribe({
      next: (updated) => {
        this.users.update((list) =>
          list.map((item) => (item.id === updated.id ? { ...item, roles: updated.roles } : item)),
        );
        this.editingRolesFor.set(null);
        this.toast.success(`Roles updated for ${user.name}.`);
        // A shop role is inert without a shop, so open the assignment panel.
        if (this.needsShopAssignment({ ...user, roles: updated.roles })) {
          this.toast.info(`${user.name} still needs a shop for that role to take effect.`);
          this.toggleAccess(user);
        }
        // If the admin changed their own roles, refresh the cached permissions.
        if (user.id === this.auth.user()?.id) this.auth.reload().subscribe();
      },
    });
  }

  confirmToggle(): void {
    const user = this.pendingToggle();
    if (!user) return;

    const next = user.status === 'active' ? 'inactive' : 'active';
    this.api.setUserStatus(user.id, next).subscribe({
      next: (updated) => {
        this.users.update((list) =>
          list.map((item) => (item.id === updated.id ? { ...item, status: updated.status } : item)),
        );
        this.pendingToggle.set(null);
        this.toast.success(`${user.name} is now ${next}.`);
      },
      error: () => this.pendingToggle.set(null),
    });
  }
}
