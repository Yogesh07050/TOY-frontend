import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { AuditLog, PageMeta } from '../../core/models';
import { EmptyStateComponent, PaginationComponent } from '../../shared/ui.components';

/** Audit trail viewer (§28). */
@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, EmptyStateComponent],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Audit logs</h1>
          <p class="subtitle">
            @if (meta()) {
              {{ meta()!.total }} recorded action{{ meta()!.total === 1 ? '' : 's' }}
            } @else {
              Every administrative action, with who did it and when.
            }
          </p>
        </div>
      </div>

      <div class="card mb-2">
        <div class="card-body row">
          <select [(ngModel)]="action" (change)="reload()" aria-label="Filter by action">
            <option value="">All actions</option>
            @for (option of filters().actions; track option) {
              <option [value]="option">{{ humanise(option) }}</option>
            }
          </select>

          <select [(ngModel)]="entityType" (change)="reload()" aria-label="Filter by entity">
            <option value="">All entity types</option>
            @for (option of filters().entityTypes; track option) {
              <option [value]="option">{{ humanise(option) }}</option>
            }
          </select>

          <label class="small muted">
            From
            <input type="date" [(ngModel)]="from" (change)="reload()" />
          </label>
          <label class="small muted">
            To
            <input type="date" [(ngModel)]="to" (change)="reload()" />
          </label>

          @if (action || entityType || from || to) {
            <button type="button" class="btn btn-ghost btn-sm" (click)="clear()">Clear</button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="skeleton" style="height: 320px"></div>
      } @else if (logs().length === 0) {
        <app-empty-state icon="receipt-outline" title="No entries" message="Nothing matches these filters." />
      } @else {
        <div class="card">
          <div class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Change</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                @for (log of logs(); track log.id) {
                  <tr>
                    <td class="small nowrap">{{ log.createdAt | date: 'd MMM y, HH:mm' }}</td>
                    <td class="small">
                      @if (log.user) {
                        <strong>{{ log.user.name }}</strong><br />
                        <span class="muted">{{ log.user.email }}</span>
                      } @else {
                        <span class="muted">System</span>
                      }
                    </td>
                    <td><span class="badge badge-brand">{{ humanise(log.action) }}</span></td>
                    <td class="small">
                      {{ humanise(log.entityType) }}
                      @if (log.entityId) {
                        <span class="muted">#{{ log.entityId }}</span>
                      }
                    </td>
                    <td class="small change-cell">
                      @if (expanded() === log.id) {
                        @if (log.oldValue) {
                          <div><span class="muted">Before:</span> <code>{{ preview(log.oldValue, true) }}</code></div>
                        }
                        @if (log.newValue) {
                          <div><span class="muted">After:</span> <code>{{ preview(log.newValue, true) }}</code></div>
                        }
                        <button type="button" class="btn btn-ghost btn-sm" (click)="expanded.set(null)">Less</button>
                      } @else {
                        <code class="truncate">{{ preview(log.newValue ?? log.oldValue, false) }}</code>
                        @if (log.oldValue || log.newValue) {
                          <button type="button" class="btn btn-ghost btn-sm" (click)="expanded.set(log.id)">More</button>
                        }
                      }
                    </td>
                    <td class="small muted">{{ log.ipAddress || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <app-pagination [meta]="meta()" (pageChange)="goToPage($event)" />
      }
    </div>
  `,
  styles: [
    `
      .card-body select,
      .card-body input[type='date'] {
        width: auto;
        min-width: 140px;
      }

      .change-cell {
        max-width: 320px;
      }

      .change-cell code {
        display: block;
        font-size: 0.76rem;
        color: var(--text-muted);
        word-break: break-word;
      }
    `,
  ],
})
export class AuditLogComponent {
  private readonly api = inject(ApiService);

  readonly logs = signal<AuditLog[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly expanded = signal<number | null>(null);
  readonly filters = signal<{ actions: string[]; entityTypes: string[] }>({
    actions: [],
    entityTypes: [],
  });

  action = '';
  entityType = '';
  from = '';
  to = '';
  page = 1;

  constructor() {
    this.api.auditFilters().subscribe({
      next: (filters) => this.filters.set(filters),
      error: () => undefined,
    });
    this.load();
  }

  reload(): void {
    this.page = 1;
    this.load();
  }

  clear(): void {
    this.action = '';
    this.entityType = '';
    this.from = '';
    this.to = '';
    this.reload();
  }

  goToPage(page: number): void {
    this.page = page;
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api
      .listAuditLogs({
        page: this.page,
        limit: 25,
        action: this.action || undefined,
        entityType: this.entityType || undefined,
        from: this.from || undefined,
        // Include the whole "to" day rather than stopping at midnight.
        to: this.to ? `${this.to}T23:59:59` : undefined,
      })
      .subscribe({
        next: (result) => {
          this.logs.set(result.items);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: () => {
          this.logs.set([]);
          this.loading.set(false);
        },
      });
  }

  humanise(value: string): string {
    return value.toLowerCase().replace(/_/g, ' ').replace(/^./, (char) => char.toUpperCase());
  }

  preview(value: unknown, full: boolean): string {
    if (value === null || value === undefined) return '—';
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return full || text.length <= 90 ? text : `${text.slice(0, 90)}…`;
  }
}
