import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Category } from '../../core/models';
import { applyServerErrors, errorFor } from '../auth/auth-shell';
import { ConfirmComponent, EmptyStateComponent } from '../../shared/ui.components';

/** Category management — categories are data, not hardcoded values (§6). */
@Component({
  selector: 'app-category-manage',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EmptyStateComponent, ConfirmComponent],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Categories</h1>
          <p class="subtitle">Categories drive discovery, filtering and the follow feature.</p>
        </div>
      </div>

      <div class="cat-layout">
        <div>
          @if (loading()) {
            <div class="skeleton" style="height: 260px"></div>
          } @else if (categories().length === 0) {
            <app-empty-state icon="albums-outline" title="No categories" message="Add the first one." />
          } @else {
            <div class="card">
              <div class="table-wrap">
                <table class="data">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Parent</th>
                      <th>Offers</th>
                      <th>Services</th>
                      <th>Shops</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (category of categories(); track category.id) {
                      <tr [class.editing]="editingId() === category.id">
                        <td>
                          <strong>{{ category.icon }} {{ category.name }}</strong>
                          @if (category.description) {
                            <br /><span class="small muted">{{ category.description }}</span>
                          }
                        </td>
                        <td class="small muted">{{ parentName(category.parentId) }}</td>
                        <td>{{ category.offerCount ?? 0 }}</td>
                        <td>{{ category.serviceCount ?? 0 }}</td>
                        <td>{{ category.shopCount ?? 0 }}</td>
                        <td>
                          <span
                            class="badge"
                            [class.badge-success]="category.status === 'active'"
                            [class.badge-danger]="category.status !== 'active'"
                          >
                            {{ category.status }}
                          </span>
                        </td>
                        <td>
                          <div class="actions-cell">
                            <button type="button" class="btn btn-secondary btn-sm" (click)="startEdit(category)">
                              Edit
                            </button>
                            <button type="button" class="btn btn-ghost btn-sm" (click)="pendingDelete.set(category)">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>

        <aside>
          <section class="card">
            <div class="card-header">
              <h3>{{ editingId() ? 'Edit category' : 'Add a category' }}</h3>
              @if (editingId()) {
                <button type="button" class="btn btn-ghost btn-sm" (click)="cancelEdit()">Cancel</button>
              }
            </div>
            <div class="card-body">
              <form [formGroup]="form" (ngSubmit)="save()" novalidate>
                @if (formError()) {
                  <div class="error-text mb-2">{{ formError() }}</div>
                }

                <div class="field">
                  <label for="name">Name *</label>
                  <input id="name" type="text" formControlName="name" [class.invalid]="error('name', 'Name')" />
                  @if (error('name', 'Name'); as message) {
                    <span class="error-text">{{ message }}</span>
                  }
                </div>

                <div class="field">
                  <label for="icon">Icon</label>
                  <input id="icon" type="text" formControlName="icon" maxlength="4" />
                  <span class="hint">
                    Optional label. The customer site picks its category icons from the
                    category name, so this is not shown there.
                  </span>
                </div>

                <div class="field">
                  <label for="description">Description</label>
                  <textarea id="description" formControlName="description" rows="2"></textarea>
                </div>

                <div class="field">
                  <label for="parentId">Parent category</label>
                  <select id="parentId" formControlName="parentId">
                    <option [ngValue]="null">None (top level)</option>
                    @for (category of categories(); track category.id) {
                      @if (category.id !== editingId()) {
                        <option [ngValue]="category.id">{{ category.name }}</option>
                      }
                    }
                  </select>
                </div>

                <div class="field">
                  <label for="status">Status</label>
                  <select id="status" formControlName="status">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <button type="submit" class="btn btn-block" [disabled]="saving()">
                  @if (saving()) {
                    <span class="spinner"></span> Saving…
                  } @else {
                    {{ editingId() ? 'Save category' : 'Add category' }}
                  }
                </button>
              </form>
            </div>
          </section>
        </aside>
      </div>

      <app-confirm
        [open]="pendingDelete() !== null"
        title="Delete this category?"
        message="Categories still used by offers cannot be deleted — deactivate them instead so existing offers keep working."
        confirmLabel="Delete category"
        (confirm)="confirmDelete()"
        (cancel)="pendingDelete.set(null)"
      />
    </div>
  `,
  styles: [
    `
      .cat-layout {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 320px);
        gap: 1.25rem;
        align-items: start;
      }

      tr.editing {
        background: var(--brand-light);
      }

      .actions-cell {
        display: flex;
        gap: 0.25rem;
        white-space: nowrap;
      }

      @media (max-width: 960px) {
        .cat-layout {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
  ],
})
export class CategoryManageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly pendingDelete = signal<Category | null>(null);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    icon: [''],
    description: [''],
    parentId: [null as number | null],
    status: ['active' as 'active' | 'inactive'],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    // status=all shows inactive categories too, which only managers can see.
    this.api.listCategories({ status: 'all' }).subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  parentName(parentId: number | null): string {
    if (!parentId) return '—';
    return this.categories().find((category) => category.id === parentId)?.name ?? '—';
  }

  error(control: string, label: string): string | null {
    return errorFor(this.form.get(control), label);
  }

  startEdit(category: Category): void {
    this.editingId.set(category.id);
    this.form.patchValue({
      name: category.name,
      icon: category.icon ?? '',
      description: category.description ?? '',
      parentId: category.parentId,
      status: category.status,
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ status: 'active' });
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
      icon: value.icon || null,
      description: value.description || null,
      parentId: value.parentId,
      status: value.status,
    };

    this.saving.set(true);
    const id = this.editingId();
    const request = id ? this.api.updateCategory(id, payload) : this.api.createCategory(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(id ? 'Category updated.' : 'Category added.');
        this.cancelEdit();
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(applyServerErrors(this.form, error));
      },
    });
  }

  confirmDelete(): void {
    const category = this.pendingDelete();
    if (!category) return;

    this.api.deleteCategory(category.id).subscribe({
      next: () => {
        this.categories.update((list) => list.filter((item) => item.id !== category.id));
        this.pendingDelete.set(null);
        this.toast.success('Category deleted.');
      },
      error: () => this.pendingDelete.set(null),
    });
  }
}
