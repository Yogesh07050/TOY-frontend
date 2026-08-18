import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiService } from '../../../core/api.service';
import { SubscriptionService } from '../../../core/subscription.service';
import { Invoice, PaymentStatus, PaymentTransaction, SubscriptionEvent } from '../../../core/models';

/**
 * §32 Subscription → Billing, and payments §15/§16.
 *
 * Three ledgers, deliberately kept apart: the payments Razorpay actually
 * collected, the invoices issued for them, and the plan changes that led there.
 * Payment rows are never deleted - a failed payment or a cancellation stays
 * visible, which is what makes the history auditable (§13).
 */
@Component({
  selector: 'app-subscription-billing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container page">
      <div class="page-header">
        <div>
          <h1>Billing</h1>
          <p class="subtitle">Invoices and plan history for your shop.</p>
        </div>
        <a class="btn btn-secondary" routerLink="/admin/subscription">Current plan</a>
      </div>

      @if (!shopId()) {
        <div class="card">
          <div class="card-body">
            <p>You are not assigned to a shop yet, so there is no billing history to show.</p>
          </div>
        </div>
      } @else {
        <!-- §15: date, plan, amount, method, payment id, status. -->
        <section class="card mb-2">
          <div class="card-header"><h2>Payments</h2></div>
          <div class="card-body">
            @if (loading()) {
              <div class="skeleton" style="height: 120px"></div>
            } @else if (!payments().length) {
              <p class="small subtle">
                No payments yet. The Free plan is not billed, so payments appear after your first
                paid plan.
              </p>
            } @else {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Plan</th>
                      <th class="num">Amount</th>
                      <th>Method</th>
                      <th>Payment ID</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (payment of payments(); track payment.id) {
                      <tr>
                        <td>{{ payment.paidAt ?? payment.createdAt | date: 'mediumDate' }}</td>
                        <td>{{ payment.planName }}</td>
                        <td class="num">₹{{ payment.amount.toLocaleString('en-IN') }}</td>
                        <td>{{ methodLabel(payment) }}</td>
                        <td class="mono">{{ payment.paymentId ?? '—' }}</td>
                        <td>
                          <span class="badge" [class]="paymentBadge(payment.status)">
                            {{ paymentLabel(payment.status) }}
                          </span>
                          @if (payment.failureReason) {
                            <p class="small subtle">{{ payment.failureReason }}</p>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </section>

        <section class="card mb-2">
          <div class="card-header"><h2>Invoices</h2></div>
          <div class="card-body">
            @if (loading()) {
              <div class="skeleton" style="height: 120px"></div>
            } @else if (!invoices().length) {
              <p class="small subtle">
                No invoices yet. The Free plan is not billed, so invoices appear after your first
                paid plan.
              </p>
            } @else {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Plan</th>
                      <th>Billing period</th>
                      <th>Issued</th>
                      <th class="num">Subtotal</th>
                      <th class="num">Tax</th>
                      <th class="num">Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (invoice of invoices(); track invoice.id) {
                      <tr>
                        <td class="mono">{{ invoice.number }}</td>
                        <td>{{ invoice.planName }}</td>
                        <td>
                          @if (invoice.periodStart && invoice.periodEnd) {
                            {{ invoice.periodStart | date: 'mediumDate' }} –
                            {{ invoice.periodEnd | date: 'mediumDate' }}
                          } @else {
                            —
                          }
                        </td>
                        <td>{{ invoice.issuedAt | date: 'mediumDate' }}</td>
                        <td class="num">₹{{ invoice.subtotal.toLocaleString('en-IN') }}</td>
                        <td class="num">
                          ₹{{ invoice.taxAmount.toLocaleString('en-IN') }}
                          <span class="small subtle">({{ invoice.taxPercent }}%)</span>
                        </td>
                        <td class="num strong">₹{{ invoice.total.toLocaleString('en-IN') }}</td>
                        <td>
                          <span class="badge" [class]="badgeFor(invoice.status)">
                            {{ invoice.status }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </section>

        <section class="card">
          <div class="card-header"><h2>Plan history</h2></div>
          <div class="card-body">
            @if (loading()) {
              <div class="skeleton" style="height: 100px"></div>
            } @else if (!history().length) {
              <p class="small subtle">No plan changes recorded yet.</p>
            } @else {
              <ul class="history">
                @for (event of history(); track event.id) {
                  <li>
                    <span class="dot" [class]="event.action"></span>
                    <div>
                      <p class="strong">{{ describe(event) }}</p>
                      <p class="small subtle">
                        {{ event.createdAt | date: 'medium' }}
                        @if (event.actorName) {
                          · by {{ event.actorName }}
                        }
                        @if (event.note) {
                          · {{ event.note }}
                        }
                      </p>
                    </div>
                    @if (event.amount > 0) {
                      <span class="amount">₹{{ event.amount.toLocaleString('en-IN') }}</span>
                    }
                  </li>
                }
              </ul>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .num {
        text-align: right;
        font-variant-numeric: tabular-nums;
      }

      .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.85rem;
      }

      .history {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .history li {
        display: flex;
        align-items: flex-start;
        gap: 0.7rem;
        padding: 0.6rem 0;
        border-bottom: 1px solid var(--border);
      }

      .history li:last-child {
        border-bottom: none;
      }

      .history p {
        margin: 0;
      }

      .dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        margin-top: 0.4rem;
        flex: none;
        background: var(--text-subtle);
      }

      .dot.upgraded {
        background: var(--success);
      }
      .dot.downgraded,
      .dot.cancelled {
        background: var(--warning);
      }
      .dot.renewed {
        background: var(--info);
      }
      .dot.payment_failed,
      .dot.past_due,
      .dot.expired {
        background: var(--danger);
      }

      .amount {
        margin-left: auto;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class SubscriptionBillingComponent {
  private readonly api = inject(ApiService);
  private readonly subscriptions = inject(SubscriptionService);

  readonly invoices = signal<Invoice[]>([]);
  readonly payments = signal<PaymentTransaction[]>([]);
  readonly history = signal<SubscriptionEvent[]>([]);
  readonly loading = signal(true);

  readonly shopId = computed(() => this.subscriptions.current()?.shopId ?? null);

  constructor() {
    this.subscriptions.load();

    // Entitlements arrive asynchronously, so the shop id is not known on the
    // first tick. An effect picks it up the moment it resolves - and reloads
    // again if the merchant switches shops - without polling for it.
    effect(() => {
      const shopId = this.shopId();
      if (shopId === null) return;
      this.reload(shopId);
    });
  }

  private reload(shopId: number): void {
    this.loading.set(true);
    this.api.billingHistory(shopId).subscribe({
      next: (payments) => {
        this.payments.set(payments);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.api.subscriptionInvoices(shopId).subscribe({
      next: (invoices) => this.invoices.set(invoices),
      error: () => undefined,
    });
    this.api.subscriptionHistory(shopId).subscribe({
      next: (history) => this.history.set(history),
      error: () => undefined,
    });
  }

  badgeFor(status: string): string {
    return (
      {
        paid: 'badge-success',
        issued: 'badge-brand',
        pending: 'badge-warning',
        failed: 'badge-danger',
        refunded: 'badge-warning',
        void: 'badge-muted',
      }[status] ?? 'badge-brand'
    );
  }

  /**
   * "UPI AutoPay", "Visa ****4242" - what the merchant will recognise on their
   * statement. Only what Razorpay echoes back; no credential is ever stored (§6).
   */
  methodLabel(payment: PaymentTransaction): string {
    if (!payment.paymentMethod) return '—';
    const base = payment.paymentMethod === 'upi' ? 'UPI AutoPay' : payment.paymentMethod.toUpperCase();
    return payment.methodDetail ? `${base} · ${payment.methodDetail}` : base;
  }

  paymentLabel(status: PaymentStatus): string {
    return (
      {
        CREATED: 'Created',
        PENDING: 'Pending',
        AUTHORIZED: 'Authorised',
        CAPTURED: 'Success',
        FAILED: 'Failed',
        REFUNDED: 'Refunded',
        PARTIALLY_REFUNDED: 'Partly refunded',
        CANCELLED: 'Cancelled',
      }[status] ?? status
    );
  }

  paymentBadge(status: PaymentStatus): string {
    if (status === 'CAPTURED') return 'badge-success';
    if (status === 'FAILED' || status === 'CANCELLED') return 'badge-danger';
    if (status === 'REFUNDED' || status === 'PARTIALLY_REFUNDED') return 'badge-warning';
    return 'badge-muted';
  }

  describe(event: SubscriptionEvent): string {
    const labels: Record<string, string> = {
      created: 'Subscription created',
      upgraded: `Upgraded to ${event.toPlan}`,
      downgraded: `Moved to ${event.toPlan}`,
      renewed: `Renewed on ${event.toPlan}`,
      cancelled: 'Subscription cancelled',
      reactivated: `Reactivated on ${event.toPlan}`,
      payment_failed: 'Payment failed',
      past_due: 'Marked past due',
      grace_started: 'Grace period started',
      expired: 'Subscription expired',
    };
    return labels[event.action] ?? event.action;
  }
}
