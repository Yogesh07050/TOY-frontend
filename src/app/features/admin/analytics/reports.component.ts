import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { SubscriptionService } from '../../../core/subscription.service';
import { ToastService } from '../../../core/toast.service';
import { ReportType } from '../../../core/models';
import { PERMISSIONS } from '../../../core/permissions';
import {
  AnalyticsSectionComponent,
  UpgradePromptComponent,
} from '../../../shared/analytics-ui.components';
import { AnalyticsFilterBarComponent } from './analytics-filter-bar.component';
import { AnalyticsFiltersService } from './analytics-filters.service';

/**
 * §26 — report exports.
 *
 * The export is a Blob download rather than a link the browser follows, because
 * the request needs the Authorization header; a plain anchor would arrive
 * unauthenticated. The object URL is revoked straight after the click so the
 * downloaded file is not pinned in memory.
 */
@Component({
  selector: 'app-analytics-reports',
  standalone: true,
  imports: [
    CommonModule,
    AnalyticsFilterBarComponent,
    AnalyticsSectionComponent,
    UpgradePromptComponent,
  ],
  template: `
    <app-analytics-filter-bar
      [showBranch]="true"
      [showCategory]="true"
      [showCampaign]="true"
      [showLocation]="true"
    />

    @if (!canExport()) {
      <app-upgrade-prompt
        feature="ANALYTICS_EXPORT"
        heading="Analytics export"
        note="Premium merchants can export every dashboard as CSV or Excel."
      />
    } @else {
      <app-analytics-section
        heading="Reports"
        [subtitle]="'Exports use the filters above · ' + filters.presetLabel()"
        hint="A report contains exactly the figures the matching dashboard shows for the selected period."
      >
        @if (!types().length) {
          <p class="small subtle">Loading report types…</p>
        } @else {
          <ul class="reports">
            @for (type of types(); track type.key) {
              <li>
                <div>
                  <p class="name">{{ type.label }}</p>
                  <p class="small subtle">{{ type.description }}</p>
                </div>
                <div class="row actions">
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    [disabled]="busy() === type.key + ':csv'"
                    (click)="download(type, 'csv')"
                  >
                    {{ busy() === type.key + ':csv' ? 'Preparing…' : 'CSV' }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm"
                    [disabled]="busy() === type.key + ':xlsx'"
                    (click)="download(type, 'xlsx')"
                  >
                    {{ busy() === type.key + ':xlsx' ? 'Preparing…' : 'Excel' }}
                  </button>
                </div>
              </li>
            }
          </ul>
        }
      </app-analytics-section>

      @if (!auth.has(permissions.EXPORT_ANALYTICS)) {
        <p class="small subtle mt-2">
          Your plan includes exports, but your account does not hold the export permission.
          Ask a Super Admin to grant it.
        </p>
      }
    }
  `,
  styles: [
    `
      .reports {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .reports li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--border);
      }

      .reports li:last-child {
        border-bottom: none;
      }

      .name {
        margin: 0;
        font-weight: 640;
      }

      .reports p {
        margin: 0;
      }

      .actions {
        flex: none;
        gap: 0.4rem;
      }

      @media (max-width: 620px) {
        .reports li {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class AnalyticsReportsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly subscriptions = inject(SubscriptionService);

  readonly auth = inject(AuthService);
  readonly filters = inject(AnalyticsFiltersService);
  protected readonly permissions = PERMISSIONS;

  readonly types = signal<ReportType[]>([]);
  readonly busy = signal<string | null>(null);

  constructor() {
    this.filters.loadOptions();
    this.api.reportTypes().subscribe({
      next: (response) => this.types.set(response.types),
      error: () => undefined,
    });
  }

  canExport(): boolean {
    return this.subscriptions.has('ANALYTICS_EXPORT');
  }

  download(type: ReportType, format: 'csv' | 'xlsx'): void {
    const key = `${type.key}:${format}`;
    this.busy.set(key);

    this.api.exportReport(type.key, format, this.filters.query()).subscribe({
      next: (blob) => {
        this.save(blob, `${type.key}-${new Date().toISOString().slice(0, 10)}.${format}`);
        this.busy.set(null);
        this.toast.success(`${type.label} exported.`);
      },
      error: (error: HttpErrorResponse) => {
        this.busy.set(null);
        this.toast.error(this.messageFor(error));
      },
    });
  }

  private save(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    // The browser has already taken its copy by the time the click returns, so
    // the object URL can be released immediately.
    URL.revokeObjectURL(url);
  }

  /**
   * A failed export arrives as a Blob because the request asked for one, so the
   * JSON error inside it has to be read back out before it can be shown.
   */
  private messageFor(error: HttpErrorResponse): string {
    if (error.status === 403) return 'That export is not available on your current plan.';
    if (error.status === 401) return 'Your session expired. Sign in again to export.';
    return 'That report could not be exported. Try a narrower date range.';
  }
}
