import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { PageMeta, Review } from '../../core/models';
import { ConfirmComponent, EmptyStateComponent, PaginationComponent, StarsComponent } from '../../shared/ui.components';

/** Review moderation queue (§26). */
@Component({
  selector: 'app-review-manage',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    StarsComponent,
    PaginationComponent,
    EmptyStateComponent,
    ConfirmComponent,
  ],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Reviews</h1>
          <p class="subtitle">Approve, reject or remove customer reviews.</p>
        </div>
        <div class="row">
          @for (tab of tabs; track tab.value) {
            <button type="button" class="chip" [class.active]="status === tab.value" (click)="setStatus(tab.value)">
              {{ tab.label }}
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="skeleton" style="height: 260px"></div>
      } @else if (reviews().length === 0) {
        <app-empty-state icon="star-outline" title="Nothing to moderate" message="No reviews match this filter." />
      } @else {
        <div class="stack">
          @for (review of reviews(); track review.id) {
            <article class="card">
              <div class="card-body">
                <div class="row mb-1">
                  <strong>{{ review.user.name }}</strong>
                  <app-stars [value]="review.rating" />
                  <span class="spacer"></span>
                  <span
                    class="badge"
                    [class.badge-success]="review.status === 'approved'"
                    [class.badge-warning]="review.status === 'pending'"
                    [class.badge-danger]="review.status === 'rejected'"
                  >
                    {{ review.status }}
                  </span>
                  <span class="small subtle">{{ review.createdAt | date: 'd MMM y' }}</span>
                </div>

                @if (review.comment) {
                  <p class="mb-1">{{ review.comment }}</p>
                } @else {
                  <p class="small muted mb-1">Rating only, no comment.</p>
                }

                <p class="small muted mb-2">
                  @if (review.offerId) {
                    On <a [routerLink]="['/offers', review.offerId]">{{ review.offerTitle }}</a>
                  }
                  @if (review.shopName) {
                    · {{ review.shopName }}
                  }
                </p>

                <div class="row">
                  @if (review.status !== 'approved') {
                    <button type="button" class="btn btn-sm" (click)="moderate(review, 'approved')">Approve</button>
                  }
                  @if (review.status !== 'rejected') {
                    <button type="button" class="btn btn-secondary btn-sm" (click)="moderate(review, 'rejected')">
                      Reject
                    </button>
                  }
                  <button type="button" class="btn btn-ghost btn-sm" (click)="pendingDelete.set(review)">
                    Delete
                  </button>
                </div>
              </div>
            </article>
          }
        </div>

        <app-pagination [meta]="meta()" (pageChange)="goToPage($event)" />
      }

      <app-confirm
        [open]="pendingDelete() !== null"
        title="Delete this review?"
        message="The review is removed permanently and the shop's rating is recalculated."
        confirmLabel="Delete review"
        (confirm)="confirmDelete()"
        (cancel)="pendingDelete.set(null)"
      />
    </div>
  `,
})
export class ReviewManageComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly tabs = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  readonly reviews = signal<Review[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly pendingDelete = signal<Review | null>(null);

  status = 'all';
  page = 1;

  constructor() {
    this.load();
  }

  setStatus(status: string): void {
    this.status = status;
    this.page = 1;
    this.load();
  }

  goToPage(page: number): void {
    this.page = page;
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.listReviews({ page: this.page, limit: 20, status: this.status }).subscribe({
      next: (result) => {
        this.reviews.set(result.items);
        this.meta.set(result.meta);
        this.loading.set(false);
      },
      error: () => {
        this.reviews.set([]);
        this.loading.set(false);
      },
    });
  }

  moderate(review: Review, status: 'approved' | 'rejected'): void {
    this.api.moderateReview(review.id, { status }).subscribe({
      next: (updated) => {
        this.reviews.update((list) =>
          list.map((item) => (item.id === updated.id ? { ...item, status: updated.status } : item)),
        );
        this.toast.success(`Review ${status}.`);
      },
    });
  }

  confirmDelete(): void {
    const review = this.pendingDelete();
    if (!review) return;

    this.api.deleteReview(review.id).subscribe({
      next: () => {
        this.reviews.update((list) => list.filter((item) => item.id !== review.id));
        this.pendingDelete.set(null);
        this.toast.success('Review deleted.');
      },
      error: () => this.pendingDelete.set(null),
    });
  }
}
