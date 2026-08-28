import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { encodeQr, qrToSvgPath } from './qr';

/**
 * Renders a value as a QR code (Claim/Redemption §6).
 *
 * SVG rather than canvas so it stays sharp when a shopkeeper leans in with a
 * scanner, survives the browser's zoom, and prints. The white plate behind it
 * is not decoration: the quiet zone is part of the symbol, and a QR drawn
 * straight onto a dark page background does not scan.
 */
@Component({
  selector: 'app-qr-code',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (symbol(); as qr) {
      <svg
        class="qr"
        [attr.viewBox]="'0 0 ' + qr.size + ' ' + qr.size"
        [style.width.px]="size()"
        [style.height.px]="size()"
        shape-rendering="crispEdges"
        role="img"
        [attr.aria-label]="label()"
      >
        <rect width="100%" height="100%" fill="#ffffff" />
        <path [attr.d]="qr.path" fill="#000000" />
      </svg>
    } @else {
      <p class="small muted">This code is too long to show as a QR.</p>
    }
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
      .qr {
        display: block;
        border-radius: 8px;
        /* The quiet zone is inside the viewBox, so no padding is needed here. */
        background: #ffffff;
      }
    `,
  ],
})
export class QrCodeComponent {
  readonly value = input.required<string>();
  readonly size = input(200);
  readonly label = input('QR code');

  /**
   * Null when the value will not fit. Returning null rather than throwing keeps
   * a claim screen usable: the manual code below it is what actually has to
   * work (§6), and the QR is the convenience.
   */
  readonly symbol = computed(() => {
    try {
      return qrToSvgPath(encodeQr(this.value()));
    } catch {
      return null;
    }
  });
}
