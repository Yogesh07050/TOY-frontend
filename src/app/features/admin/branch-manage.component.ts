import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Branch, LocationSource, Shop } from '../../core/models';
import { applyServerErrors, errorFor } from '../auth/auth-shell';
import { IconComponent } from '../../shared/icon.component';
import { MapPickerComponent, PickedLocation } from '../../shared/map-picker.component';
import { ConfirmComponent, EmptyStateComponent } from '../../shared/ui.components';

/** Branch management for one shop (§17). */
@Component({
  selector: 'app-branch-manage',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    EmptyStateComponent,
    ConfirmComponent,
    IconComponent,
    MapPickerComponent,
  ],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Branches</h1>
          <p class="subtitle">
            {{ shop()?.name || 'Shop' }} — add locations so customers can find offers near them.
          </p>
        </div>
        <a routerLink="/admin/shops" class="btn btn-ghost">← Back to shops</a>
      </div>

      <div class="branch-layout">
        <div>
          @if (loading()) {
            <div class="skeleton" style="height: 240px"></div>
          } @else if (branches().length === 0) {
            <app-empty-state
              icon="location-outline"
              title="No branches yet"
              message="Add the first location using the form."
            />
          } @else {
            <div class="card">
              <div class="table-wrap">
                <table class="data">
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>City</th>
                      <th>Coordinates</th>
                      <th>Offers</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (branch of branches(); track branch.id) {
                      <tr [class.editing]="editingId() === branch.id">
                        <td>
                          <strong>{{ branch.branchName }}</strong>
                          @if (branch.isPrimary) {
                            <span class="badge badge-brand">Main</span>
                          }
                          <br />
                          <span class="small muted">{{ branch.address || 'No address' }}</span>
                        </td>
                        <td class="small">
                          {{ branch.city }}
                          @if (branch.pincode) {
                            <br /><span class="muted">{{ branch.pincode }}</span>
                          }
                        </td>
                        <td class="small muted">
                          @if (branch.latitude !== null) {
                            {{ branch.latitude }},<br />{{ branch.longitude }}
                          } @else {
                            <span class="badge badge-warning">No coordinates</span>
                          }
                        </td>
                        <td>{{ branch.offerCount ?? 0 }}</td>
                        <td>
                          <span
                            class="badge"
                            [class.badge-success]="branch.status === 'active'"
                            [class.badge-danger]="branch.status !== 'active'"
                          >
                            {{ branch.status }}
                          </span>
                        </td>
                        <td>
                          <div class="actions-cell">
                            <button type="button" class="btn btn-secondary btn-sm" (click)="startEdit(branch)">
                              Edit
                            </button>
                            @if (branch.status === 'active') {
                              <button type="button" class="btn btn-ghost btn-sm" (click)="pendingDeactivate.set(branch)">
                                Deactivate
                              </button>
                            }
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

        <!-- Add / edit form -->
        <aside>
          <section class="card">
            <div class="card-header">
              <h3>{{ editingId() ? 'Edit branch' : 'Add a branch' }}</h3>
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
                  <label for="branchName">Branch name *</label>
                  <input id="branchName" type="text" formControlName="branchName" [class.invalid]="error('branchName', 'Branch name')" />
                  @if (error('branchName', 'Branch name'); as message) {
                    <span class="error-text">{{ message }}</span>
                  }
                </div>

                <div class="field">
                  <label for="address">Address</label>
                  <textarea id="address" formControlName="address" rows="2"></textarea>
                </div>

                <div class="field">
                  <label for="addressLine2">Address line 2</label>
                  <input id="addressLine2" type="text" formControlName="addressLine2" />
                </div>

                <div class="field">
                  <label for="area">Area / locality</label>
                  <input id="area" type="text" formControlName="area" placeholder="e.g. RS Puram" />
                </div>

                <div class="form-grid">
                  <div class="field">
                    <label for="city">City *</label>
                    <input id="city" type="text" formControlName="city" [class.invalid]="error('city', 'City')" />
                    @if (error('city', 'City'); as message) {
                      <span class="error-text">{{ message }}</span>
                    }
                  </div>

                  <div class="field">
                    <label for="state">State</label>
                    <input id="state" type="text" formControlName="state" />
                  </div>

                  <div class="field">
                    <label for="country">Country</label>
                    <input id="country" type="text" formControlName="country" />
                  </div>

                  <div class="field">
                    <label for="pincode">Pincode</label>
                    <input id="pincode" type="text" formControlName="pincode" />
                  </div>

                </div>

                <!--
                  §13: branches get the same map flow as the shop itself. A
                  chain's second location is no easier to find by latitude than
                  its first, and offers attached to it inherit these exact
                  coordinates for "near me" (§12, §20).
                -->
                <div class="field">
                  <label>Location on the map</label>
                  <app-map-picker
                    [latitude]="form.controls.latitude.value"
                    [longitude]="form.controls.longitude.value"
                    [addressHint]="addressHint()"
                    (picked)="onLocationPicked($event)"
                  />
                  @if (form.controls.latitude.value !== null) {
                    <p class="confirmed">
                      <app-icon name="checkmark-circle-outline" [size]="15" />
                      {{ form.controls.latitude.value }}, {{ form.controls.longitude.value }}
                    </p>
                  } @else {
                    <span class="hint">
                      Leave this alone and the coordinates are worked out from the address on save.
                      Confirm a pin here to override that.
                    </span>
                  }
                </div>

                <div class="field">
                  <label for="contactNumber">Contact number</label>
                  <input id="contactNumber" type="tel" formControlName="contactNumber" />
                </div>

                <div class="field">
                  <label for="status">Status</label>
                  <select id="status" formControlName="status">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <label class="checkbox mb-2">
                  <input type="checkbox" formControlName="isPrimary" />
                  <span>This is the main branch</span>
                </label>

                <button type="submit" class="btn btn-block" [disabled]="saving()">
                  @if (saving()) {
                    <span class="spinner"></span> Saving…
                  } @else {
                    {{ editingId() ? 'Save branch' : 'Add branch' }}
                  }
                </button>
              </form>
            </div>
          </section>
        </aside>
      </div>

      <app-confirm
        [open]="pendingDeactivate() !== null"
        title="Deactivate this branch?"
        message="The branch stops appearing in search and on offer pages. Existing offers keep their history, and you can reactivate it later."
        confirmLabel="Deactivate"
        (confirm)="confirmDeactivate()"
        (cancel)="pendingDeactivate.set(null)"
      />
    </div>
  `,
  styles: [
    `
      .branch-layout {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 340px);
        gap: 1.25rem;
        align-items: start;
      }

      tr.editing {
        background: var(--brand-light);
      }

      .confirmed {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        margin: 0.4rem 0 0;
        font-size: 0.85rem;
        font-variant-numeric: tabular-nums;
        color: var(--success, var(--brand));
      }

      .link-button {
        background: none;
        border: 0;
        padding: 0;
        color: var(--brand);
        font: inherit;
        cursor: pointer;
        text-decoration: underline;
      }

      .actions-cell {
        display: flex;
        gap: 0.25rem;
        white-space: nowrap;
      }

      @media (max-width: 960px) {
        .branch-layout {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `,
  ],
})
export class BranchManageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly shopId = Number(this.route.snapshot.paramMap.get('id'));
  readonly shop = signal<Shop | null>(null);
  readonly branches = signal<Branch[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly pendingDeactivate = signal<Branch | null>(null);
  readonly formError = signal<string | null>(null);
  readonly addressHint = signal('');

  /** Where the pin in the form came from, so §24 can record it. */
  private locationSource: LocationSource = 'MANUAL';
  private locationAccuracy: number | null = null;
  private placeId: string | null = null;
  private locationConfirmed = false;

  readonly form = this.fb.nonNullable.group({
    branchName: ['', [Validators.required, Validators.minLength(2)]],
    address: [''],
    addressLine2: [''],
    area: [''],
    city: ['', [Validators.required]],
    state: [''],
    country: ['India'],
    pincode: [''],
    latitude: [null as number | null],
    longitude: [null as number | null],
    contactNumber: [''],
    isPrimary: [false],
    status: ['active' as 'active' | 'inactive'],
  });

  constructor() {
    this.api.getShop(this.shopId).subscribe({
      next: (shop) => this.shop.set(shop),
      error: () => undefined,
    });
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.listBranches(this.shopId).subscribe({
      next: (branches) => {
        this.branches.set(branches);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  error(control: string, label: string): string | null {
    return errorFor(this.form.get(control), label);
  }

  startEdit(branch: Branch): void {
    this.editingId.set(branch.id);
    this.form.patchValue({
      branchName: branch.branchName,
      address: branch.address ?? '',
      addressLine2: branch.addressLine2 ?? '',
      area: branch.area ?? '',
      city: branch.city ?? '',
      state: branch.state ?? '',
      country: branch.country ?? 'India',
      pincode: branch.pincode ?? '',
      latitude: branch.latitude,
      longitude: branch.longitude,
      contactNumber: branch.contactNumber ?? '',
      isPrimary: branch.isPrimary,
      status: branch.status,
    });
    this.locationSource = branch.locationSource ?? 'MANUAL';
    this.locationAccuracy = branch.locationAccuracy;
    this.placeId = branch.placeId;
    this.locationConfirmed = branch.latitude !== null;
    this.addressHint.set(
      branch.latitude === null
        ? [branch.address, branch.area, branch.city, branch.state, branch.pincode]
            .filter(Boolean)
            .join(', ')
        : '',
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ country: 'India', status: 'active', isPrimary: false });
    this.locationSource = 'MANUAL';
    this.locationAccuracy = null;
    this.placeId = null;
    this.locationConfirmed = false;
    this.addressHint.set('');
  }

  /** §8, §10: the pin the merchant confirmed wins over anything geocoded. */
  onLocationPicked(location: PickedLocation): void {
    this.locationSource = location.source;
    this.locationAccuracy = location.accuracy;
    this.placeId = location.placeId;
    this.locationConfirmed = true;

    const patch: Record<string, unknown> = {
      latitude: location.latitude,
      longitude: location.longitude,
    };
    const fill = (control: 'address' | 'area' | 'city' | 'state' | 'country' | 'pincode', value: string | null) => {
      if (value && !this.form.controls[control].value.trim()) patch[control] = value;
    };
    fill('address', location.address?.addressLine1 ?? null);
    fill('area', location.address?.area ?? null);
    fill('city', location.address?.city ?? null);
    fill('state', location.address?.state ?? null);
    fill('country', location.address?.country ?? null);
    fill('pincode', location.address?.pincode ?? null);

    this.form.patchValue(patch);
    this.toast.success('Location confirmed.');
  }

  save(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      ...this.form.getRawValue(),
      locationSource: this.form.controls.latitude.value === null ? null : this.locationSource,
      locationAccuracy: this.locationAccuracy,
      placeId: this.placeId,
      locationConfirmed: this.locationConfirmed,
    } as unknown as Partial<Branch>;
    this.saving.set(true);

    const id = this.editingId();
    const request = id
      ? this.api.updateBranch(this.shopId, id, payload)
      : this.api.createBranch(this.shopId, payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(id ? 'Branch updated.' : 'Branch added.');
        this.cancelEdit();
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.formError.set(applyServerErrors(this.form, error));
      },
    });
  }

  confirmDeactivate(): void {
    const branch = this.pendingDeactivate();
    if (!branch) return;

    this.api.deactivateBranch(this.shopId, branch.id).subscribe({
      next: () => {
        this.pendingDeactivate.set(null);
        this.toast.success('Branch deactivated.');
        this.load();
      },
      error: () => this.pendingDeactivate.set(null),
    });
  }
}
