import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import { ApiService } from '../../../core/api.service';
import { FailingEndpoint, HealthStatus, PlatformHealth } from '../../../core/models';
import {
  AnalyticsEmptyComponent,
  AnalyticsSectionComponent,
  AnalyticsSkeletonComponent,
} from '../../../shared/analytics-ui.components';
import { ErrorStateComponent } from '../../../shared/state.components';
import { IconComponent } from '../../../shared/icon.component';
import { IconName } from '../../../shared/icons';

interface HealthPage {
  health: PlatformHealth;
  incidents: { windowMinutes: number; endpoints: FailingEndpoint[] };
}

/**
 * §34 and §55 — the dependency board, plus the failing endpoints behind it.
 *
 * This is the one screen in the application allowed to name a component, quote
 * a failure count or show an endpoint path. §55 is explicit that these details
 * go to authorised administrators and nobody else, which is why the data comes
 * from a Super Admin-only endpoint rather than from the public `/health` probe
 * a load balancer uses.
 */
@Component({
  selector: 'app-platform-health',
  standalone: true,
  imports: [
    CommonModule,
    AnalyticsEmptyComponent,
    AnalyticsSectionComponent,
    AnalyticsSkeletonComponent,
    ErrorStateComponent,
    IconComponent,
  ],
  template: `
    @if (loading()) {
      <app-analytics-skeleton [count]="0" [chartHeight]="320" />
    } @else if (failure(); as problem) {
      <app-error-state
        [offline]="problem.offline"
        [message]="problem.message"
        [reference]="problem.requestId"
        (retry)="load()"
      />
    } @else if (page(); as view) {
      <div class="overall card mb-2" [class]="view.health.overall">
        <app-icon [name]="glyphFor(view.health.overall)" [size]="22" />
        <div>
          <strong>{{ overallLabel() }}</strong>
          <span class="small subtle">Checked {{ checkedAt() }}</span>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" (click)="load()">
          <app-icon name="refresh-outline" [size]="15" /> Re-check
        </button>
      </div>

      <app-analytics-section heading="Dependencies" subtitle="Live status of every component">
        <ul class="components">
          @for (component of view.health.components; track component.key) {
            <li>
              <app-icon class="glyph" [class]="component.status" [name]="glyphFor(component.status)" [size]="18" />
              <div class="body">
                <strong>{{ component.label }}</strong>
                <span class="small subtle">{{ component.detail }}</span>
              </div>
              <span class="badge" [class]="component.status">{{ statusLabel(component.status) }}</span>
            </li>
          }
        </ul>
      </app-analytics-section>

      <!-- §56: the failure log, which is the detail withheld from users. -->
      <app-analytics-section
        heading="Recent failures"
        [subtitle]="'Endpoints failing in the last ' + view.incidents.windowMinutes + ' minutes'"
      >
        @if (view.incidents.endpoints.length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Endpoint</th>
                  <th scope="col">Dependency</th>
                  <th scope="col" class="right">Failures</th>
                  <th scope="col" class="right">Last seen</th>
                </tr>
              </thead>
              <tbody>
                @for (row of view.incidents.endpoints; track row.endpoint + row.method) {
                  <tr>
                    <th scope="row">
                      <code>{{ row.method }} {{ row.endpoint }}</code>
                    </th>
                    <td>{{ row.dependency }}</td>
                    <td class="right">{{ row.failures }}</td>
                    <td class="right">{{ time(row.lastSeen) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <app-analytics-empty
            icon="checkmark-circle-outline"
            title="No failures recorded."
            message="Nothing has thrown a server error in this window."
          />
        }
      </app-analytics-section>
    }
  `,
  styles: [
    `
      .overall {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.9rem 1.1rem;
        border-left: 4px solid var(--success);
      }

      .overall.degraded {
        border-left-color: var(--warning);
      }

      .overall.down {
        border-left-color: var(--danger);
      }

      .overall > div {
        display: flex;
        flex-direction: column;
        flex: 1;
      }

      .components {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
      }

      .components li {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        padding: 0.65rem 0;
        border-bottom: 1px solid var(--border);
      }

      .components li:last-child {
        border-bottom: none;
      }

      .body {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
      }

      /* Status is carried by the glyph, its colour and the text badge, so it
         survives both themes and colour-blind reading. */
      .glyph {
        flex: none;
      }

      .glyph.healthy {
        color: var(--success);
      }

      .glyph.degraded {
        color: var(--warning);
      }

      .glyph.down {
        color: var(--danger);
      }

      .glyph.not_configured {
        color: var(--text-muted);
        opacity: 0.6;
      }

      .badge {
        flex: none;
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .badge.healthy {
        background: var(--success-bg);
        color: var(--success);
      }

      .badge.degraded {
        background: var(--warning-bg);
        color: var(--warning);
      }

      .badge.down {
        background: var(--danger-bg, var(--warning-bg));
        color: var(--danger);
      }

      table {
        width: 100%;
      }

      th {
        text-align: left;
      }

      thead th {
        font-size: 0.76rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: var(--text-muted);
      }

      .right {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }

      code {
        font-size: 0.85em;
      }
    `,
  ],
})
export class PlatformHealthComponent implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly page = signal<HealthPage | null>(null);
  readonly loading = signal(true);
  readonly failure = signal<{ message: string; requestId: string | null; offline: boolean } | null>(
    null,
  );

  /**
   * Thirty seconds. Faster than the shell's alert poll because this is the
   * screen someone stares at during an incident, waiting for a component to
   * come back - and every probe here is cheap.
   */
  private readonly poll = setInterval(() => this.load(true), 30_000);

  constructor() {
    this.load();
  }

  ngOnDestroy(): void {
    clearInterval(this.poll);
  }

  /** `quiet` refreshes in place, so a poll does not blank the page every 30s. */
  load(quiet = false): void {
    if (!quiet) this.loading.set(true);
    this.failure.set(null);

    forkJoin({
      health: this.api.platformHealth(),
      incidents: this.api.platformIncidents(60),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.page.set(result);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          const body = error.error?.error;
          this.failure.set({
            offline: error.status === 0,
            message:
              error.status === 0
                ? 'You’re offline, so the platform’s status can’t be checked from here.'
                : (body?.message ?? 'The health check itself could not be reached.'),
            requestId: body?.requestId ?? null,
          });
          this.loading.set(false);
        },
      });
  }

  readonly overallLabel = computed(
    () =>
      ({
        healthy: 'All systems healthy',
        degraded: 'Some components degraded',
        down: 'One or more components are down',
        not_configured: 'Status unknown',
      })[this.page()?.health.overall ?? 'healthy'],
  );

  readonly checkedAt = computed(() => {
    const at = this.page()?.health.checkedAt;
    return at ? new Date(at).toLocaleTimeString('en-IN') : '—';
  });

  glyphFor(status: HealthStatus): IconName {
    return {
      healthy: 'checkmark-circle-outline',
      degraded: 'warning-outline',
      down: 'alert-circle-outline',
      not_configured: 'ellipse-outline',
    }[status] as IconName;
  }

  statusLabel(status: HealthStatus): string {
    return { healthy: 'Healthy', degraded: 'Degraded', down: 'Down', not_configured: 'Off' }[status];
  }

  time(value: string): string {
    return new Date(value).toLocaleTimeString('en-IN');
  }
}
