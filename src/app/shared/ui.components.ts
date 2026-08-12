import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ToastService } from '../core/toast.service';
import { PageMeta } from '../core/models';

/** Toast stack rendered once, at the app shell level. */
@Component({
  selector: 'app-toasts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack" role="status" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div class="toast" [class]="'toast-' + toast.kind">
          <span class="glyph" aria-hidden="true">{{ glyphFor(toast.kind) }}</span>
          <span class="message">{{ toast.message }}</span>
          <button type="button" (click)="toasts.dismiss(toast.id)" aria-label="Dismiss">×</button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-stack {
        position: fixed;
        right: 1rem;
        bottom: 1rem;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 0.55rem;
        max-width: min(390px, calc(100vw - 2rem));
        pointer-events: none;
      }

      .toast {
        display: flex;
        align-items: flex-start;
        gap: 0.7rem;
        padding: 0.75rem 0.9rem;
        border-radius: var(--radius);
        box-shadow: var(--shadow-lg);
        background: var(--surface);
        border: 1px solid var(--border);
        border-left: 4px solid var(--info);
        font-size: 0.9rem;
        pointer-events: auto;
        animation: toast-in 340ms var(--ease-spring);
      }

      .toast-success {
        border-left-color: var(--success);
      }
      .toast-error {
        border-left-color: var(--danger);
      }

      .toast .glyph {
        font-size: 1rem;
        line-height: 1.35;
        flex-shrink: 0;
      }

      .toast .message {
        flex: 1;
        min-width: 0;
      }

      .toast button {
        background: none;
        border: none;
        font-size: 1.15rem;
        line-height: 1;
        cursor: pointer;
        color: var(--text-subtle);
        padding: 0;
        border-radius: 4px;
        transition: color var(--fast) var(--ease), transform var(--fast) var(--ease);
      }

      .toast button:hover {
        color: var(--text);
        transform: scale(1.15);
      }

      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translateX(28px) scale(0.94);
        }
      }
    `,
  ],
})
export class ToastsComponent {
  readonly toasts = inject(ToastService);

  glyphFor(kind: 'success' | 'error' | 'info'): string {
    return { success: '✓', error: '⚠', info: 'ℹ' }[kind];
  }
}

/** Empty state with an optional call to action. */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state">
      <span class="emoji" aria-hidden="true">{{ emoji }}</span>
      <h3>{{ title }}</h3>
      @if (message) {
        <p>{{ message }}</p>
      }
      <ng-content></ng-content>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() emoji = '🔍';
  @Input({ required: true }) title!: string;
  @Input() message = '';
}

/** Card-shaped loading placeholders. */
@Component({
  selector: 'app-card-skeletons',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cards stagger" aria-hidden="true">
      @for (item of placeholders; track item) {
        <div class="card">
          <div class="skeleton" style="aspect-ratio: 4/3; border-radius: 0"></div>
          <div class="card-body">
            <div class="skeleton" style="height: 10px; width: 40%; margin-bottom: 10px"></div>
            <div class="skeleton" style="height: 16px; width: 85%; margin-bottom: 8px"></div>
            <div class="skeleton" style="height: 12px; width: 60%"></div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CardSkeletonsComponent {
  @Input() set count(value: number) {
    this.placeholders = Array.from({ length: value }, (_, index) => index);
  }
  placeholders = Array.from({ length: 8 }, (_, index) => index);
}

/** Pagination control shared by every list screen. */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (meta && meta.totalPages > 1) {
      <nav class="pagination" aria-label="Pagination">
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          [disabled]="meta.page <= 1"
          (click)="go(meta.page - 1)"
        >
          ‹ Previous
        </button>

        <span class="pages">
          @for (page of visiblePages(); track page) {
            @if (page === -1) {
              <span class="ellipsis">…</span>
            } @else {
              <button
                type="button"
                class="page"
                [class.current]="page === meta.page"
                [attr.aria-current]="page === meta.page ? 'page' : null"
                (click)="go(page)"
              >
                {{ page }}
              </button>
            }
          }
        </span>

        <button
          type="button"
          class="btn btn-secondary btn-sm"
          [disabled]="!meta.hasNext"
          (click)="go(meta.page + 1)"
        >
          Next ›
        </button>
      </nav>

      <p class="center small muted mt-1">
        Showing {{ (meta.page - 1) * meta.limit + 1 }}–{{ min(meta.page * meta.limit, meta.total) }}
        of {{ meta.total }}
      </p>
    }
  `,
  styles: [
    `
      .pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        margin-top: 1.5rem;
        flex-wrap: wrap;
      }

      .pages {
        display: flex;
        gap: 0.25rem;
        align-items: center;
      }

      .page {
        min-width: 36px;
        height: 36px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
        background: var(--surface);
        cursor: pointer;
        font: inherit;
        font-size: 0.85rem;
        color: var(--text);
        transition:
          border-color var(--fast) var(--ease),
          background var(--fast) var(--ease),
          color var(--fast) var(--ease),
          transform var(--fast) var(--ease-spring);
      }

      .page:hover {
        border-color: var(--brand);
        color: var(--brand-strong);
        transform: translateY(-1px);
      }

      .page:active {
        transform: scale(0.94);
      }

      .page.current {
        background: var(--gradient-brand);
        border-color: transparent;
        color: var(--brand-ink);
        font-weight: 680;
        box-shadow: var(--shadow-brand);
      }

      .ellipsis {
        color: var(--text-subtle);
        padding: 0 0.15rem;
      }

      @media (max-width: 520px) {
        .pages {
          display: none;
        }
      }
    `,
  ],
})
export class PaginationComponent {
  @Input() meta: PageMeta | null = null;
  @Output() pageChange = new EventEmitter<number>();

  min = Math.min;

  go(page: number): void {
    if (!this.meta || page < 1 || page > this.meta.totalPages || page === this.meta.page) return;
    this.pageChange.emit(page);
  }

  /** Windowed page numbers; -1 renders an ellipsis. */
  visiblePages(): number[] {
    if (!this.meta) return [];
    const { page, totalPages } = this.meta;
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

    const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
    const sorted = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);

    const result: number[] = [];
    let previous = 0;
    for (const value of sorted) {
      if (previous && value - previous > 1) result.push(-1);
      result.push(value);
      previous = value;
    }
    return result;
  }
}

/** Read-only or interactive 1–5 star display (§26). */
@Component({
  selector: 'app-stars',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="stars" [class.interactive]="interactive">
      @for (star of [1, 2, 3, 4, 5]; track star) {
        <button
          type="button"
          [disabled]="!interactive"
          [class.filled]="star <= (hover || value)"
          (click)="pick(star)"
          (mouseenter)="interactive && (hover = star)"
          (mouseleave)="hover = 0"
          [attr.aria-label]="star + ' star' + (star === 1 ? '' : 's')"
        >
          ★
        </button>
      }
      @if (count !== null) {
        <span class="count muted small">({{ count }})</span>
      }
    </span>
  `,
  styles: [
    `
      .stars {
        display: inline-flex;
        align-items: center;
        gap: 0.05rem;
      }

      button {
        background: none;
        border: none;
        padding: 0 1px;
        font-size: 1.05rem;
        color: var(--border-strong);
        cursor: default;
        line-height: 1;
        transition: color var(--fast) var(--ease), transform var(--fast) var(--ease-spring);
      }

      .interactive button {
        cursor: pointer;
        font-size: 1.55rem;
      }

      .interactive button:hover {
        transform: scale(1.2);
      }

      .interactive button:active {
        transform: scale(0.9);
      }

      button.filled {
        color: #f59e0b;
      }

      .count {
        margin-left: 0.3rem;
      }
    `,
  ],
})
export class StarsComponent {
  @Input() value = 0;
  @Input() count: number | null = null;
  @Input() interactive = false;
  @Output() valueChange = new EventEmitter<number>();

  hover = 0;

  pick(star: number): void {
    if (!this.interactive) return;
    this.value = star;
    this.valueChange.emit(star);
  }
}

/** Confirmation dialog used before destructive actions. */
@Component({
  selector: 'app-confirm',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="backdrop" (click)="cancel.emit()">
        <div class="dialog card" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="card-body">
            <h3>{{ title }}</h3>
            <p class="muted">{{ message }}</p>
            <div class="row" style="justify-content: flex-end; margin-top: 1rem">
              <button type="button" class="btn btn-secondary" (click)="cancel.emit()">Cancel</button>
              <button type="button" class="btn" [class.btn-danger]="danger" (click)="confirm.emit()">
                {{ confirmLabel }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(20, 22, 31, 0.5);
        display: grid;
        place-items: center;
        z-index: 900;
        padding: 1rem;
        animation: fade-in var(--fast) var(--ease);
      }

      @supports (backdrop-filter: blur(4px)) {
        .backdrop {
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }
      }

      .dialog {
        max-width: 420px;
        width: 100%;
        box-shadow: var(--shadow-lg);
        animation: dialog-in 300ms var(--ease-spring);
      }

      @keyframes dialog-in {
        from {
          opacity: 0;
          transform: scale(0.92) translateY(16px);
        }
      }
    `,
  ],
})
export class ConfirmComponent {
  @Input() open = false;
  @Input() title = 'Are you sure?';
  @Input() message = 'This action cannot be undone.';
  @Input() confirmLabel = 'Confirm';
  @Input() danger = true;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
