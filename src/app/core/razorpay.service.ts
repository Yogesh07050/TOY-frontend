import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, map, switchMap, throwError } from 'rxjs';

import { ApiService } from './api.service';
import { CheckoutSession, Entitlements, PlanKey } from './models';

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

/** The subset of Razorpay Checkout's options this app sets. */
interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill: { name?: string; email?: string; contact?: string };
  notes: Record<string, string>;
  theme: { color: string };
  handler: (response: RazorpaySuccess) => void;
  modal: { ondismiss: () => void };
}

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_subscription_id?: string;
  razorpay_order_id?: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: string, handler: (payload: { error: { description?: string } }) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

/**
 * Razorpay Checkout for the web app (§2, §3).
 *
 * The checkout overlay is Razorpay's own, hosted on their domain: card numbers,
 * UPI PINs and bank credentials are entered there and never touch this
 * application (§6, §45).
 *
 * Nothing in this file activates a plan. A successful checkout is reported to
 * the backend so it can verify the signature, but the subscription only turns
 * on when Razorpay's webhook arrives (§7) - which is why the caller reloads
 * entitlements from the server rather than assuming an upgrade.
 */
@Injectable({ providedIn: 'root' })
export class RazorpayService {
  private readonly api = inject(ApiService);
  private scriptPromise: Promise<boolean> | null = null;

  /** True while the overlay is open, so the page can disable its buttons. */
  readonly busy = signal(false);

  /** Loads checkout.js once. Resolves false when it cannot be reached. */
  private loadScript(): Promise<boolean> {
    if (window.Razorpay) return Promise.resolve(true);
    if (this.scriptPromise) return this.scriptPromise;

    this.scriptPromise = new Promise<boolean>((resolve) => {
      const script = document.createElement('script');
      script.src = CHECKOUT_SCRIPT;
      script.async = true;
      script.onload = () => resolve(Boolean(window.Razorpay));
      // Offline, or blocked by an extension or a strict CSP. The caller falls
      // back to Razorpay's hosted page, which needs no script at all.
      script.onerror = () => {
        this.scriptPromise = null;
        resolve(false);
      };
      document.head.appendChild(script);
    });

    return this.scriptPromise;
  }

  /**
   * Runs the whole purchase: create the subscription, open Checkout, then hand
   * the signed result back to the backend to verify.
   *
   * Emits the backend's verification response. "Verified" means the payment
   * reached Razorpay - not that the plan is live (§7).
   */
  purchase(
    shopId: number,
    plan: PlanKey,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
  ): Observable<{ verified: boolean; subscriptionStatus: string; message: string }> {
    return this.api.startCheckout(shopId, plan, billingCycle).pipe(
      switchMap((session) => from(this.openCheckout(session)).pipe(map((result) => ({ session, result })))),
      switchMap(({ session, result }) =>
        this.api.verifyCheckout(shopId, {
          paymentId: result.razorpay_payment_id,
          subscriptionId: result.razorpay_subscription_id ?? session.subscriptionId,
          orderId: result.razorpay_order_id,
          signature: result.razorpay_signature,
        }),
      ),
    );
  }

  /**
   * Opens the overlay and resolves when the customer completes payment.
   *
   * Rejects when they dismiss it or the gateway reports a failure, so the
   * caller can tell "cancelled" from "paid" without polling.
   */
  private openCheckout(session: CheckoutSession): Promise<RazorpaySuccess> {
    return this.loadScript().then(
      (loaded) =>
        new Promise<RazorpaySuccess>((resolve, reject) => {
          if (!loaded || !window.Razorpay) {
            // Same payment, same methods - just Razorpay's full-page version.
            if (session.shortUrl) {
              window.location.href = session.shortUrl;
              // The tab is navigating away; never settle.
              return;
            }
            reject(new Error('Could not load the payment gateway. Please try again.'));
            return;
          }

          this.busy.set(true);
          const settle = <T>(fn: (value: T) => void) => (value: T) => {
            this.busy.set(false);
            fn(value);
          };

          const instance = new window.Razorpay({
            key: session.keyId,
            subscription_id: session.subscriptionId,
            name: 'Offers App',
            description: `${session.planName} plan · ₹${session.amount.toLocaleString('en-IN')}/month`,
            prefill: {
              name: session.prefill.name ?? undefined,
              email: session.prefill.email ?? undefined,
              contact: session.prefill.contact ?? undefined,
            },
            notes: { plan: session.plan },
            theme: { color: '#b45309' },
            handler: settle(resolve),
            modal: {
              ondismiss: () => {
                this.busy.set(false);
                reject(new Error('Payment was cancelled.'));
              },
            },
          });

          instance.on('payment.failed', (payload) => {
            this.busy.set(false);
            reject(new Error(payload.error?.description ?? 'The payment could not be completed.'));
          });

          instance.open();
        }),
    );
  }

  /** Whether the error came from the customer closing the overlay. */
  static isCancellation(error: unknown): boolean {
    return error instanceof Error && error.message === 'Payment was cancelled.';
  }
}
