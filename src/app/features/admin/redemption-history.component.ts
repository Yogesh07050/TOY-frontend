import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Claim, ClaimAudit, PageMeta } from '../../core/models';
import { PERMISSIONS } from '../../core/permissions';
import { EmptyStateComponent, PaginationComponent } from '../../shared/ui.components';
import { IconComponent } from '../../shared/icon.component';

type HistoryTab = 'redeemed' | 'claims';

/**
 * Merchant redemption history (Claim/Redemption §24) and the claims console
 * (§26).
 *
 * Two tabs over the same filter bar. "Redeemed" is the merchant's evidence of
 * conversions - the list §39 is really about. "All claims" is what a dispute is
 * investigated from, and what shows a shop what is still outstanding.
 *
 * The audit drawer (§30) is deliberately reachable from any row: when a
 * customer says their code was refused, the answer is the sequence of
 * verification attempts against that claim, and nothing else will do.
 */
@Component({
  selector: 'app-redemption-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    EmptyStateComponent,
    PaginationComponent,
    IconComponent,
  ],
  templateUrl: './redemption-history.component.html',
  styleUrl: './redemption-history.component.scss',
})
export class RedemptionHistoryComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly rows = signal<Claim[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly tab = signal<HistoryTab>('redeemed');

  readonly audit = signal<ClaimAudit | null>(null);
  readonly auditLoading = signal(false);
  readonly exporting = signal(false);
  readonly revoking = signal(false);

  // Filters (§24).
  search = '';
  status = 'all';
  from = '';
  to = '';

  private page = 1;

  readonly statuses = [
    { value: 'all', label: 'Any status' },
    { value: 'active', label: 'Ready to use' },
    { value: 'redeemed', label: 'Redeemed' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'revoked', label: 'Revoked' },
  ];

  constructor() {
    this.load();
  }

  get canExport(): boolean {
    return this.auth.has(PERMISSIONS.EXPORT_REDEMPTION_REPORT);
  }

  get canRevoke(): boolean {
    return this.auth.has(PERMISSIONS.REVOKE_CLAIM);
  }

  get isClaimsTab(): boolean {
    return this.tab() === 'claims';
  }

  private query(): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    if (this.search.trim()) query['search'] = this.search.trim();
    if (this.from) query['from'] = new Date(this.from).toISOString();
    // An end date with no time means "to the end of that day", which is what
    // someone typing 31 March into a date box invariably intends.
    if (this.to) query['to'] = new Date(`${this.to}T23:59:59`).toISOString();
    if (this.isClaimsTab && this.status !== 'all') query['status'] = this.status;
    return query;
  }

  load(): void {
    this.loading.set(true);
    const query = { ...this.query(), page: this.page, limit: 20 };
    const request = this.isClaimsTab ? this.api.listAllClaims(query) : this.api.listRedemptions(query);

    request.subscribe({
      next: (result) => {
        this.rows.set(result.items);
        this.meta.set(result.meta);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  selectTab(tab: HistoryTab): void {
    if (this.tab() === tab) return;
    this.tab.set(tab);
    this.page = 1;
    this.load();
  }

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  clearFilters(): void {
    this.search = '';
    this.status = 'all';
    this.from = '';
    this.to = '';
    this.applyFilters();
  }

  goToPage(page: number): void {
    this.page = page;
    this.load();
  }

  // ---- Audit drawer (§26, §30) --------------------------------------------

  openAudit(claim: Claim): void {
    this.auditLoading.set(true);
    this.audit.set(null);
    this.api.claimAudit(claim.id).subscribe({
      next: (result) => {
        this.audit.set(result);
        this.auditLoading.set(false);
      },
      error: () => {
        this.auditLoading.set(false);
        this.toast.error('That claim’s history could not be loaded.');
      },
    });
  }

  closeAudit(): void {
    this.audit.set(null);
  }

  revoke(claim: Claim): void {
    const reason = window.prompt(
      'Why is this claim being revoked? This is recorded against your name.',
    );
    if (!reason?.trim()) return;

    this.revoking.set(true);
    this.api.revokeClaim(claim.id, reason.trim()).subscribe({
      next: () => {
        this.revoking.set(false);
        this.toast.success('Claim revoked.');
        this.closeAudit();
        this.load();
      },
      error: (error) => {
        this.revoking.set(false);
        this.toast.error(error?.error?.error?.message ?? 'The claim could not be revoked.');
      },
    });
  }

  // ---- Export (§25) -------------------------------------------------------

  exportAs(format: 'csv' | 'xlsx'): void {
    this.exporting.set(true);
    this.api.exportRedemptions(format, this.query()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `redemptions-${new Date().toISOString().slice(0, 10)}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.exporting.set(false);
        this.toast.error('The export could not be generated.');
      },
    });
  }

  // ---- Presentation -------------------------------------------------------

  statusLabel(claim: Claim): string {
    if (claim.status === 'claimed' && new Date(claim.expiresAt).getTime() < Date.now()) {
      return 'expired';
    }
    return claim.status;
  }

  methodLabel(method: string | null): string {
    if (method === 'QR_SCAN') return 'QR scan';
    if (method === 'CODE_ENTRY') return 'Code entry';
    return '—';
  }

  /** Turns an audit reason code into something a human reads. */
  reasonLabel(reason: string | null): string {
    if (!reason) return '';
    return (
      {
        NOT_FOUND: 'code not found',
        BAD_QR_SIGNATURE: 'QR could not be trusted',
        WRONG_SHOP: 'another shop’s claim',
        WRONG_BRANCH: 'wrong branch',
        EXPIRED: 'expired',
        ALREADY_REDEEMED: 'already redeemed',
        CANCELLED: 'cancelled by the customer',
        REVOKED: 'revoked',
        MERCHANT_DECLINED: 'not redeemed by the shop',
        ADMIN_REVOKED: 'revoked by an administrator',
      }[reason] ?? reason.toLowerCase().replace(/_/g, ' ')
    );
  }
}
