import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { ManagedUser, Role, Shop, UserMembership } from '../../core/models';

/**
 * Assigns a user to shops (§18). This is the step that turns a shop-scoped role
 * such as ADMIN into real access: the role alone grants nothing until the person
 * is attached to a shop, so the Users screen has to be able to do both.
 */
@Component({
  selector: 'app-shop-access',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="shop-access">
      @if (needsShop()) {
        <p class="callout">
          <strong>{{ user.name }}</strong> holds the
          {{ shopRoleNames().join(' and ') }} role, which only takes effect for a shop.
          Assign a shop below to activate it.
        </p>
      }

      @if (memberships().length) {
        <ul class="access-list">
          @for (membership of memberships(); track membership.id) {
            <li>
              <span class="access-body">
                <strong>{{ membership.shopName }}</strong>
                <span class="small muted">
                  {{ membership.roleName || 'No role' }}
                  @if (membership.designation) { · {{ membership.designation }} }
                  @if (membership.branchName) { · {{ membership.branchName }} }
                </span>
              </span>
              <span
                class="badge"
                [class.badge-success]="membership.status === 'active'"
                [class.badge-danger]="membership.status !== 'active'"
              >
                {{ membership.status }}
              </span>
              <button type="button" class="btn btn-ghost btn-sm" (click)="remove(membership)">
                Remove
              </button>
            </li>
          }
        </ul>
      } @else {
        <p class="small muted mb-2">No shop access yet.</p>
      }

      <div class="assign-row">
        <select [(ngModel)]="shopId" aria-label="Shop">
          <option [ngValue]="null">Choose a shop…</option>
          @for (shop of assignableShops(); track shop.id) {
            <option [ngValue]="shop.id">{{ shop.name }}</option>
          }
        </select>

        <select [(ngModel)]="roleId" aria-label="Role in this shop">
          <option [ngValue]="null">No role (view only)</option>
          @for (role of shopRoles(); track role.id) {
            <option [ngValue]="role.id">{{ role.name }}</option>
          }
        </select>

        <input type="text" [(ngModel)]="designation" placeholder="Designation" aria-label="Designation" />

        <button type="button" class="btn btn-sm" [disabled]="!shopId || saving()" (click)="assign()">
          @if (saving()) {
            <span class="spinner"></span> Assigning…
          } @else {
            Assign
          }
        </button>
      </div>

      <p class="hint">
        A shop role grants its permissions only for the shops listed here.
        <a routerLink="/admin/roles">Review what each role can do →</a>
      </p>
    </div>
  `,
  styles: [
    `
      .shop-access {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .callout {
        margin: 0;
        padding: 0.6rem 0.75rem;
        border-radius: var(--radius-sm);
        background: var(--warning-bg);
        color: var(--warning);
        font-size: 0.85rem;
        line-height: 1.45;
      }

      .access-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }

      .access-list li {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.45rem 0.6rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--surface);
      }

      .access-body {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
      }

      .assign-row {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
        align-items: center;
      }

      .assign-row select,
      .assign-row input {
        width: auto;
        min-width: 140px;
        flex: 1;
        font-size: 0.85rem;
        padding: 0.35rem 0.5rem;
      }
    `,
  ],
})
export class ShopAccessComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  @Input({ required: true }) user!: ManagedUser;
  @Input() shops: Shop[] = [];
  @Input() roles: Role[] = [];
  @Output() changed = new EventEmitter<void>();

  readonly memberships = signal<UserMembership[]>([]);
  readonly saving = signal(false);

  shopId: number | null = null;
  roleId: number | null = null;
  designation = '';

  /** Only shop-scoped roles make sense as a shop assignment. */
  readonly shopRoles = computed(() => this.roles.filter((role) => role.scope === 'shop'));

  ngOnInit(): void {
    this.memberships.set(this.user.memberships ?? []);
    const admin = this.shopRoles().find((role) => role.name === 'ADMIN');
    if (admin) this.roleId = admin.id;
  }

  /** Shop-scoped roles the user holds that are not backed by any membership. */
  shopRoleNames(): string[] {
    const scoped = new Set(this.shopRoles().map((role) => role.name));
    return this.user.roles.filter((role) => scoped.has(role.name)).map((role) => role.name);
  }

  needsShop(): boolean {
    return this.memberships().length === 0 && this.shopRoleNames().length > 0;
  }

  assignableShops(): Shop[] {
    const taken = new Set(this.memberships().map((membership) => membership.shopId));
    return this.shops.filter((shop) => !taken.has(shop.id));
  }

  assign(): void {
    if (!this.shopId) return;
    this.saving.set(true);

    this.api
      .addUserMembership(this.user.id, {
        shopId: this.shopId,
        roleId: this.roleId,
        designation: this.designation || null,
      })
      .subscribe({
        next: (member) => {
          this.saving.set(false);
          this.memberships.update((list) => [
            ...list,
            {
              id: member.id,
              shopId: member.shopId,
              shopName: this.shops.find((shop) => shop.id === member.shopId)?.name ?? 'Shop',
              branchId: member.branchId,
              branchName: member.branchName,
              designation: member.designation,
              status: member.status,
              roleName: member.roleName,
            },
          ]);
          this.shopId = null;
          this.designation = '';
          this.toast.success(`${this.user.name} now has access to that shop.`);
          this.changed.emit();
        },
        error: () => this.saving.set(false),
      });
  }

  remove(membership: UserMembership): void {
    const previous = this.memberships();
    this.memberships.update((list) => list.filter((item) => item.id !== membership.id));

    this.api.removeUserMembership(this.user.id, membership.id).subscribe({
      next: () => {
        this.toast.success(`Removed access to ${membership.shopName}.`);
        this.changed.emit();
      },
      error: () => this.memberships.set(previous),
    });
  }
}
