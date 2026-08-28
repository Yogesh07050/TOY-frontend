import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OpeningHours } from '../core/models';

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

interface DayRow {
  key: DayKey;
  label: string;
  /** 'unset' is not the same as 'closed' - see the class comment. */
  state: 'unset' | 'closed' | 'open';
  open: string;
  close: string;
}

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

/**
 * Opening hours editor (V3 §3, §15).
 *
 *   <app-opening-hours [value]="hours" (valueChange)="onHours($event)" />
 *
 * Three states per day, not two. A day nobody has filled in is *unknown* and
 * is left out of the customer-facing list entirely; only a day explicitly
 * marked Closed says the shutters are down. Collapsing those two would have
 * every shop that skipped this field advertising itself as never open.
 *
 * One window per day. Split shifts exist and the API accepts up to three, but
 * a second row per day doubles the size of the control for something a small
 * high-street shop rarely needs - and hours already stored with two windows
 * are shown rather than silently dropped.
 */
@Component({
  selector: 'app-opening-hours',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="hours">
      @for (day of rows(); track day.key) {
        <div class="row" [class.off]="day.state !== 'open'">
          <span class="day">{{ day.label }}</span>

          <select
            class="state"
            [value]="day.state"
            (change)="setState(day.key, $any($event.target).value)"
            [attr.aria-label]="day.label + ' opening'"
          >
            <option value="unset">Not set</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>

          @if (day.state === 'open') {
            <input
              type="time"
              [value]="day.open"
              (change)="setTime(day.key, 'open', $any($event.target).value)"
              [attr.aria-label]="day.label + ' opens at'"
            />
            <span class="dash">–</span>
            <input
              type="time"
              [value]="day.close"
              (change)="setTime(day.key, 'close', $any($event.target).value)"
              [attr.aria-label]="day.label + ' closes at'"
            />
          } @else {
            <span class="note">
              {{ day.state === 'closed' ? 'Shown as closed' : 'Not shown to customers' }}
            </span>
          }
        </div>
      }

      <div class="bulk">
        <button type="button" class="link-button" (click)="copyMondayToAll()">
          Copy Monday to every day
        </button>
        <button type="button" class="link-button" (click)="clearAll()">Clear all</button>
      </div>
    </div>
  `,
  styles: [
    `
      .hours {
        display: grid;
        gap: 0.35rem;
      }

      .row {
        display: grid;
        grid-template-columns: 6.5rem 7rem auto auto auto;
        gap: 0.4rem;
        align-items: center;
      }

      .row.off {
        grid-template-columns: 6.5rem 7rem 1fr;
      }

      .day {
        font-size: 0.88rem;
      }

      .row.off .day {
        color: var(--text-subtle);
      }

      select,
      input[type='time'] {
        padding: 0.3rem 0.4rem;
        font: inherit;
        font-size: 0.85rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--surface);
        color: var(--text);
      }

      .dash {
        color: var(--text-subtle);
      }

      .note {
        font-size: 0.8rem;
        color: var(--text-subtle);
      }

      .bulk {
        display: flex;
        gap: 0.9rem;
        margin-top: 0.3rem;
      }

      .link-button {
        background: none;
        border: 0;
        padding: 0;
        color: var(--brand);
        font: inherit;
        font-size: 0.82rem;
        cursor: pointer;
        text-decoration: underline;
      }

      @media (max-width: 560px) {
        .row,
        .row.off {
          grid-template-columns: 5.5rem 1fr;
        }

        .dash {
          display: none;
        }
      }
    `,
  ],
})
export class OpeningHoursComponent {
  readonly value = input<OpeningHours | null>(null);
  readonly valueChange = output<OpeningHours | null>();

  /** Edits live here once the merchant touches anything; `value` seeds it. */
  private readonly edited = signal<OpeningHours | null | undefined>(undefined);

  readonly rows = computed<DayRow[]>(() => {
    const hours = this.edited() === undefined ? this.value() : this.edited();
    return DAYS.map(({ key, label }) => {
      const entry = hours?.[key];
      if (entry === 'closed') return { key, label, state: 'closed', open: '09:00', close: '21:00' };
      if (Array.isArray(entry) && entry.length) {
        return { key, label, state: 'open', open: entry[0].open, close: entry[0].close };
      }
      return { key, label, state: 'unset', open: '09:00', close: '21:00' };
    });
  });

  private emit(rows: DayRow[]): void {
    const next: OpeningHours = {};
    for (const row of rows) {
      if (row.state === 'closed') next[row.key] = 'closed';
      else if (row.state === 'open') next[row.key] = [{ open: row.open, close: row.close }];
    }
    // An empty object and null both mean "not stated"; null is what the API
    // expects for clearing the column, so it is the one that goes over the wire.
    const value = Object.keys(next).length ? next : null;
    this.edited.set(value);
    this.valueChange.emit(value);
  }

  setState(key: DayKey, state: DayRow['state']): void {
    this.emit(this.rows().map((row) => (row.key === key ? { ...row, state } : row)));
  }

  setTime(key: DayKey, field: 'open' | 'close', time: string): void {
    if (!time) return;
    this.emit(this.rows().map((row) => (row.key === key ? { ...row, [field]: time } : row)));
  }

  /** Most shops keep one set of hours all week, so this is the common case. */
  copyMondayToAll(): void {
    const monday = this.rows()[0];
    this.emit(this.rows().map((row) => ({ ...row, state: monday.state, open: monday.open, close: monday.close })));
  }

  clearAll(): void {
    this.emit(this.rows().map((row) => ({ ...row, state: 'unset' })));
  }
}
