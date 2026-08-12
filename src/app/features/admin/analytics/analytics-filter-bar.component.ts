import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../core/auth.service';
import { DATE_PRESETS, AnalyticsFiltersService } from './analytics-filters.service';

/**
 * The shared filter bar from §27: date presets, custom range, and the
 * shop/branch/category/campaign/location narrowing every dashboard accepts.
 *
 * Which selects appear is per dashboard - a location filter on the Branch
 * Performance page would be noise - so each is opted into rather than shown by
 * default.
 */
@Component({
  selector: 'app-analytics-filter-bar',
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
          @if (showShop() && (filters.shops().length > 1 || auth.isSuperAdmin)) {
            <label class="small muted">
              Shop
              <select [ngModel]="filters.shopId()" (ngModelChange)="filters.setShop($event)">
                <option [ngValue]="null">{{ auth.isSuperAdmin ? 'All shops' : 'All my shops' }}</option>
                @for (shop of filters.shops(); track shop.id) {
                  <option [ngValue]="shop.id">{{ shop.name }}</option>
                }
              </select>
            </label>
          }

          @if (showBranch() && filters.branches().length > 1) {
            <label class="small muted">
              Branch
              <select [ngModel]="filters.branchId()" (ngModelChange)="filters.branchId.set($event)">
                <option [ngValue]="null">All branches</option>
                @for (branch of filters.branches(); track branch.id) {
                  <option [ngValue]="branch.id">{{ branch.branchName }}</option>
                }
              </select>
            </label>
          }

          @if (showCategory()) {
            <label class="small muted">
              Category
              <select [ngModel]="filters.categoryId()" (ngModelChange)="filters.categoryId.set($event)">
                <option [ngValue]="null">All categories</option>
                @for (category of filters.categories(); track category.id) {
                  <option [ngValue]="category.id">{{ category.name }}</option>
                }
              </select>
            </label>
          }

          @if (showCampaign() && filters.campaigns().length) {
            <label class="small muted">
              Campaign
              <select [ngModel]="filters.campaignId()" (ngModelChange)="filters.campaignId.set($event)">
                <option [ngValue]="null">All campaigns</option>
                @for (campaign of filters.campaigns(); track campaign.id) {
                  <option [ngValue]="campaign.id">{{ campaign.name }}</option>
                }
              </select>
            </label>
          }

          @if (showLocation() && cities().length) {
            <label class="small muted">
              Location
              <select [ngModel]="filters.city()" (ngModelChange)="filters.city.set($event)">
                <option [ngValue]="null">All locations</option>
                @for (city of cities(); track city) {
                  <option [ngValue]="city">{{ city }}</option>
                }
              </select>
            </label>
          }

          @if (filters.hasNarrowing()) {
            <button type="button" class="btn btn-ghost btn-sm clear" (click)="filters.reset()">
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
        position: sticky;
        /* Sits under the app header so the range stays visible while a long
           table scrolls - which is the only reason it is sticky. */
        top: var(--header-height);
        z-index: 5;
        margin-bottom: 1rem;
      }

      .card-body {
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
        padding: 0.8rem 1rem;
      }

      .presets {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }

      .custom,
      .selects {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 0.7rem;
      }

      label {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }

      select,
      input[type='date'] {
        width: auto;
        min-width: 9rem;
      }

      .clear {
        margin-left: auto;
      }

      @media (max-width: 640px) {
        .filter-bar {
          position: static;
        }

        select,
        input[type='date'] {
          min-width: 0;
          width: 100%;
        }

        label {
          flex: 1 1 8rem;
        }
      }
    `,
  ],
})
export class AnalyticsFilterBarComponent {
  readonly filters = inject(AnalyticsFiltersService);
  readonly auth = inject(AuthService);

  protected readonly presets = DATE_PRESETS;

  readonly showShop = input(true);
  readonly showBranch = input(false);
  readonly showCategory = input(false);
  readonly showCampaign = input(false);
  readonly showLocation = input(false);

  /** Cities are derived from the loaded branches rather than fetched again. */
  readonly cities = computed(() => [
    ...new Set(
      this.filters
        .branches()
        .map((branch) => branch.city)
        .filter((city): city is string => Boolean(city)),
    ),
  ]);

  constructor() {
    this.filters.loadOptions();
  }
}
