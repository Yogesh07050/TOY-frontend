import { Injectable, signal } from '@angular/core';

/**
 * Whether the browser thinks it can reach the network (§36).
 *
 * `navigator.onLine` is the only signal a browser offers, and it is a weak one:
 * it reports whether there is *a* connection, not whether our API is reachable
 * through it - a captive portal is "online". So this is treated as a hint that
 * is good at one thing (no connection at all, which is the common case on a
 * phone) and is corrected by the thing that actually knows: a request that
 * failed with status 0.
 *
 * That correction runs one way only. The interceptor may push the app into the
 * offline state when a request cannot leave the device; only the browser's own
 * `online` event brings it back, because a single successful request proves the
 * network works whereas a single failure does not prove it does not.
 */
@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  /** False while the app believes it cannot reach the server. */
  readonly online = signal(true);

  /**
   * True for a few seconds after coming back, so the banner can confirm the
   * recovery rather than just vanishing - a notice that disappears silently
   * leaves the reader unsure whether anything changed.
   */
  readonly justReconnected = signal(false);

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Guarded so the service is safe to construct outside a browser (tests,
    // and server-side rendering if it is ever switched on).
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    this.online.set(navigator.onLine !== false);

    window.addEventListener('online', () => this.markOnline());
    window.addEventListener('offline', () => this.markOffline());
  }

  /**
   * Called by the HTTP interceptor when a request failed before reaching the
   * server. `navigator.onLine` can still be true here - a dropped Wi-Fi
   * association often is - and the failed request is the better evidence.
   */
  reportRequestFailure(): void {
    this.markOffline();
  }

  /** Called when a request succeeds, which is proof the network is back. */
  reportRequestSuccess(): void {
    if (!this.online()) this.markOnline();
  }

  private markOffline(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.justReconnected.set(false);
    this.online.set(false);
  }

  private markOnline(): void {
    if (this.online()) return;
    this.online.set(true);
    this.justReconnected.set(true);

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.justReconnected.set(false);
      this.reconnectTimer = null;
    }, 4000);
  }
}
