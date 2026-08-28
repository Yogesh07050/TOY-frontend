import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';

import { NetworkStatusService } from '../core/network-status.service';
import { IconComponent } from './icon.component';
import { IconName } from './icons';

/**
 * The application states §52 asks every screen to have: Loading, Success,
 * Empty, Offline, Error, Retry.
 *
 * Loading, Success and Empty already had homes (`app-card-skeletons`,
 * `app-empty-state`). What was missing is the pair that only appear when
 * something has gone wrong - and those are exactly the ones a codebase ends up
 * improvising differently on every screen, which is how "HTTP 503" reaches a
 * customer (§53).
 *
 * These are deliberately plain components rather than a service that throws up
 * a modal. §37 asks that "unaffected screens should remain usable": a failure
 * in one panel should replace that panel, not the page around it.
 */

// ---------------------------------------------------------------------------
// Error state with retry (§37, §52, §53, §54)
// ---------------------------------------------------------------------------

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="failure" [class.offline]="offline()" role="alert">
      <app-icon class="glyph" [name]="glyph()" [size]="26" />
      <p class="title">{{ title() }}</p>
      <p class="small subtle">{{ message() }}</p>

      <!-- §54: what survived is worth saying out loud. A merchant who thinks
           an upload failure lost their whole form will not press Retry. -->
      @if (preserved()) {
        <p class="small subtle preserved">{{ preserved() }}</p>
      }

      <div class="actions">
        @if (retryable()) {
          <button type="button" class="btn btn-secondary btn-sm" (click)="retry.emit()">
            <app-icon name="refresh-outline" [size]="15" /> {{ retryLabel() }}
          </button>
        }
        <ng-content />
      </div>

      <!-- §57. Shown only when the server actually issued one, and worded as
           something to quote rather than something to understand. -->
      @if (reference()) {
        <p class="small subtle reference">
          Reference: <code>{{ reference() }}</code>
        </p>
      }
    </div>
  `,
  styles: [
    `
      .failure {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        text-align: center;
        padding: 2rem 1rem;
        min-height: 160px;
        border: 1px dashed var(--border);
        border-radius: var(--radius);
        background: var(--surface);
      }

      /* Tone through a border and the glyph rather than a colour wash, so both
         themes stay legible and the state is not colour-only. */
      .failure:not(.offline) .glyph {
        color: var(--danger);
      }

      .failure.offline {
        border-style: solid;
      }

      .failure.offline .glyph {
        color: var(--warning);
      }

      .title {
        font-weight: 650;
        margin: 0;
      }

      p {
        margin: 0;
        max-width: 44ch;
      }

      .preserved {
        color: var(--success);
      }

      .actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 0.5rem;
      }

      .reference {
        margin-top: 0.6rem;
        opacity: 0.75;
      }

      .reference code {
        font-size: 0.85em;
        user-select: all;
      }
    `,
  ],
})
export class ErrorStateComponent {
  /** True when the browser has no connection, which changes the wording. */
  readonly offline = input(false);
  readonly message = input('Please try again.');
  /** The support reference from a 5xx, when the server issued one (§57). */
  readonly reference = input<string | null>(null);
  /** What the user has *not* lost. Left empty when nothing was at stake. */
  readonly preserved = input<string | null>(null);
  readonly retryable = input(true);
  readonly retryLabel = input('Retry');
  readonly heading = input<string | null>(null);

  readonly retry = output<void>();

  readonly title = computed(
    () => this.heading() ?? (this.offline() ? 'You’re offline.' : 'Something went wrong.'),
  );

  readonly glyph = computed<IconName>(() =>
    this.offline() ? 'globe-outline' : 'alert-circle-outline',
  );
}

// ---------------------------------------------------------------------------
// Offline banner (§36)
// ---------------------------------------------------------------------------

/**
 * The app-wide offline notice from §36.
 *
 * A banner rather than a blocking overlay, because §36's own wording is "some
 * features may not be available" - cached listings, a claim code already on
 * screen and the whole of the customer's own history still work, and covering
 * them with a modal would take away more than the network did.
 *
 * The merchant sentence is added on the admin side, where there is unsaved
 * work to warn about.
 */
@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (!network.online()) {
      <div class="offline-banner" role="status" aria-live="polite">
        <app-icon name="globe-outline" [size]="16" />
        <span>
          <strong>You’re offline.</strong>
          @if (merchant()) {
            Your changes haven’t been submitted yet.
          } @else {
            Some features may not be available right now. Please reconnect to continue.
          }
        </span>
      </div>
    } @else if (network.justReconnected()) {
      <div class="offline-banner reconnected" role="status" aria-live="polite">
        <app-icon name="checkmark-circle-outline" [size]="16" />
        <span>Back online.</span>
      </div>
    }
  `,
  styles: [
    `
      .offline-banner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        font-size: 0.87rem;
        background: var(--warning-bg);
        color: var(--text);
        border-bottom: 1px solid var(--border);
        text-align: center;
      }

      .offline-banner.reconnected {
        background: var(--success-bg);
      }

      strong {
        font-weight: 700;
      }
    `,
  ],
})
export class OfflineBannerComponent {
  readonly network = inject(NetworkStatusService);

  /** Adds §36's merchant sentence about unsubmitted changes. */
  readonly merchant = input(false);
}
