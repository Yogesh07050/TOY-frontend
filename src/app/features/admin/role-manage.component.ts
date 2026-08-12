import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Permission, Role } from '../../core/models';
import { applyServerErrors, errorFor } from '../auth/auth-shell';
import { ConfirmComponent } from '../../shared/ui.components';

/** Roles page (§4): granular permissions, not just role names. */
@Component({
  selector: 'app-role-manage',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmComponent],
  templateUrl: './role-manage.component.html',
  styles: [
    `
      .role-layout {
        display: grid;
        grid-template-columns: minmax(0, 280px) minmax(0, 1fr);
        gap: 1.25rem;
        align-items: start;
      }

      .role-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .role-list li button {
        display: block;
        width: 100%;
        text-align: left;
        padding: 0.7rem 0.9rem;
        border: none;
        background: none;
        border-bottom: 1px solid var(--border);
        cursor: pointer;
        font: inherit;
        color: var(--text);
      }

      .role-list li button:hover {
        background: var(--surface-alt);
      }

      .role-list li button.active {
        background: var(--brand-light);
        border-left: 3px solid var(--brand);
      }

      .permission-group {
        margin-bottom: 1.1rem;
      }

      .permission-group h4 {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
        margin-bottom: 0.4rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .permission-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
        gap: 0.35rem;
      }

      .permission-option {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
        padding: 0.5rem 0.6rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        cursor: pointer;
      }

      .permission-option.selected {
        border-color: var(--brand);
        background: var(--brand-light);
      }

      .permission-option input {
        margin-top: 0.15rem;
        accent-color: var(--brand);
      }

      .permission-option span {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .permission-option code {
        font-size: 0.78rem;
        font-weight: 650;
      }

      @media (max-width: 960px) {
        .role-layout {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
  ],
})
export class RoleManageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly roles = signal<Role[]>([]);
  readonly permissions = signal<Permission[]>([]);
  readonly selectedRole = signal<Role | null>(null);
  readonly selectedPermissions = signal<number[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly creating = signal(false);
  readonly pendingDelete = signal<Role | null>(null);
  readonly formError = signal<string | null>(null);

  /** Permissions grouped by their category, for a readable matrix. */
  readonly groupedPermissions = computed(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of this.permissions()) {
      const key = permission.category ?? 'Other';
      groups.set(key, [...(groups.get(key) ?? []), permission]);
    }
    return [...groups.entries()].map(([category, items]) => ({ category, items }));
  });

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    scope: ['shop' as 'global' | 'shop'],
    status: ['active' as 'active' | 'inactive'],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.listPermissions().subscribe({
      next: (permissions) => this.permissions.set(permissions),
      error: () => undefined,
    });

    this.api.listRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
        if (roles.length && !this.creating()) this.select(roles[0]);
      },
      error: () => this.loading.set(false),
    });
  }

  error(control: string, label: string): string | null {
    return errorFor(this.form.get(control), label);
  }

  select(role: Role): void {
    this.creating.set(false);
    this.selectedRole.set(role);
    this.selectedPermissions.set(role.permissions.map((permission) => permission.id));
    this.form.patchValue({
      name: role.name,
      description: role.description ?? '',
      scope: role.scope,
      status: role.status,
    });
    this.formError.set(null);
  }

  startCreate(): void {
    this.creating.set(true);
    this.selectedRole.set(null);
    this.selectedPermissions.set([]);
    this.form.reset({ scope: 'shop', status: 'active' });
    this.formError.set(null);
  }

  togglePermission(id: number): void {
    this.selectedPermissions.update((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
    );
  }

  isSelected(id: number): boolean {
    return this.selectedPermissions().includes(id);
  }

  toggleGroup(items: Permission[]): void {
    const ids = items.map((permission) => permission.id);
    const allSelected = ids.every((id) => this.isSelected(id));
    this.selectedPermissions.update((current) =>
      allSelected ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])],
    );
  }

  groupState(items: Permission[]): 'all' | 'some' | 'none' {
    const selected = items.filter((permission) => this.isSelected(permission.id)).length;
    if (selected === 0) return 'none';
    return selected === items.length ? 'all' : 'some';
  }

  save(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      name: value.name,
      description: value.description || null,
      scope: value.scope,
      status: value.status,
      permissionIds: this.selectedPermissions(),
    };

    this.saving.set(true);
    const role = this.selectedRole();
    const request = role ? this.api.updateRole(role.id, payload) : this.api.createRole(payload);

    request.subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.toast.success(role ? 'Role updated.' : `Role ${updated.name} created.`);
        this.creating.set(false);
        this.selectedRole.set(updated);
        this.load();
        // The signed-in user's own permissions may have just changed.
        this.auth.reload().subscribe();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(applyServerErrors(this.form, error));
      },
    });
  }

  confirmDelete(): void {
    const role = this.pendingDelete();
    if (!role) return;

    this.api.deleteRole(role.id).subscribe({
      next: () => {
        this.pendingDelete.set(null);
        this.selectedRole.set(null);
        this.toast.success('Role deleted.');
        this.load();
      },
      error: () => this.pendingDelete.set(null),
    });
  }
}
