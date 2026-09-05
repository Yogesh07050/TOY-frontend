import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { ToastService } from '../../../core/toast.service';
import { PERMISSIONS } from '../../../core/permissions';
import {
  Category,
  FeaturedSlot,
  ListingPromotability,
  MerchantSlotOptions,
  Offer,
  Shop,
  VisibilityListingType,
} from '../../../core/models';

interface Selectable {
  listingType: VisibilityListingType;
  listingId: number;
  title: string;
  endDate: string | null;
  /** §9's verdict, fetched when the merchant picks it. */
  eligibility?: ListingPromotability;
}

/**
 * Merchant → Create or edit a Featured campaign (§8, §9).
 *
 * §8's example is the whole brief: a name, a window with a start and an end, a
 * target, and the offers being promoted. The system activates and deactivates
 * it on schedule; the merchant does not press "go live".
 *
 * ## Eligibility is checked while the merchant is still here
 *
 * §9's conditions are checked twice by the API — on write, and again on every
 * read. This screen calls the write-time half as soon as an offer is picked, so
 * "this offer has no image" arrives while the merchant is looking at the offer
 * they chose, rather than as a rejected submit or, worse, as silence on the
 * home page a week later.
 *
 * ## Why it always saves as awaiting review
 *
 * §22 gives Super Admin campaign approval. Editing the schedule, targeting or
 * listings of an already-approved campaign changes what was approved, so the
 * API sends it back to the queue — and the form says so before the merchant
 * saves, because a campaign silently leaving the home page mid-run is the kind
 * of surprise that generates a phone call.
 */
@Component({
  selector: 'app-featured-campaign-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="container page narrow">
      <div class="page-header">
        <div>
          <h1>{{ isEdit() ? 'Edit campaign' : 'New featured campaign' }}</h1>
          <p class="subtitle">
            Promote your offers in one of the app's featured spaces, on a schedule.
          </p>
        </div>
        <a class="btn btn-ghost btn-sm" routerLink="/admin/featured-campaigns">Back</a>
      </div>

      <!-- Above the plan gate on purpose. Whoever lands here may manage several
           shops, and the first one alphabetically is not necessarily the one
           with Featured access - a picker hidden behind the gate leaves them
           looking at an upgrade prompt for a shop they did not choose, with no
           way to switch. -->
      @if (shops().length > 1 && !isEdit()) {
        <div class="row gap mb-2">
          <label class="small subtle" for="shopPicker">Shop</label>
          <select
            id="shopPicker"
            [value]="form.controls.shopId.value"
            (change)="pickShop(+$any($event.target).value)"
          >
            @for (shop of shops(); track shop.id) {
              <option [value]="shop.id">{{ shop.name }}</option>
            }
          </select>
        </div>
      }

      @if (loading()) {
        <div class="skeleton" style="height: 380px"></div>
      } @else if (options() && !options()!.featuredAccess) {
        <section class="card">
          <div class="card-body">
            <p class="strong">Featured placements are not on your current plan.</p>
            <p class="small subtle">{{ options()!.promise.explanation }}</p>
            <a class="btn btn-secondary btn-sm" routerLink="/admin/subscription">See plans</a>
          </div>
        </section>
      } @else {
        <form [formGroup]="form" (ngSubmit)="save()">
          <section class="card mb-2">
            <div class="card-header"><h2>Campaign</h2></div>
            <div class="card-body">
              <div class="field">
                <label for="name">Campaign name</label>
                <input id="name" type="text" formControlName="name" placeholder="Diwali Collection" />
                @if (invalid('name')) {
                  <span class="hint error">Give the campaign a name of at least two characters.</span>
                }
              </div>

              <div class="field">
                <label for="description">Promotional message</label>
                <input
                  id="description"
                  type="text"
                  formControlName="description"
                  placeholder="DIWALI SPECIAL — Shop Now"
                />
                <span class="hint">Shown on the promotional card, above your offer.</span>
              </div>

              @if (!isEdit()) {
                <div class="field">
                  <label for="slotId">Placement</label>
                  <select id="slotId" formControlName="slotId">
                    <option [ngValue]="null">Choose a space…</option>
                    @for (slot of eligibleSlots(); track slot.id) {
                      <option [ngValue]="slot.id">{{ slot.name }} — {{ slot.description }}</option>
                    }
                  </select>
                  @if (ineligibleSlots().length) {
                    <span class="hint">
                      {{ ineligibleSlots().length }} more
                      {{ ineligibleSlots().length === 1 ? 'space needs' : 'spaces need' }} a higher
                      visibility level.
                    </span>
                  }
                  @if (invalid('slotId')) {
                    <span class="hint error">Choose where this campaign should appear.</span>
                  }
                </div>
              }
            </div>
          </section>

          <section class="card mb-2">
            <div class="card-header">
              <h2>Schedule</h2>
              <p class="small subtle">The campaign starts and stops on its own.</p>
            </div>
            <div class="card-body two-up">
              <div class="field">
                <label for="startAt">Starts</label>
                <input id="startAt" type="datetime-local" formControlName="startAt" />
              </div>
              <div class="field">
                <label for="endAt">Ends</label>
                <input id="endAt" type="datetime-local" formControlName="endAt" />
                @if (form.errors?.['window']) {
                  <span class="hint error">The end must be after the start.</span>
                }
              </div>
            </div>
          </section>

          <section class="card mb-2">
            <div class="card-header">
              <h2>Who sees it</h2>
              <p class="small subtle">
                All optional. Leave these empty and the campaign is eligible wherever its space
                appears.
              </p>
            </div>
            <div class="card-body two-up">
              <div class="field">
                <label for="targetCategoryId">Category</label>
                <select id="targetCategoryId" formControlName="targetCategoryId">
                  <option [ngValue]="null">Any category</option>
                  @for (category of categories(); track category.id) {
                    <option [ngValue]="category.id">{{ category.name }}</option>
                  }
                </select>
              </div>
              <div class="field">
                <label for="targetCity">City</label>
                <input id="targetCity" type="text" formControlName="targetCity" placeholder="Any city" />
              </div>
              <div class="field">
                <label for="targetRadiusKm">Within (km)</label>
                <input
                  id="targetRadiusKm"
                  type="number"
                  min="0.1"
                  max="500"
                  formControlName="targetRadiusKm"
                  placeholder="Any distance"
                />
              </div>
            </div>
          </section>

          <section class="card mb-2">
            <div class="card-header">
              <h2>What to promote</h2>
              <p class="small subtle">
                Pick the offers this campaign promotes. It rotates between them.
              </p>
            </div>
            <div class="card-body">
              @if (!available().length) {
                <p class="small subtle">
                  This shop has no active offers to promote yet.
                  <a routerLink="/admin/offers/new">Post one first.</a>
                </p>
              } @else {
                <ul class="picker">
                  @for (item of available(); track item.listingId) {
                    <li>
                      <label class="check">
                        <input
                          type="checkbox"
                          [checked]="isSelected(item)"
                          (change)="toggle(item)"
                          [attr.aria-label]="'Promote ' + item.title"
                        />
                        <span>
                          <span class="strong">{{ item.title }}</span>
                          @if (item.endDate) {
                            <span class="small subtle"> · ends {{ item.endDate | date: 'mediumDate' }}</span>
                          }
                        </span>
                      </label>

                      <!-- §9, while there is still time to act on it. -->
                      @if (isSelected(item) && item.eligibility && !item.eligibility.eligible) {
                        <ul class="reasons small">
                          @for (reason of item.eligibility.reasons; track reason) {
                            <li>{{ reason }}</li>
                          }
                        </ul>
                      }
                    </li>
                  }
                </ul>
              }

              @if (submitted() && !selected().length) {
                <p class="hint error">Choose at least one offer to promote.</p>
              }
            </div>
          </section>

          @if (isEdit() && willRequeue()) {
            <p class="small notice mb-2">
              Changing the schedule, targeting or offers sends this campaign back for review, and it
              stops showing until it is approved again.
            </p>
          }

          <div class="actions">
            <button type="submit" class="btn" [disabled]="saving()">
              {{ isEdit() ? 'Save changes' : 'Submit for review' }}
            </button>
            <a class="btn btn-ghost" routerLink="/admin/featured-campaigns">Cancel</a>
          </div>

          @if (!isEdit()) {
            <p class="small subtle mt-1">
              New campaigns are reviewed before they go live. You will see the status on the campaign
              list.
            </p>
          }
        </form>
      }
    </div>
  `,
  styles: [
    `
      .narrow {
        max-width: 52rem;
      }

      .row.gap {
        display: flex;
        gap: 0.6rem;
        align-items: center;
        flex-wrap: wrap;
      }

      .two-up {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
        gap: 0.9rem;
      }

      .picker {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.55rem;
      }

      .check {
        display: flex;
        gap: 0.55rem;
        align-items: baseline;
      }

      .reasons {
        margin: 0.3rem 0 0 1.6rem;
        padding-left: 1rem;
        color: var(--danger, #b3261e);
      }

      .hint.error {
        color: var(--danger, #b3261e);
      }

      .notice {
        padding: 0.6rem 0.8rem;
        border-radius: var(--radius-sm);
        background: color-mix(in srgb, var(--warning, #d98324) 12%, transparent);
      }

      .actions {
        display: flex;
        gap: 0.6rem;
        flex-wrap: wrap;
      }

      .mt-1 {
        margin-top: 0.6rem;
      }
    `,
  ],
})
export class FeaturedCampaignFormComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly campaignId = signal<number | null>(null);
  readonly isEdit = computed(() => this.campaignId() !== null);
  readonly shops = signal<Shop[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly options = signal<MerchantSlotOptions | null>(null);
  readonly available = signal<Selectable[]>([]);
  readonly selected = signal<Selectable[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  /** Whether the merchant has changed which listings the campaign promotes. */
  private readonly listingsChanged = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      shopId: [0, [Validators.required]],
      slotId: [null as number | null, [Validators.required]],
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
      description: [''],
      targetCategoryId: [null as number | null],
      targetCity: [''],
      targetRadiusKm: [null as number | null],
      startAt: ['', [Validators.required]],
      endAt: ['', [Validators.required]],
    },
    { validators: [windowValidator] },
  );

  /** Only the spaces this shop's visibility level actually reaches (§9). */
  readonly eligibleSlots = computed(() => (this.options()?.slots ?? []).filter((slot) => slot.eligible));
  readonly ineligibleSlots = computed(() =>
    (this.options()?.slots ?? []).filter((slot: FeaturedSlot) => !slot.eligible),
  );

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.campaignId.set(Number(id));

    this.api.listCategories({ limit: 100 }).subscribe({
      next: (rows) => this.categories.set(rows),
      error: () => undefined,
    });

    this.api
      .listShops(
        this.auth.isSuperAdmin
          ? { limit: 100, status: 'all', sort: 'name' }
          : { mine: true, limit: 100, status: 'all', sort: 'name' },
      )
      .subscribe({
        next: (page) => {
          const allowed = page.items.filter((shop) =>
            this.auth.hasForShop(shop.id, PERMISSIONS.MANAGE_FEATURED_CAMPAIGNS),
          );
          const shops = allowed.length ? allowed : page.items;
          this.shops.set(shops);

          if (this.isEdit()) {
            this.loadCampaign();
            return;
          }
          if (shops.length) {
            this.form.patchValue({ shopId: shops[0].id });
            this.onShopChange();
          }
          this.applyDefaultWindow();
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });

    // Any change to the things approval was granted for puts the campaign back
    // in the queue, so the warning appears as the merchant edits rather than
    // as a surprise after they save.
    this.form.valueChanges.subscribe(() => this.scheduleOrTargetingChanged.set(this.isEdit() && this.materialFieldDirty()));
  }

  /** The fields the API treats as changing what was approved. */
  private materialFieldDirty(): boolean {
    return ['startAt', 'endAt', 'targetCategoryId', 'targetCity', 'targetRadiusKm'].some(
      (name) => this.form.get(name)?.dirty ?? false,
    );
  }

  private readonly scheduleOrTargetingChanged = signal(false);

  readonly willRequeue = computed(
    () => this.isEdit() && (this.scheduleOrTargetingChanged() || this.listingsChanged()),
  );

  private applyDefaultWindow(): void {
    const start = new Date();
    const end = new Date(Date.now() + 7 * 86400000);
    this.form.patchValue({ startAt: toLocalInput(start), endAt: toLocalInput(end) });
  }

  private loadCampaign(): void {
    const id = this.campaignId()!;
    this.api.getFeaturedCampaign(id).subscribe({
      next: (campaign) => {
        this.form.patchValue({
          shopId: campaign.shopId,
          slotId: campaign.slotId,
          name: campaign.name,
          description: campaign.description ?? '',
          targetCategoryId: campaign.target.categoryId,
          targetCity: campaign.target.city ?? '',
          targetRadiusKm: campaign.target.radiusKm,
          startAt: toLocalInput(new Date(campaign.startAt)),
          endAt: toLocalInput(new Date(campaign.endAt)),
        });
        this.loadShopContext(campaign.shopId, campaign.placements ?? []);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('That campaign could not be loaded.');
      },
    });
  }

  pickShop(shopId: number): void {
    if (!shopId) return;
    this.form.patchValue({ shopId });
    this.onShopChange();
  }

  onShopChange(): void {
    const shopId = Number(this.form.controls.shopId.value);
    if (!shopId) return;
    // A different shop has different offers and different eligible spaces, so
    // nothing from the previous one survives the switch.
    this.selected.set([]);
    this.available.set([]);
    this.listingsChanged.set(false);
    this.form.patchValue({ slotId: null });
    this.loadShopContext(shopId, []);
  }

  private loadShopContext(
    shopId: number,
    preselected: { listingType: VisibilityListingType; listingId: number }[],
  ): void {
    this.api.merchantSlots(shopId).subscribe({
      next: (options) => this.options.set(options),
      error: () => this.options.set(null),
    });

    this.api.listOffers({ shopId, status: 'active', limit: 100 } as never).subscribe({
      next: (page) => {
        const items: Selectable[] = page.items.map((offer: Offer) => ({
          listingType: 'offer' as const,
          listingId: offer.id,
          title: offer.title,
          endDate: offer.endDate ?? null,
        }));
        this.available.set(items);

        const chosen = items.filter((item) =>
          preselected.some(
            (row) => row.listingType === item.listingType && row.listingId === item.listingId,
          ),
        );
        this.selected.set(chosen);
        this.listingsChanged.set(false);
        for (const item of chosen) this.checkEligibility(item);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  isSelected(item: Selectable): boolean {
    return this.selected().some(
      (row) => row.listingType === item.listingType && row.listingId === item.listingId,
    );
  }

  toggle(item: Selectable): void {
    if (this.isSelected(item)) {
      this.selected.update((rows) =>
        rows.filter(
          (row) => !(row.listingType === item.listingType && row.listingId === item.listingId),
        ),
      );
    } else {
      this.selected.update((rows) => [...rows, item]);
      this.checkEligibility(item);
    }
    this.listingsChanged.set(true);
  }

  /** §9's write-time check, run the moment an offer is picked. */
  private checkEligibility(item: Selectable): void {
    this.api.listingPromotability(item.listingType, item.listingId).subscribe({
      next: (eligibility) => {
        const attach = (rows: Selectable[]) =>
          rows.map((row) =>
            row.listingType === item.listingType && row.listingId === item.listingId
              ? { ...row, eligibility }
              : row,
          );
        this.available.update(attach);
        this.selected.update(attach);
      },
      error: () => undefined,
    });
  }

  invalid(name: string): boolean {
    const control = this.form.get(name);
    return Boolean(control && control.invalid && (control.touched || this.submitted()));
  }

  save(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.selected().length) {
      this.toast.error('Check the highlighted fields.');
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      shopId: Number(value.shopId),
      slotId: Number(value.slotId),
      name: value.name.trim(),
      description: value.description?.trim() || null,
      targetCategoryId: value.targetCategoryId ?? null,
      targetCity: value.targetCity?.trim() || null,
      targetRadiusKm: value.targetRadiusKm ?? null,
      startAt: new Date(value.startAt).toISOString(),
      endAt: new Date(value.endAt).toISOString(),
      listings: this.selected().map((item) => ({
        listingType: item.listingType,
        listingId: item.listingId,
      })),
    };

    this.saving.set(true);
    const request = this.isEdit()
      ? this.api.updateFeaturedCampaign(this.campaignId()!, payload)
      : this.api.createFeaturedCampaign(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(
          this.isEdit() ? 'Campaign saved.' : 'Campaign submitted for review.',
        );
        void this.router.navigate(['/admin/featured-campaigns']);
      },
      error: () => this.saving.set(false),
    });
  }
}

/** `datetime-local` wants local wall-clock without a zone suffix. */
function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The one cross-field rule: a campaign cannot end before it starts. */
function windowValidator(group: import('@angular/forms').AbstractControl) {
  const start = group.get('startAt')?.value;
  const end = group.get('endAt')?.value;
  if (!start || !end) return null;
  return new Date(end) > new Date(start) ? null : { window: true };
}
