import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Claim, ClaimVerification, RedemptionSummary } from '../../core/models';
import { PERMISSIONS } from '../../core/permissions';
import { IconComponent } from '../../shared/icon.component';
import { IconName } from '../../shared/icons';

/** What the screen is currently showing. */
type Stage = 'idle' | 'verified' | 'redeemed' | 'rejected';

interface Rejection {
  message: string;
  reason: string | null;
  redeemedAt: string | null;
}

/**
 * Verify Claim (Claim/Redemption §7–§11).
 *
 * The two-step shape is the whole design. Scanning or typing a code only ever
 * *asks* — it shows the shopkeeper what they are holding and stops. Nothing
 * about the claim changes until they press Confirm Redemption, because the
 * benefit is handed over in the physical world and only a person standing there
 * knows whether that happened (§38.7).
 *
 * Scanning uses the browser's own BarcodeDetector against a plain camera
 * stream, so no scanner hardware and no third-party library are involved (§7).
 * Where that API is missing — Safari, an older Android browser — the manual
 * code field is not a fallback so much as the primary path, which is why it is
 * always on screen rather than behind a "having trouble?" link (§9).
 */
@Component({
  selector: 'app-verify-claim',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  templateUrl: './verify-claim.component.html',
  styleUrl: './verify-claim.component.scss',
})
export class VerifyClaimComponent implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly PERMISSIONS = PERMISSIONS;

  readonly stage = signal<Stage>('idle');
  readonly claim = signal<ClaimVerification | null>(null);
  readonly redeemed = signal<Claim | null>(null);
  readonly rejection = signal<Rejection | null>(null);

  readonly busy = signal(false);
  readonly summary = signal<RedemptionSummary | null>(null);

  /** Manual entry (§9). */
  code = '';

  /**
   * How the claim on screen was found. Kept here rather than read back off the
   * claim, because `verificationMethod` on the record is only written when a
   * redemption actually happens - on a verified-but-unredeemed claim it is
   * still null, and §30 wants the method that led to this redemption.
   */
  private lastMethod: 'QR_SCAN' | 'CODE_ENTRY' = 'CODE_ENTRY';

  // ---- Scanning -----------------------------------------------------------

  readonly scanning = signal(false);
  readonly scanSupported = signal(typeof window !== 'undefined' && 'BarcodeDetector' in window);
  readonly cameraError = signal<string | null>(null);

  private stream: MediaStream | null = null;
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private video: HTMLVideoElement | null = null;

  constructor() {
    this.loadSummary();
  }

  ngOnDestroy(): void {
    this.stopScan();
  }

  get canRedeem(): boolean {
    return this.auth.has(PERMISSIONS.REDEEM_OFFER);
  }

  private loadSummary(): void {
    this.api.redemptionSummary().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => undefined,
    });
  }

  // ---- Camera -------------------------------------------------------------

  async startScan(videoEl: HTMLVideoElement): Promise<void> {
    if (this.scanning()) return;
    this.cameraError.set(null);
    this.video = videoEl;

    try {
      // The rear camera, because the customer's phone is being held up to it.
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
    } catch {
      this.cameraError.set(
        'The camera could not be opened. Check the browser permission, or type the code below.',
      );
      return;
    }

    videoEl.srcObject = this.stream;
    await videoEl.play().catch(() => undefined);
    this.scanning.set(true);

    const Detector = (window as unknown as { BarcodeDetector: new (options: { formats: string[] }) => { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    const detector = new Detector({ formats: ['qr_code'] });

    // Polled rather than run per animation frame: four looks a second is well
    // inside what a person holding up a phone can do, and it leaves the CPU
    // alone on the cheap Android handset this is most often running on.
    this.scanTimer = setInterval(async () => {
      if (!this.video || this.busy()) return;
      try {
        const found = await detector.detect(this.video);
        if (found.length) this.onScanned(found[0].rawValue);
      } catch {
        // A frame that fails to decode is the normal case, not an error.
      }
    }, 250);
  }

  stopScan(): void {
    if (this.scanTimer) clearInterval(this.scanTimer);
    this.scanTimer = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.scanning.set(false);
  }

  /**
   * A scan produces the deep link the customer's app rendered. The signed token
   * inside it is what gets sent; if the QR turns out to be some other code
   * entirely, the whole string is sent as a code and the server rejects it,
   * which is the right answer for a shopkeeper who scanned a milk carton.
   */
  private onScanned(raw: string): void {
    this.stopScan();
    const token = this.tokenFrom(raw);
    if (token) this.verify({ qrToken: token, method: 'QR_SCAN' });
    else this.verify({ code: raw.trim().slice(0, 32), method: 'QR_SCAN' });
  }

  private tokenFrom(raw: string): string | null {
    try {
      return new URL(raw).searchParams.get('t');
    } catch {
      return null;
    }
  }

  // ---- Verify and redeem --------------------------------------------------

  submitCode(): void {
    const code = this.code.trim();
    if (!code) return;
    this.verify({ code, method: 'CODE_ENTRY' });
  }

  private verify(payload: { code?: string; qrToken?: string; method: 'QR_SCAN' | 'CODE_ENTRY' }): void {
    this.busy.set(true);
    this.rejection.set(null);
    this.redeemed.set(null);
    this.lastMethod = payload.method;

    this.api.verifyClaim(payload).subscribe({
      next: (claim) => {
        this.busy.set(false);
        this.claim.set(claim);
        this.stage.set('verified');
      },
      error: (error) => {
        this.busy.set(false);
        this.claim.set(null);
        this.stage.set('rejected');
        // The server decides what the shopkeeper is told (§13); the reason code
        // beside it only chooses which icon and heading to use.
        this.rejection.set({
          message: error?.error?.error?.message ?? 'That code could not be checked. Try again.',
          reason: error?.error?.error?.details?.reason ?? null,
          redeemedAt: error?.error?.error?.details?.redeemedAt ?? null,
        });
      },
    });
  }

  confirmRedemption(): void {
    const claim = this.claim();
    if (!claim) return;

    this.busy.set(true);
    this.api.redeemClaim({ code: claim.code, method: this.lastMethod }).subscribe({
      next: (result) => {
        this.busy.set(false);
        this.redeemed.set(result);
        this.stage.set('redeemed');
        this.code = '';
        this.loadSummary();
      },
      error: (error) => {
        this.busy.set(false);
        // Losing the race to another till is not the shopkeeper's mistake, so
        // it lands on the same screen as any other refusal rather than as a
        // toast over a claim that still looks redeemable.
        this.stage.set('rejected');
        this.rejection.set({
          message: error?.error?.error?.message ?? 'The redemption could not be recorded.',
          reason: error?.error?.error?.details?.reason ?? null,
          redeemedAt: error?.error?.error?.details?.redeemedAt ?? null,
        });
      },
    });
  }

  /** The customer changed their mind, or the stock ran out (§32). */
  declineRedemption(): void {
    const claim = this.claim();
    if (!claim) return;
    this.api.rejectClaim(claim.code, 'MERCHANT_DECLINED').subscribe({
      next: () => {
        this.toast.success('Recorded. The customer keeps their claim.');
        this.reset();
      },
      error: () => this.reset(),
    });
  }

  reset(): void {
    this.stage.set('idle');
    this.claim.set(null);
    this.redeemed.set(null);
    this.rejection.set(null);
    this.code = '';
  }

  // ---- Presentation -------------------------------------------------------

  rejectionTitle(reason: string | null): string {
    switch (reason) {
      case 'EXPIRED':
        return 'Offer expired';
      case 'ALREADY_REDEEMED':
        return 'Already redeemed';
      case 'WRONG_BRANCH':
        return 'Wrong branch';
      case 'REVOKED':
      case 'CANCELLED':
        return 'No longer valid';
      default:
        return 'Invalid claim code';
    }
  }

  rejectionIcon(reason: string | null): IconName {
    return reason ? 'warning-outline' : 'alert-circle-outline';
  }
}
