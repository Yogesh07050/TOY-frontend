import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Service, ServiceOffer, ServiceOfferPayload, ServiceOfferStatus } from '../../core/models';
import { applyServerErrors, errorFor } from '../auth/auth-shell';
import { ConfirmComponent, EmptyStateComponent } from '../../shared/ui.components';

/**
 * Offers on a service (§5, §6, §16). One component, inline table + a toggled
 * add/edit side panel — a service's offers are low-cardinality, so this reads
 * better as a master-detail page than a separate list/form route split.
 */
@Component({
  selector: 'app-service-offer-manage',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, EmptyStateComponent, ConfirmComponent],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Offers on {{ service()?.name || 'this service' }}</h1>
          <p class="subtitle">Attach promotional offers to this service — one service can carry many over time.</p>
        </div>
        <a [routerLink]="['/admin/services']" class="btn btn-ghost">← Back to services</a>
      </div>

      <div class="offer-layout">
        <div>
          @if (loading()) {
            <div class="skeleton" style="height: 260px"></div>
          } @else if (offers().length === 0) {
            <app-empty-state icon="flame-outline" title="No offers yet" message="Add the first promotional offer for this service." />
          } @else {
            <div class="card">
              <div class="table-wrap">
                <table class="data">
                  <thead>
                    <tr>
                      <th>Offer</th>
                      <th>Discount</th>
                      <th>Validity</th>
                      <th>Status</th>
                      <th>Views</th>
                      <th>Claims</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (offer of offers(); track offer.id) {
                      <tr [class.editing]="editingId() === offer.id">
                        <td>{{ offer.offerText || '—' }}</td>
                        <td>{{ discountLabel(offer) }}</td>
                        <td class="small">
                          {{ formatDate(offer.startDate) }} – {{ formatDate(offer.endDate) }}
                        </td>
                        <td><span [class]="statusClass(offer.status)">{{ offer.status }}</span></td>
                        <td>{{ offer.viewCount }}</td>
                        <td>{{ offer.claimCount }}</td>
                        <td>
                          <div class="actions-cell">
                            <button type="button" class="btn btn-secondary btn-sm" (click)="startEdit(offer)">Edit</button>
                            @for (option of nextStatuses(offer); track option.value) {
                              <button type="button" class="btn btn-ghost btn-sm" (click)="changeStatus(offer, option.value)">
                                {{ option.label }}
                              </button>
                            }
                            <button type="button" class="btn btn-ghost btn-sm" (click)="pendingDelete.set(offer)">
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
              <h3>{{ editingId() ? 'Edit offer' : 'Add an offer' }}</h3>
              @if (editingId()) {
                <button type="button" class="btn btn-ghost btn-sm" (click)="cancelEdit()">Cancel</button>
              }
            </div>
            <div class="card-body">
              <form [formGroup]="form" (ngSubmit)="save('active')" novalidate>
                @if (formError()) {
                  <div class="error-text mb-2">{{ formError() }}</div>
                }

                <div class="field">
                  <label for="offerText">Headline *</label>
                  <input id="offerText" type="text" formControlName="offerText" placeholder="e.g. 20% OFF Haircut" />
                </div>

                <div class="field">
                  <label for="offerType">Offer type</label>
                  <select id="offerType" formControlName="offerType">
                    <option value="percentage">Percentage discount</option>
                    <option value="flat">Flat discount</option>
                    <option value="price_drop">Price drop</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div class="field">
                  <label for="discountType">Discount type</label>
                  <select id="discountType" formControlName="discountType">
                    <option value="percentage">Percentage</option>
                    <option value="flat">Flat amount</option>
                    <option value="none">None</option>
                  </select>
                </div>

                @if (form.controls.discountType.value !== 'none') {
                  <div class="field">
                    <label for="discountValue">Discount value *</label>
                    <input id="discountValue" type="number" min="0" step="0.01" formControlName="discountValue" />
                  </div>
                }

                <div class="field">
                  <label for="originalPrice">Original price (₹)</label>
                  <input id="originalPrice" type="number" min="0" step="0.01" formControlName="originalPrice" />
                </div>

                <div class="field">
                  <label for="offerPrice">Offer price (₹)</label>
                  <input id="offerPrice" type="number" min="0" step="0.01" formControlName="offerPrice" />
                  @if (error('offerPrice', 'Offer price'); as message) {
                    <span class="error-text">{{ message }}</span>
                  }
                </div>

                <div class="field">
                  <label for="startDate">Starts *</label>
                  <input id="startDate" type="datetime-local" formControlName="startDate" [class.invalid]="error('startDate', 'Start date')" />
                  @if (error('startDate', 'Start date'); as message) {
                    <span class="error-text">{{ message }}</span>
                  }
                </div>

                <div class="field">
                  <label for="endDate">Ends *</label>
                  <input id="endDate" type="datetime-local" formControlName="endDate" [class.invalid]="error('endDate', 'End date')" />
                  @if (error('endDate', 'End date'); as message) {
                    <span class="error-text">{{ message }}</span>
                  }
                </div>

                <label class="checkbox">
                  <input type="checkbox" formControlName="isRecurring" />
                  <span>This offer recurs</span>
                </label>

                @if (form.controls.isRecurring.value) {
                  <div class="field mt-1">
                    <label for="recurrenceType">Recurrence</label>
                    <select id="recurrenceType" formControlName="recurrenceType">
                      <option value="">Choose a frequency</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                }

                <div class="field">
                  <label for="termsConditions">Terms</label>
                  <textarea id="termsConditions" formControlName="termsConditions" rows="2"></textarea>
                </div>

                <div class="stack" style="gap: 0.5rem">
                  <button type="submit" class="btn btn-block" [disabled]="saving()">
                    @if (saving()) {
                      <span class="spinner"></span> Saving…
                    } @else {
                      {{ editingId() ? 'Save and publish' : 'Publish offer' }}
                    }
                  </button>
                  <button type="button" class="btn btn-secondary btn-block" [disabled]="saving()" (click)="save('scheduled')">
                    Schedule
                  </button>
                  <button type="button" class="btn btn-ghost btn-block" [disabled]="saving()" (click)="save('draft')">
                    Save as draft
                  </button>
                </div>
              </form>
            </div>
          </section>
        </aside>
      </div>

      <app-confirm
        [open]="pendingDelete() !== null"
        title="Delete this offer?"
        message="This permanently removes the offer. Consider deactivating it instead."
        confirmLabel="Delete offer"
        (confirm)="confirmDelete()"
        (cancel)="pendingDelete.set(null)"
      />
    </div>
  `,
  styles: [
    `
      .offer-layout {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 340px);
        gap: 1.25rem;
        align-items: start;
      }

      tr.editing {
        background: var(--brand-light);
      }

      .actions-cell {
        display: flex;
        gap: 0.25rem;
        flex-wrap: wrap;
        white-space: nowrap;
      }

      @media (max-width: 960px) {
        .offer-layout {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
  ],
})
export class ServiceOfferManageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  private readonly serviceId = Number(this.route.snapshot.paramMap.get('id'));

  readonly service = signal<Service | null>(null);
  readonly offers = signal<ServiceOffer[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly pendingDelete = signal<ServiceOffer | null>(null);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    offerText: [''],
    offerType: ['percentage' as 'percentage' | 'flat' | 'price_drop' | 'other'],
    discountType: ['percentage' as 'percentage' | 'flat' | 'none'],
    discountValue: [null as number | null],
    originalPrice: [null as number | null],
    offerPrice: [null as number | null],
    termsConditions: [''],
    isRecurring: [false],
    recurrenceType: [''],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
    // Claim rules, the same four a product offer carries. The defaults give an
    // untouched service offer one code per customer, used once.
    claimLimitPerCustomer: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
    totalClaimLimit: [null as number | null, [Validators.min(1)]],
    claimValidityHours: [null as number | null, [Validators.min(1), Validators.max(8760)]],
    maxRedemptionsPerClaim: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
  });

  constructor() {
    this.api.getService(this.serviceId).subscribe((service) => this.service.set(service));
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.listServiceOffers(this.serviceId, { manage: true, status: 'all', limit: 100 }).subscribe({
      next: (result) => {
        this.offers.set(result.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  error(control: string, label: string): string | null {
    return errorFor(this.form.get(control), label);
  }

  startEdit(offer: ServiceOffer): void {
    this.editingId.set(offer.id);
    this.form.patchValue({
      offerText: offer.offerText ?? '',
      offerType: offer.offerType,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      originalPrice: offer.originalPrice,
      offerPrice: offer.offerPrice,
      termsConditions: offer.termsConditions ?? '',
      isRecurring: offer.isRecurring,
      recurrenceType: offer.recurrenceType ?? '',
      startDate: this.toLocalInput(new Date(offer.startDate)),
      endDate: this.toLocalInput(new Date(offer.endDate)),
      claimLimitPerCustomer: offer.claimLimitPerCustomer ?? 1,
      totalClaimLimit: offer.totalClaimLimit,
      claimValidityHours: offer.claimValidityHours,
      maxRedemptionsPerClaim: offer.maxRedemptionsPerClaim ?? 1,
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ offerType: 'percentage', discountType: 'percentage', isRecurring: false });
  }

  save(status: 'draft' | 'scheduled' | 'active'): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Some required fields still need attention.');
      return;
    }

    const value = this.form.getRawValue();
    const payload: ServiceOfferPayload = {
      claimLimitPerCustomer: value.claimLimitPerCustomer ?? 1,
      totalClaimLimit: value.totalClaimLimit,
      claimValidityHours: value.claimValidityHours,
      maxRedemptionsPerClaim: value.maxRedemptionsPerClaim ?? 1,
      offerText: value.offerText || null,
      offerType: value.offerType,
      discountType: value.discountType,
      discountValue: value.discountType === 'none' ? null : value.discountValue,
      originalPrice: value.originalPrice,
      offerPrice: value.offerPrice,
      termsConditions: value.termsConditions || null,
      isRecurring: value.isRecurring,
      recurrenceType: value.isRecurring ? value.recurrenceType || null : null,
      startDate: new Date(value.startDate).toISOString(),
      endDate: new Date(value.endDate).toISOString(),
      status,
    };

    this.saving.set(true);
    const id = this.editingId();
    const request = id
      ? this.api.updateServiceOffer(this.serviceId, id, payload)
      : this.api.createServiceOffer(this.serviceId, payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(id ? 'Offer updated.' : `Offer created and saved as ${status}.`);
        this.cancelEdit();
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(applyServerErrors(this.form, error));
      },
    });
  }

  nextStatuses(offer: ServiceOffer): { value: ServiceOfferStatus; label: string }[] {
    const options: Record<ServiceOfferStatus, { value: ServiceOfferStatus; label: string }[]> = {
      draft: [
        { value: 'active', label: 'Publish' },
        { value: 'scheduled', label: 'Schedule' },
      ],
      scheduled: [
        { value: 'active', label: 'Publish now' },
        { value: 'deactivated', label: 'Deactivate' },
      ],
      active: [{ value: 'deactivated', label: 'Deactivate' }],
      expired: [{ value: 'active', label: 'Republish' }],
      deactivated: [{ value: 'active', label: 'Reactivate' }],
    };
    return options[offer.status] ?? [];
  }

  changeStatus(offer: ServiceOffer, status: ServiceOfferStatus): void {
    this.api.setServiceOfferStatus(this.serviceId, offer.id, status).subscribe({
      next: (updated) => {
        this.offers.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
        this.toast.success(`Offer is now ${updated.status}.`);
      },
    });
  }

  confirmDelete(): void {
    const offer = this.pendingDelete();
    if (!offer) return;

    this.api.deleteServiceOffer(this.serviceId, offer.id).subscribe({
      next: () => {
        this.offers.update((list) => list.filter((item) => item.id !== offer.id));
        this.pendingDelete.set(null);
        this.toast.success('Offer deleted.');
      },
      error: () => this.pendingDelete.set(null),
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'badge badge-success';
      case 'scheduled':
        return 'badge badge-info';
      case 'expired':
        return 'badge badge-warning';
      case 'deactivated':
        return 'badge badge-danger';
      default:
        return 'badge';
    }
  }

  discountLabel(offer: ServiceOffer): string {
    if (offer.discountType === 'percentage' && offer.discountValue) return `${offer.discountValue}% OFF`;
    if (offer.discountType === 'flat' && offer.discountValue) return `₹${offer.discountValue} OFF`;
    return '—';
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
  }

  private toLocalInput(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
  }
}
