import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ListingTypeFilter } from '../../../core/models';
import { BUSINESS_DATE_PRESETS, BusinessFiltersService } from './business-filters.service';

/**
 * The shared filter bar from §32.
 *
 * Which selects appear is per page rather than global: a listing-type filter on
 * the Revenue page would be noise, and a plan filter on the Customer page would
 * quietly change what DAU means without saying so. Each page opts in to the
 * ones that alter its numbers in a way a reader would expect.
 */
@Component({
  selector: 'app-business-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="filter-bar card">
      <div class="card-body">
        <div class="presets" role="group" aria-label="Date range">
          @for (option of presets; track option.value) {
            <button
              type="button"
              class="chip"
              [class.active]="filters.preset() === option.value"
              (click)="filters.setPreset(option.value)"
            >
              {{ option.label }}
            </button>
          }
        </div>

        @if (filters.preset() === 'custom') {
          <div class="custom">
            <label class="small muted">
              From
              <input type="date" [ngModel]="filters.from()" (ngModelChange)="filters.from.set($event)" />
            </label>
            <label class="small muted">
              To
              <input type="date" [ngModel]="filters.to()" (ngModelChange)="filters.to.set($event)" />
            </label>
            @if (!filters.from() || !filters.to()) {
              <span class="small subtle">Pick both dates to apply the range.</span>
            }
          </div>
        }

        <div class="selects">
          @if (showCity()) {
            <label class="small muted">
              City
              <select [ngModel]="filters.city()" (ngModelChange)="filters.setCity($event)">
                <option [ngValue]="null">All cities</option>
                @for (city of filters.options()?.cities ?? []; track city) {
                  <option [ngValue]="city">{{ city }}</option>
                }
              </select>
            </label>
          }

          @if (showArea() && (filters.options()?.areas?.length ?? 0) > 0) {
            <label class="small muted">
              Area
              <select [ngModel]="filters.area()" (ngModelChange)="filters.area.set($event)">
                <option [ngValue]="null">All areas</option>
                @for (area of filters.options()?.areas ?? []; track area) {
                  <option [ngValue]="area">{{ area }}</option>
                }
              </select>
            </label>
          }

          @if (showCategory()) {
            <label class="small muted">
              Category
              <select [ngModel]="filters.categoryId()" (ngModelChange)="filters.categoryId.set($event)">
                <option [ngValue]="null">All categories</option>
                @for (category of filters.options()?.categories ?? []; track category.id) {
                  <option [ngValue]="category.id">{{ category.name }}</option>
                }
              </select>
            </label>
          }

          @if (showPlan()) {
            <label class="small muted">
              Plan
              <select [ngModel]="filters.plan()" (ngModelChange)="filters.plan.set($event)">
                <option [ngValue]="null">All plans</option>
                @for (plan of filters.options()?.plans ?? []; track plan.key) {
                  <option [ngValue]="plan.key">{{ plan.name }}</option>
                }
              </select>
            </label>
          }

          @if (showListingType()) {
            <label class="small muted">
              Listing type
              <select
                [ngModel]="filters.listingType()"
                (ngModelChange)="filters.listingType.set($event)"
              >
                @for (type of listingTypes; track type.key) {
                  <option [ngValue]="type.key">{{ type.label }}</option>
                }
              </select>
            </label>
          }

          @if (showMerchant()) {
            <label class="small muted">
              Merchant
              <select [ngModel]="filters.shopId()" (ngModelChange)="filters.shopId.set($event)">
                <option [ngValue]="null">All merchants</option>
                @for (shop of filters.options()?.shops ?? []; track shop.id) {
                  <option [ngValue]="shop.id">{{ shop.name }}</option>
                }
              </select>
            </label>
          }

          @if (showChannel() && (filters.options()?.acquisitionChannels?.length ?? 0) > 0) {
            <label class="small muted">
              Acquisition channel
              <select
                [ngModel]="filters.acquisitionChannel()"
                (ngModelChange)="filters.acquisitionChannel.set($event)"
              >
                <option [ngValue]="null">All channels</option>
                @for (channel of filters.options()?.acquisitionChannels ?? []; track channel) {
                  <option [ngValue]="channel">{{ channel }}</option>
                }
              </select>
            </label>
          }

          @if (filters.hasNarrowing()) {
            <button type="button" class="btn btn-secondary btn-sm" (click)="filters.reset()">
              Clear filters
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .filter-bar {
        margin-bottom: 1rem;
      }

      .card-body {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        padding: 0.75rem 0.9rem;
      }

      .presets {
        display: flex;
        gap: 0.3rem;
        flex-wrap: wrap;
      }

      .chip {
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text-muted);
        border-radius: 999px;
        padding: 0.28rem 0.7rem;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        transition:
          background var(--fast) var(--ease),
          color var(--fast) var(--ease),
          border-color var(--fast) var(--ease);
      }

      .chip:hover {
        background: var(--surface-alt);
        color: var(--text);
      }

      .chip.active {
        background: var(--brand);
        border-color: var(--brand);
        color: #fff;
      }

      .custom,
      .selects {
        display: flex;
        gap: 0.7rem;
        flex-wrap: wrap;
        align-items: flex-end;
      }

      label {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      select,
      input[type='date'] {
        min-width: 9rem;
      }
    `,
  ],
})
export class BusinessFilterBarComponent {
  readonly filters = inject(BusinessFiltersService);

  readonly presets = BUSINESS_DATE_PRESETS;
  readonly listingTypes: { key: ListingTypeFilter; label: string }[] = [
    { key: 'all', label: 'Offers & services' },
    { key: 'offer', label: 'Offers' },
    { key: 'service', label: 'Services' },
  ];

  readonly showCity = input(true);
  readonly showArea = input(false);
  readonly showCategory = input(true);
  readonly showPlan = input(false);
  readonly showListingType = input(false);
  readonly showMerchant = input(false);
  readonly showChannel = input(false);
}
