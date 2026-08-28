import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Claim, PageMeta } from '../../core/models';
import { EmptyStateComponent, PaginationComponent } from '../../shared/ui.components';
import { IconComponent } from '../../shared/icon.component';
import { QrCodeComponent } from '../../shared/qr-code.component';

type ClaimTab = 'active' | 'redeemed' | 'all';

/**
 * My Claims (Claim/Redemption §5, §34) and Redeemed Offers (§36).
 *
 * One screen with tabs rather than two: a customer standing at a counter is
 * looking for "the code for this shop", and making them guess whether it lives
 * under Claims or under Redeemed is exactly the moment the queue builds up.
 *
 * The claim opens into a panel showing the QR and, always, the code in plain
 * characters — §6 is explicit that redemption must never depend on a scan
 * working, and a cracked screen or a dim shop is enough to stop one.
 */
@Component({
  selector: 'app-claims',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    EmptyStateComponent,
    PaginationComponent,
    IconComponent,
    QrCodeComponent,
  ],
  templateUrl: './claims.component.html',
  styleUrl: './claims.component.scss',
})
export class ClaimsComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly claims = signal<Claim[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly activeTab = signal<ClaimTab>('active');

  /** The claim shown in the code panel; null when the list is showing. */
  readonly selected = signal<Claim | null>(null);
  readonly cancelling = signal(false);

  private page = 1;

  readonly tabs: { key: ClaimTab; label: string }[] = [
    { key: 'active', label: 'Ready to use' },
    { key: 'redeemed', label: 'Redeemed' },
    { key: 'all', label: 'All' },
  ];

  constructor() {
    // A claim id in the url opens straight into the code panel, which is where
    // the "Offer claimed" notification (§37) and the QR deep link both land.
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('claimId'));
      if (Number.isFinite(id) && id > 0) this.openById(id);
      else this.selected.set(null);
    });

    const tab = this.route.snapshot.queryParamMap.get('tab') as ClaimTab | null;
    if (tab && this.tabs.some((entry) => entry.key === tab)) this.activeTab.set(tab);
    this.load();
  }

  // ---- List ---------------------------------------------------------------

  load(): void {
    this.loading.set(true);
    this.api.listClaims({ page: this.page, limit: 12, status: this.activeTab() }).subscribe({
      next: (result) => {
        this.claims.set(result.items);
        this.meta.set(result.meta);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  selectTab(tab: ClaimTab): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.page = 1;
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab } });
    this.load();
  }

  goToPage(page: number): void {
    this.page = page;
    this.load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---- The code panel -----------------------------------------------------

  open(claim: Claim): void {
    this.selected.set(claim);
    void this.router.navigate(['/claims', claim.id]);
    this.trackViews(claim);
  }

  private openById(id: number): void {
    this.api.getClaim(id).subscribe({
      next: (claim) => {
        this.selected.set(claim);
        this.trackViews(claim);
      },
      error: () => {
        this.toast.error('That claim could not be found.');
        void this.router.navigate(['/claims']);
      },
    });
  }

  close(): void {
    this.selected.set(null);
    void this.router.navigate(['/claims'], { queryParams: { tab: this.activeTab() } });
  }

  /** §32: whether customers can find their codes again is worth knowing. */
  private trackViews(claim: Claim): void {
    this.api.trackAnalyticsEvent('OFFER_CLAIM_VIEW', { offerId: claim.offer.id }).subscribe({
      error: () => undefined,
    });
    if (claim.qrValue) {
      this.api.trackAnalyticsEvent('CLAIM_QR_VIEW', { offerId: claim.offer.id }).subscribe({
        error: () => undefined,
      });
    }
  }

  copyCode(code: string): void {
    void navigator.clipboard?.writeText(code).then(
      () => this.toast.success('Code copied'),
      () => this.toast.error('Could not copy the code'),
    );
  }

  cancel(claim: Claim): void {
    this.cancelling.set(true);
    this.api.cancelClaim(claim.id).subscribe({
      next: (updated) => {
        this.cancelling.set(false);
        this.selected.set(updated);
        this.toast.success('Claim cancelled. You can claim this offer again.');
        this.load();
      },
      error: () => this.cancelling.set(false),
    });
  }

  // ---- Presentation -------------------------------------------------------

  /**
   * §12 in the customer's language. The status enum is about the record; this
   * is about what the customer can do with what they are holding.
   */
  statusLabel(claim: Claim): string {
    if (claim.status === 'redeemed') return 'Redeemed';
    if (claim.status === 'cancelled') return 'Cancelled';
    if (claim.status === 'revoked') return 'No longer valid';
    if (claim.status === 'expired' || this.isExpired(claim)) return 'Expired';
    return 'Ready to use';
  }

  statusClass(claim: Claim): string {
    if (claim.status === 'redeemed') return 'is-redeemed';
    if (claim.status === 'claimed' && !this.isExpired(claim)) return 'is-live';
    return 'is-dead';
  }

  isExpired(claim: Claim): boolean {
    return new Date(claim.expiresAt).getTime() < Date.now();
  }

  usable(claim: Claim): boolean {
    return claim.status === 'claimed' && !this.isExpired(claim);
  }

  /** "Today, 8:00 PM" when it runs out today, otherwise the date too. */
  readonly expiryLabel = computed(() => {
    const claim = this.selected();
    if (!claim) return '';
    return this.formatExpiry(claim);
  });

  formatExpiry(claim: Claim): string {
    const expires = new Date(claim.expiresAt);
    const time = expires.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const isToday = expires.toDateString() === new Date().toDateString();
    if (isToday) return `Today, ${time}`;
    return `${expires.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}, ${time}`;
  }
}
