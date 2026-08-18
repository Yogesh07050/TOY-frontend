import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { DeviceSession } from '../../core/models';

/**
 * Profile → Logged-in devices (§28).
 *
 * Each row is one refresh-token family on the server, so ending one signs out
 * exactly that device and leaves the others alone (§27). The session making
 * this request is labelled and never offered for revoke — "log out this
 * browser" is what the Sign out button is for.
 */
@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Logged-in devices</h1>
          <p class="subtitle">
            You stay signed in on each device until you sign out there, or end its session here.
          </p>
        </div>
        @if (others().length) {
          <button type="button" class="btn btn-danger" [disabled]="busy()" (click)="revokeOthers()">
            Log out other devices
          </button>
        }
      </div>

      @if (loading()) {
        <div class="skeleton" style="height: 160px"></div>
      } @else if (!sessions().length) {
        <div class="card">
          <div class="card-body"><p>No active sessions.</p></div>
        </div>
      } @else {
        <ul class="devices">
          @for (session of sessions(); track session.id) {
            <li class="card" [class.current]="session.current">
              <div class="card-body device">
                <div>
                  <p class="strong">
                    {{ session.deviceName ?? 'Unknown device' }}
                    @if (session.current) {
                      <span class="badge badge-brand">This device</span>
                    }
                  </p>
                  <p class="small subtle">
                    {{ session.platform ?? session.deviceType }} · {{ lastActive(session) }}
                    @if (session.ipAddress) {
                      · {{ session.ipAddress }}
                    }
                  </p>
                  <p class="small subtle">
                    Signed in {{ session.createdAt | date: 'medium' }}
                  </p>
                </div>
                @if (!session.current) {
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    [disabled]="busy()"
                    (click)="revoke(session)"
                  >
                    Sign out
                  </button>
                }
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [
    `
      .devices {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.75rem;
      }

      .devices .current {
        border-color: var(--brand);
      }

      .device {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .device p {
        margin: 0;
      }
    `,
  ],
})
export class SessionsComponent {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly sessions = signal<DeviceSession[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);

  readonly others = computed(() => this.sessions().filter((session) => !session.current));

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    this.auth.sessions().subscribe({
      next: (sessions) => {
        this.sessions.set(sessions);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** "Active now", "2 hours ago", "yesterday" — how §28 words the list. */
  lastActive(session: DeviceSession): string {
    const minutes = Math.floor((Date.now() - new Date(session.lastUsedAt).getTime()) / 60000);
    if (!Number.isFinite(minutes) || minutes < 5) return 'Active now';
    if (minutes < 60) return `Active ${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Last active ${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'Last active yesterday' : `Last active ${days} days ago`;
  }

  revoke(session: DeviceSession): void {
    if (!confirm(`Sign out ${session.deviceName ?? 'this device'}? It will have to sign in again.`)) {
      return;
    }

    this.busy.set(true);
    this.auth.revokeSession(session.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('That device has been signed out.');
        this.reload();
      },
      error: () => {
        this.busy.set(false);
        this.toast.error('That device could not be signed out.');
      },
    });
  }

  revokeOthers(): void {
    const count = this.others().length;
    if (!confirm(`Log out ${count} other session${count === 1 ? '' : 's'}? This device stays signed in.`)) {
      return;
    }

    this.busy.set(true);
    this.auth.revokeOtherSessions().subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Other devices have been signed out.');
        this.reload();
      },
      error: () => {
        this.busy.set(false);
        this.toast.error('Those devices could not be signed out.');
      },
    });
  }
}
