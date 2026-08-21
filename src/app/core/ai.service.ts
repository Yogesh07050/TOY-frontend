import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiEnvelope, Page } from './models';
import {
  AiCapabilities,
  AiHistoryDetail,
  AiHistoryEntry,
  AiOfferPrefill,
  AiServiceStatus,
  AiShop,
  AiUsage,
  AssistantRequest,
  AssistantResult,
  ContentRequest,
  ContentResult,
  ImproveRequest,
  ImproveResult,
  ShopSubscription,
  SubscriptionPlan,
} from './ai.models';

/**
 * The AI features' API client, plus the small piece of state that carries a
 * chosen recommendation from the assistant to the offer form (§9).
 *
 * Nothing here decides what the user may do. Every call is authorised, plan-
 * checked and metered by the API; the capability information below only exists
 * so the UI can explain *why* something is unavailable instead of failing at
 * the moment the button is pressed.
 */
@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/ai`;
  private readonly subscriptionsBase = `${environment.apiUrl}/subscriptions`;

  /**
   * The recommendation the admin picked, waiting to be read by the offer form.
   *
   * Deliberately in-memory and single-use: the form consumes it on load and
   * clears it, so a later visit to "Post an offer" starts blank. It is a
   * pre-fill, never a saved offer — §10 keeps creation with the admin.
   */
  private readonly pendingPrefill = signal<AiOfferPrefill | null>(null);
  /** The history row the pre-fill came from, so accepting it can be recorded (§33). */
  private readonly pendingHistoryId = signal<number | null>(null);

  private data<T>(source: Observable<ApiEnvelope<T>>): Observable<T> {
    return source.pipe(map((response) => response.data));
  }

  // ---- Hand-off between the assistant and the offer form ------------------

  stagePrefill(prefill: AiOfferPrefill, historyId: number | null): void {
    this.pendingPrefill.set(prefill);
    this.pendingHistoryId.set(historyId);
  }

  /** Reads and clears the staged pre-fill. */
  takePrefill(): { prefill: AiOfferPrefill; historyId: number | null } | null {
    const prefill = this.pendingPrefill();
    if (!prefill) return null;
    const historyId = this.pendingHistoryId();
    this.pendingPrefill.set(null);
    this.pendingHistoryId.set(null);
    return { prefill, historyId };
  }

  hasPrefill(): boolean {
    return this.pendingPrefill() !== null;
  }

  // ---- Entitlements --------------------------------------------------------

  shops(): Observable<AiShop[]> {
    return this.data(this.http.get<ApiEnvelope<AiShop[]>>(`${this.base}/shops`));
  }

  capabilities(shopId: number): Observable<AiCapabilities> {
    return this.data(
      this.http.get<ApiEnvelope<AiCapabilities>>(`${this.base}/capabilities/${shopId}`),
    );
  }

  // ---- AI Offer Assistant (§4–§13) ----------------------------------------

  recommend(payload: AssistantRequest): Observable<AssistantResult> {
    return this.data(
      this.http.post<ApiEnvelope<AssistantResult>>(
        `${this.base}/offer-assistant/recommend`,
        payload,
      ),
    );
  }

  regenerateRecommendation(payload: AssistantRequest): Observable<AssistantResult> {
    return this.data(
      this.http.post<ApiEnvelope<AssistantResult>>(
        `${this.base}/offer-assistant/regenerate`,
        payload,
      ),
    );
  }

  // ---- AI Content Generator (§15–§22, §34) --------------------------------

  generateContent(payload: ContentRequest): Observable<ContentResult> {
    return this.data(
      this.http.post<ApiEnvelope<ContentResult>>(`${this.base}/content/generate`, payload),
    );
  }

  regenerateContent(payload: ContentRequest): Observable<ContentResult> {
    return this.data(
      this.http.post<ApiEnvelope<ContentResult>>(`${this.base}/content/regenerate`, payload),
    );
  }

  // ---- Improve an existing offer (§14) ------------------------------------

  improveOffer(payload: ImproveRequest): Observable<ImproveResult> {
    return this.data(
      this.http.post<ApiEnvelope<ImproveResult>>(`${this.base}/offer/improve`, payload),
    );
  }

  // ---- Usage and history (§32, §33) ---------------------------------------

  usage(shopId?: number, months = 6): Observable<AiUsage> {
    let params = new HttpParams().set('months', String(months));
    if (shopId) params = params.set('shopId', String(shopId));
    return this.data(this.http.get<ApiEnvelope<AiUsage>>(`${this.base}/usage`, { params }));
  }

  history(query: Record<string, unknown> = {}): Observable<Page<AiHistoryEntry>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      params = params.set(key, String(value));
    }
    return this.http
      .get<ApiEnvelope<AiHistoryEntry[]>>(`${this.base}/history`, { params })
      .pipe(
        map((response) => ({
          items: response.data,
          meta: response.meta ?? {
            page: 1,
            limit: response.data.length,
            total: response.data.length,
            totalPages: 1,
            hasNext: false,
          },
        })),
      );
  }

  historyDetail(id: number): Observable<AiHistoryDetail> {
    return this.data(this.http.get<ApiEnvelope<AiHistoryDetail>>(`${this.base}/history/${id}`));
  }

  /** Records whether the admin used the suggestion (§33). Fire and forget. */
  setHistoryOutcome(
    id: number,
    outcome: 'accepted' | 'rejected',
    offerId?: number | null,
  ): Observable<{ id: number; outcome: string }> {
    return this.data(
      this.http.patch<ApiEnvelope<{ id: number; outcome: string }>>(`${this.base}/history/${id}`, {
        outcome,
        offerId: offerId ?? null,
      }),
    );
  }

  status(): Observable<AiServiceStatus> {
    return this.data(this.http.get<ApiEnvelope<AiServiceStatus>>(`${this.base}/status`));
  }

  // ---- Subscription plans (§3) --------------------------------------------

  plans(): Observable<SubscriptionPlan[]> {
    return this.data(
      this.http.get<ApiEnvelope<SubscriptionPlan[]>>(`${this.subscriptionsBase}/plans`),
    );
  }

  updatePlan(id: number, payload: Partial<SubscriptionPlan>): Observable<SubscriptionPlan> {
    return this.data(
      this.http.put<ApiEnvelope<SubscriptionPlan>>(`${this.subscriptionsBase}/plans/${id}`, payload),
    );
  }

  shopSubscription(shopId: number): Observable<ShopSubscription> {
    return this.data(
      this.http.get<ApiEnvelope<ShopSubscription>>(`${this.subscriptionsBase}/shops/${shopId}`),
    );
  }

  setShopPlan(
    shopId: number,
    payload: { planId: number; status?: string; expiresAt?: string | null; notes?: string | null },
  ): Observable<ShopSubscription> {
    return this.data(
      this.http.put<ApiEnvelope<ShopSubscription>>(
        `${this.subscriptionsBase}/shops/${shopId}`,
        payload,
      ),
    );
  }
}
