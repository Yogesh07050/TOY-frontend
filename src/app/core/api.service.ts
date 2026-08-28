import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  AnalyticsOffers,
  Banner,
  BannerPayload,
  BannerStat,
  Claim,
  ClaimAudit,
  ClaimKind,
  ClaimVerification,
  RedemptionSummary,
  VerificationBudget,
  EndingSoonOffer,
  Funnel,
  GrowthPoint,
  RecommendedOffer,
  SelectableOffer,
  AnalyticsOverview,
  ApiEnvelope,
  AppNotification,
  AuditLog,
  Branch,
  GeoPlace,
  Category,
  CategoryStat,
  LocationStat,
  ManagedUser,
  NotificationPreferences,
  Offer,
  OfferPayload,
  OfferQuery,
  Page,
  Permission,
  PreferredLocation,
  Review,
  Role,
  Shop,
  ShopAnalytics,
  ShopMember,
  ShopStat,
  UploadResult,
  Acquisition,
  CatalogueFeature,
  CheckoutSession,
  FeatureOverride,
  FeatureOverrideEvent,
  FeatureOverrideSummary,
  PaymentTransaction,
  ShopOverrideOverview,
  AnalyticsFilters,
  BestTime,
  BranchPerformance,
  Campaign,
  CampaignPerformance,
  CategoryInsights,
  CustomerInsights,
  DiscountEffectiveness,
  Entitlements,
  Invoice,
  LocationInsights,
  OfferComparison,
  OfferIntelligence,
  OfferPerformance,
  PlanCatalogue,
  PlanKey,
  PremiumFunnel,
  PremiumOverview,
  ReportType,
  Retention,
  Roi,
  SubscriptionEvent,
  Service,
  ServiceAnalyticsOverview,
  ServiceBooking,
  ServiceBranchRow,
  ServiceCategoryInsightRow,
  ServiceComparisonRow,
  ServiceCustomerInsights,
  ServiceFunnelStage,
  ServiceLocationRow,
  ServiceOffer,
  ServiceOfferClaim,
  ServiceOfferPayload,
  ServiceOfferPerformanceSplit,
  ServicePayload,
  ServicePerformance,
  ServiceQuery,
  UnifiedListing,
} from './models';

/** Drops undefined/null/empty values so the query string stays clean. */
function toParams(query: Record<string, unknown> = {}): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) params = params.set(key, value.join(','));
    } else {
      params = params.set(key, String(value));
    }
  }
  return params;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  private page<T>(url: string, query: Record<string, unknown>): Observable<Page<T>> {
    return this.http
      .get<ApiEnvelope<T[]>>(url, { params: toParams(query) })
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

  private data<T>(source: Observable<ApiEnvelope<T>>): Observable<T> {
    return source.pipe(map((response) => response.data));
  }

  // ---- Offers -------------------------------------------------------------

  listOffers(query: OfferQuery): Observable<Page<Offer>> {
    return this.page<Offer>(`${this.base}/offers`, query as Record<string, unknown>);
  }

  getOffer(id: number, position?: PreferredLocation | null): Observable<Offer> {
    return this.data(
      this.http.get<ApiEnvelope<Offer>>(`${this.base}/offers/${id}`, {
        params: toParams({ latitude: position?.latitude, longitude: position?.longitude }),
      }),
    );
  }

  createOffer(payload: OfferPayload): Observable<Offer> {
    return this.data(this.http.post<ApiEnvelope<Offer>>(`${this.base}/offers`, payload));
  }

  updateOffer(id: number, payload: OfferPayload): Observable<Offer> {
    return this.data(this.http.put<ApiEnvelope<Offer>>(`${this.base}/offers/${id}`, payload));
  }

  setOfferStatus(id: number, status: string): Observable<Offer> {
    return this.data(
      this.http.patch<ApiEnvelope<Offer>>(`${this.base}/offers/${id}/status`, { status }),
    );
  }

  deleteOffer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/offers/${id}`);
  }

  /** Records a view/click/share. Fire-and-forget; failures are not surfaced. */
  trackOffer(id: number, event: 'view' | 'click' | 'share', branchId?: number): Observable<void> {
    return this.http.post<void>(`${this.base}/offers/${id}/track`, { event, branchId });
  }

  // ---- Shops --------------------------------------------------------------

  listShops(query: Record<string, unknown>): Observable<Page<Shop>> {
    return this.page<Shop>(`${this.base}/shops`, query);
  }

  getShop(idOrSlug: string | number, position?: PreferredLocation | null): Observable<Shop> {
    return this.data(
      this.http.get<ApiEnvelope<Shop>>(`${this.base}/shops/${idOrSlug}`, {
        params: toParams({ latitude: position?.latitude, longitude: position?.longitude }),
      }),
    );
  }

  createShop(payload: Partial<Shop> & { categoryIds?: number[] }): Observable<Shop> {
    return this.data(this.http.post<ApiEnvelope<Shop>>(`${this.base}/shops`, payload));
  }

  updateShop(id: number, payload: Partial<Shop> & { categoryIds?: number[] }): Observable<Shop> {
    return this.data(this.http.put<ApiEnvelope<Shop>>(`${this.base}/shops/${id}`, payload));
  }

  deleteShop(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/shops/${id}`);
  }

  listBranches(shopId: number): Observable<Branch[]> {
    return this.data(this.http.get<ApiEnvelope<Branch[]>>(`${this.base}/shops/${shopId}/branches`));
  }

  createBranch(shopId: number, payload: Partial<Branch>): Observable<Branch> {
    return this.data(
      this.http.post<ApiEnvelope<Branch>>(`${this.base}/shops/${shopId}/branches`, payload),
    );
  }

  updateBranch(shopId: number, branchId: number, payload: Partial<Branch>): Observable<Branch> {
    return this.data(
      this.http.put<ApiEnvelope<Branch>>(`${this.base}/shops/${shopId}/branches/${branchId}`, payload),
    );
  }

  deactivateBranch(shopId: number, branchId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/shops/${shopId}/branches/${branchId}`);
  }

  // ---- Geocoding for the map picker (§5, §26) -----------------------------

  /**
   * Address -> candidate places. Routed through our API rather than straight
   * at the geocoder so the whole application shares one rate-limit budget and
   * sends the identifying User-Agent its usage policy requires.
   */
  searchPlaces(query: string, limit = 5): Observable<GeoPlace[]> {
    return this.data(
      this.http.get<ApiEnvelope<GeoPlace[]>>(`${this.base}/geo/search`, {
        params: toParams({ q: query, limit }),
      }),
    );
  }

  /** Coordinates -> address, for when the merchant has moved the pin (§10). */
  reverseGeocode(latitude: number, longitude: number): Observable<GeoPlace | null> {
    return this.data(
      this.http.get<ApiEnvelope<GeoPlace | null>>(`${this.base}/geo/reverse`, {
        params: toParams({ latitude, longitude }),
      }),
    );
  }

  listMembers(shopId: number): Observable<ShopMember[]> {
    return this.data(this.http.get<ApiEnvelope<ShopMember[]>>(`${this.base}/shops/${shopId}/members`));
  }

  addMember(shopId: number, payload: Record<string, unknown>): Observable<ShopMember> {
    return this.data(
      this.http.post<ApiEnvelope<ShopMember>>(`${this.base}/shops/${shopId}/members`, payload),
    );
  }

  updateMember(shopId: number, memberId: number, payload: Record<string, unknown>) {
    return this.data(
      this.http.put<ApiEnvelope<ShopMember>>(`${this.base}/shops/${shopId}/members/${memberId}`, payload),
    );
  }

  removeMember(shopId: number, memberId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/shops/${shopId}/members/${memberId}`);
  }

  // ---- Categories ---------------------------------------------------------

  listCategories(query: Record<string, unknown> = {}): Observable<Category[]> {
    return this.data(
      this.http.get<ApiEnvelope<Category[]>>(`${this.base}/categories`, { params: toParams(query) }),
    );
  }

  createCategory(payload: Partial<Category>): Observable<Category> {
    return this.data(this.http.post<ApiEnvelope<Category>>(`${this.base}/categories`, payload));
  }

  updateCategory(id: number, payload: Partial<Category>): Observable<Category> {
    return this.data(this.http.put<ApiEnvelope<Category>>(`${this.base}/categories/${id}`, payload));
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/categories/${id}`);
  }

  // ---- Favourites & follows ----------------------------------------------

  listFavorites(query: OfferQuery = {}): Observable<Page<Offer>> {
    return this.page<Offer>(`${this.base}/favorites`, query as Record<string, unknown>);
  }

  addFavorite(offerId: number): Observable<void> {
    return this.http.post(`${this.base}/favorites/${offerId}`, {}).pipe(map(() => undefined));
  }

  removeFavorite(offerId: number) {
    return this.http.delete<void>(`${this.base}/favorites/${offerId}`);
  }

  listFollowedShops(): Observable<Shop[]> {
    return this.data(this.http.get<ApiEnvelope<Shop[]>>(`${this.base}/following/shops`));
  }

  followShop(shopId: number): Observable<void> {
    return this.http.post(`${this.base}/following/shops/${shopId}`, {}).pipe(map(() => undefined));
  }

  unfollowShop(shopId: number) {
    return this.http.delete<void>(`${this.base}/following/shops/${shopId}`);
  }

  listFollowedCategories(): Observable<Category[]> {
    return this.data(this.http.get<ApiEnvelope<Category[]>>(`${this.base}/following/categories`));
  }

  followCategory(categoryId: number): Observable<void> {
    return this.http
      .post(`${this.base}/following/categories/${categoryId}`, {})
      .pipe(map(() => undefined));
  }

  unfollowCategory(categoryId: number) {
    return this.http.delete<void>(`${this.base}/following/categories/${categoryId}`);
  }

  // ---- Reviews ------------------------------------------------------------

  listOfferReviews(offerId: number, query: Record<string, unknown> = {}): Observable<Page<Review>> {
    return this.page<Review>(`${this.base}/offers/${offerId}/reviews`, query);
  }

  submitReview(offerId: number, rating: number, comment: string | null): Observable<Review> {
    return this.data(
      this.http.post<ApiEnvelope<Review>>(`${this.base}/offers/${offerId}/reviews`, { rating, comment }),
    );
  }

  listReviews(query: Record<string, unknown> = {}): Observable<Page<Review>> {
    return this.page<Review>(`${this.base}/reviews`, query);
  }

  moderateReview(id: number, payload: Record<string, unknown>): Observable<Review> {
    return this.data(this.http.put<ApiEnvelope<Review>>(`${this.base}/reviews/${id}`, payload));
  }

  deleteReview(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/reviews/${id}`);
  }

  // ---- Notifications ------------------------------------------------------

  listNotifications(query: Record<string, unknown> = {}): Observable<Page<AppNotification>> {
    return this.page<AppNotification>(`${this.base}/notifications`, query);
  }

  markNotificationRead(id: number) {
    return this.http.patch<ApiEnvelope<unknown>>(`${this.base}/notifications/${id}/read`, {});
  }

  markAllNotificationsRead() {
    return this.http.patch<ApiEnvelope<{ updated: number }>>(`${this.base}/notifications/read-all`, {});
  }

  deleteNotification(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/notifications/${id}`);
  }

  getNotificationPreferences(): Observable<NotificationPreferences> {
    return this.data(
      this.http.get<ApiEnvelope<NotificationPreferences>>(`${this.base}/notifications/preferences`),
    );
  }

  updateNotificationPreferences(payload: Partial<NotificationPreferences>) {
    return this.data(
      this.http.put<ApiEnvelope<NotificationPreferences>>(
        `${this.base}/notifications/preferences`,
        payload,
      ),
    );
  }

  announce(payload: { title: string; message: string; audience: string }) {
    return this.data(
      this.http.post<ApiEnvelope<{ recipients: number }>>(`${this.base}/notifications/announce`, payload),
    );
  }

  // ---- Users, roles, permissions -----------------------------------------

  listUsers(query: Record<string, unknown> = {}): Observable<Page<ManagedUser>> {
    return this.page<ManagedUser>(`${this.base}/users`, query);
  }

  getUser(id: number): Observable<ManagedUser> {
    return this.data(this.http.get<ApiEnvelope<ManagedUser>>(`${this.base}/users/${id}`));
  }

  updateUser(id: number, payload: Record<string, unknown>): Observable<ManagedUser> {
    return this.data(this.http.put<ApiEnvelope<ManagedUser>>(`${this.base}/users/${id}`, payload));
  }

  setUserStatus(id: number, status: 'active' | 'inactive'): Observable<ManagedUser> {
    return this.data(
      this.http.patch<ApiEnvelope<ManagedUser>>(`${this.base}/users/${id}/status`, { status }),
    );
  }

  /** Shop access managed from the user's side (assigning an Admin to a shop). */
  addUserMembership(userId: number, payload: Record<string, unknown>): Observable<ShopMember> {
    return this.data(
      this.http.post<ApiEnvelope<ShopMember>>(`${this.base}/users/${userId}/memberships`, payload),
    );
  }

  updateUserMembership(
    userId: number,
    membershipId: number,
    payload: Record<string, unknown>,
  ): Observable<ShopMember> {
    return this.data(
      this.http.put<ApiEnvelope<ShopMember>>(
        `${this.base}/users/${userId}/memberships/${membershipId}`,
        payload,
      ),
    );
  }

  removeUserMembership(userId: number, membershipId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/users/${userId}/memberships/${membershipId}`);
  }

  updateProfile(payload: Record<string, unknown>): Observable<ManagedUser> {
    return this.data(this.http.put<ApiEnvelope<ManagedUser>>(`${this.base}/users/me`, payload));
  }

  listRoles(): Observable<Role[]> {
    return this.data(this.http.get<ApiEnvelope<Role[]>>(`${this.base}/roles`));
  }

  createRole(payload: Record<string, unknown>): Observable<Role> {
    return this.data(this.http.post<ApiEnvelope<Role>>(`${this.base}/roles`, payload));
  }

  updateRole(id: number, payload: Record<string, unknown>): Observable<Role> {
    return this.data(this.http.put<ApiEnvelope<Role>>(`${this.base}/roles/${id}`, payload));
  }

  deleteRole(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/roles/${id}`);
  }

  listPermissions(): Observable<Permission[]> {
    return this.data(this.http.get<ApiEnvelope<Permission[]>>(`${this.base}/permissions`));
  }

  createPermission(payload: Record<string, unknown>): Observable<Permission> {
    return this.data(this.http.post<ApiEnvelope<Permission>>(`${this.base}/permissions`, payload));
  }

  updatePermission(id: number, payload: Record<string, unknown>): Observable<Permission> {
    return this.data(this.http.put<ApiEnvelope<Permission>>(`${this.base}/permissions/${id}`, payload));
  }

  deletePermission(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/permissions/${id}`);
  }

  // ---- Analytics & audit --------------------------------------------------

  analyticsOverview(query: Record<string, unknown> = {}): Observable<AnalyticsOverview> {
    return this.data(
      this.http.get<ApiEnvelope<AnalyticsOverview>>(`${this.base}/analytics/overview`, {
        params: toParams(query),
      }),
    );
  }

  analyticsOffers(query: Record<string, unknown> = {}): Observable<AnalyticsOffers> {
    return this.data(
      this.http.get<ApiEnvelope<AnalyticsOffers>>(`${this.base}/analytics/offers`, {
        params: toParams(query),
      }),
    );
  }

  analyticsShop(shopId: number): Observable<ShopAnalytics> {
    return this.data(this.http.get<ApiEnvelope<ShopAnalytics>>(`${this.base}/analytics/shops/${shopId}`));
  }

  analyticsCategories(query: Record<string, unknown> = {}): Observable<CategoryStat[]> {
    return this.data(
      this.http.get<ApiEnvelope<CategoryStat[]>>(`${this.base}/analytics/categories`, {
        params: toParams(query),
      }),
    );
  }

  analyticsLocations(query: Record<string, unknown> = {}): Observable<LocationStat[]> {
    return this.data(
      this.http.get<ApiEnvelope<LocationStat[]>>(`${this.base}/analytics/locations`, {
        params: toParams(query),
      }),
    );
  }

  analyticsShops(query: Record<string, unknown> = {}): Observable<ShopStat[]> {
    return this.data(
      this.http.get<ApiEnvelope<ShopStat[]>>(`${this.base}/analytics/shops`, { params: toParams(query) }),
    );
  }

  listAuditLogs(query: Record<string, unknown> = {}): Observable<Page<AuditLog>> {
    return this.page<AuditLog>(`${this.base}/audit-logs`, query);
  }

  auditFilters(): Observable<{ actions: string[]; entityTypes: string[] }> {
    return this.data(
      this.http.get<ApiEnvelope<{ actions: string[]; entityTypes: string[] }>>(
        `${this.base}/audit-logs/filters`,
      ),
    );
  }

  // ---- V2: customer discovery ---------------------------------------------

  /** Eligible featured banners only - the API applies the offer's validity. */
  featuredBanners(limit = 8): Observable<Banner[]> {
    return this.data(
      this.http.get<ApiEnvelope<Banner[]>>(`${this.base}/discovery/featured`, {
        params: toParams({ limit }),
      }),
    );
  }

  trackBanner(id: number, event: 'impression' | 'click'): Observable<void> {
    return this.http.post<void>(`${this.base}/discovery/featured/${id}/track`, { event });
  }

  endingSoon(query: Record<string, unknown> = {}): Observable<EndingSoonOffer[]> {
    return this.data(
      this.http.get<ApiEnvelope<EndingSoonOffer[]>>(`${this.base}/discovery/ending-soon`, {
        params: toParams(query),
      }),
    );
  }

  nearbyOffers(query: Record<string, unknown>): Observable<Offer[]> {
    return this.data(
      this.http.get<ApiEnvelope<Offer[]>>(`${this.base}/discovery/nearby`, {
        params: toParams(query),
      }),
    );
  }

  recommendedOffers(query: Record<string, unknown> = {}): Observable<RecommendedOffer[]> {
    return this.data(
      this.http.get<ApiEnvelope<RecommendedOffer[]>>(`${this.base}/discovery/recommended`, {
        params: toParams(query),
      }),
    );
  }

  // ---- V2: banner management ----------------------------------------------

  listBanners(query: Record<string, unknown> = {}): Observable<Page<Banner>> {
    return this.page<Banner>(`${this.base}/banners`, query);
  }

  getBanner(id: number): Observable<Banner> {
    return this.data(this.http.get<ApiEnvelope<Banner>>(`${this.base}/banners/${id}`));
  }

  createBanner(payload: BannerPayload): Observable<Banner> {
    return this.data(this.http.post<ApiEnvelope<Banner>>(`${this.base}/banners`, payload));
  }

  updateBanner(id: number, payload: Partial<BannerPayload>): Observable<Banner> {
    return this.data(this.http.put<ApiEnvelope<Banner>>(`${this.base}/banners/${id}`, payload));
  }

  setBannerStatus(id: number, status: string): Observable<Banner> {
    return this.data(
      this.http.patch<ApiEnvelope<Banner>>(`${this.base}/banners/${id}/status`, { status }),
    );
  }

  deleteBanner(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/banners/${id}`);
  }

  /** Offers the caller may attach a banner to. */
  bannerSelectableOffers(search?: string): Observable<SelectableOffer[]> {
    return this.data(
      this.http.get<ApiEnvelope<SelectableOffer[]>>(`${this.base}/banners/selectable-offers`, {
        params: toParams({ search }),
      }),
    );
  }

  bannerAnalytics(query: Record<string, unknown> = {}): Observable<BannerStat[]> {
    return this.data(
      this.http.get<ApiEnvelope<BannerStat[]>>(`${this.base}/banners/analytics`, {
        params: toParams(query),
      }),
    );
  }

  // ---- Claims: the customer's side -----------------------------------------

  listClaims(query: Record<string, unknown> = {}): Observable<Page<Claim>> {
    return this.page<Claim>(`${this.base}/claims`, query);
  }

  getClaim(claimId: number): Observable<Claim> {
    return this.data(this.http.get<ApiEnvelope<Claim>>(`${this.base}/claims/${claimId}`));
  }

  /**
   * Claims an offer. Safe to call twice: while the customer holds a live code
   * for this offer the server returns that same code rather than a second one.
   */
  claimOffer(offerId: number): Observable<Claim> {
    return this.data(this.http.post<ApiEnvelope<Claim>>(`${this.base}/claims/${offerId}`, {}));
  }

  cancelClaim(claimId: number): Observable<Claim> {
    return this.data(
      this.http.post<ApiEnvelope<Claim>>(`${this.base}/claims/${claimId}/cancel`, {}),
    );
  }

  /** Resolves a QR the customer scanned off their own printed code. */
  resolveClaimQr(token: string): Observable<Claim> {
    return this.data(
      this.http.get<ApiEnvelope<Claim>>(`${this.base}/claims/scan/${encodeURIComponent(token)}`),
    );
  }

  // ---- Claims: the merchant's side -----------------------------------------

  /**
   * Verify Claim. Read-only — it answers "is this coupon good?" and writes
   * nothing. Redeeming is the separate call below, which is what makes the
   * merchant's confirmation an explicit act rather than a side effect of
   * pointing a camera at something.
   */
  verifyClaim(payload: {
    code?: string;
    qrToken?: string;
    method: 'QR_SCAN' | 'CODE_ENTRY';
    branchId?: number | null;
  }): Observable<ClaimVerification> {
    return this.data(
      this.http.post<ApiEnvelope<ClaimVerification>>(`${this.base}/redemptions/verify`, payload),
    );
  }

  redeemClaim(payload: {
    code?: string;
    qrToken?: string;
    method: 'QR_SCAN' | 'CODE_ENTRY';
    branchId?: number | null;
  }): Observable<Claim> {
    return this.data(this.http.post<ApiEnvelope<Claim>>(`${this.base}/redemptions/redeem`, payload));
  }

  /** Records that a verified claim was not honoured, and why. */
  rejectClaim(code: string, reason?: string): Observable<{ recorded: boolean }> {
    return this.data(
      this.http.post<ApiEnvelope<{ recorded: boolean }>>(`${this.base}/redemptions/reject`, {
        code,
        reason,
        method: 'CODE_ENTRY',
      }),
    );
  }

  listRedemptions(query: Record<string, unknown> = {}): Observable<Page<Claim>> {
    return this.page<Claim>(`${this.base}/redemptions`, query);
  }

  listAllClaims(query: Record<string, unknown> = {}): Observable<Page<Claim>> {
    return this.page<Claim>(`${this.base}/redemptions/claims`, query);
  }

  redemptionSummary(shopId?: number): Observable<RedemptionSummary> {
    return this.data(
      this.http.get<ApiEnvelope<RedemptionSummary>>(`${this.base}/redemptions/summary`, {
        params: toParams(shopId ? { shopId } : {}),
      }),
    );
  }

  claimAudit(claimId: number, kind: ClaimKind = 'offer'): Observable<ClaimAudit> {
    return this.data(
      this.http.get<ApiEnvelope<ClaimAudit>>(`${this.base}/redemptions/claims/${claimId}/audit`, {
        params: toParams({ kind }),
      }),
    );
  }

  revokeClaim(claimId: number, reason: string, kind: ClaimKind = 'offer'): Observable<Claim> {
    return this.data(
      this.http.post<ApiEnvelope<Claim>>(
        `${this.base}/redemptions/claims/${claimId}/revoke`,
        { reason },
        { params: toParams({ kind }) },
      ),
    );
  }

  /** How many failed verifications this user has left before the lockout. */
  verificationBudget(): Observable<VerificationBudget> {
    return this.data(
      this.http.get<ApiEnvelope<VerificationBudget>>(`${this.base}/redemptions/attempts`),
    );
  }

  exportRedemptions(
    format: 'csv' | 'xlsx',
    query: Record<string, unknown> = {},
  ): Observable<Blob> {
    return this.http.get(`${this.base}/redemptions/export`, {
      params: toParams({ ...query, format }),
      responseType: 'blob',
    });
  }

  // ---- V2: funnel & growth -------------------------------------------------

  analyticsFunnel(query: Record<string, unknown> = {}): Observable<Funnel> {
    return this.data(
      this.http.get<ApiEnvelope<Funnel>>(`${this.base}/analytics/funnel`, {
        params: toParams(query),
      }),
    );
  }

  analyticsGrowth(query: Record<string, unknown> = {}): Observable<{ timeline: GrowthPoint[] }> {
    return this.data(
      this.http.get<ApiEnvelope<{ timeline: GrowthPoint[] }>>(`${this.base}/analytics/growth`, {
        params: toParams(query),
      }),
    );
  }

  // ---- V3: subscriptions --------------------------------------------------

  /** Plan catalogue, pricing and the §3 comparison matrix. Public. */
  planCatalogue(): Observable<PlanCatalogue> {
    return this.data(this.http.get<ApiEnvelope<PlanCatalogue>>(`${this.base}/subscriptions/plans`));
  }

  /** Entitlements for every shop the caller manages. */
  myEntitlements(): Observable<Entitlements[]> {
    return this.data(this.http.get<ApiEnvelope<Entitlements[]>>(`${this.base}/subscriptions/me`));
  }

  shopEntitlements(shopId: number): Observable<Entitlements> {
    return this.data(
      this.http.get<ApiEnvelope<Entitlements>>(`${this.base}/subscriptions/shops/${shopId}`),
    );
  }

  /**
   * Starts a paid-plan purchase (§3). Returns what Razorpay Checkout needs.
   *
   * This does not change the shop's plan: activation happens when Razorpay's
   * webhook reaches the backend (§7), so nothing the browser reports back can
   * unlock a feature on its own.
   */
  startCheckout(
    shopId: number,
    plan: PlanKey,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
  ): Observable<CheckoutSession> {
    return this.data(
      this.http.post<ApiEnvelope<CheckoutSession>>(
        `${this.base}/subscriptions/shops/${shopId}/checkout`,
        { plan, billingCycle },
      ),
    );
  }

  /**
   * Reports a completed Checkout so the backend can verify its signature.
   * Still not an activation - it only lets the UI stop waiting (§7).
   */
  verifyCheckout(
    shopId: number,
    payload: { paymentId: string; subscriptionId?: string; orderId?: string; signature: string },
  ): Observable<{ verified: boolean; subscriptionStatus: string; message: string }> {
    return this.data(
      this.http.post<ApiEnvelope<{ verified: boolean; subscriptionStatus: string; message: string }>>(
        `${this.base}/subscriptions/shops/${shopId}/checkout/verify`,
        payload,
      ),
    );
  }

  /** Moves to a cheaper plan; takes effect when the paid period ends (§12). */
  downgradePlan(shopId: number, plan: PlanKey, note?: string): Observable<Entitlements> {
    return this.data(
      this.http.post<ApiEnvelope<Entitlements>>(
        `${this.base}/subscriptions/shops/${shopId}/downgrade`,
        { plan, note },
      ),
    );
  }

  cancelSubscription(shopId: number, note?: string): Observable<Entitlements> {
    return this.data(
      this.http.post<ApiEnvelope<Entitlements>>(
        `${this.base}/subscriptions/shops/${shopId}/cancel`,
        { note },
      ),
    );
  }

  /** Payment ledger for the Billing screen (§15). */
  billingHistory(shopId: number): Observable<PaymentTransaction[]> {
    return this.data(
      this.http.get<ApiEnvelope<PaymentTransaction[]>>(
        `${this.base}/subscriptions/shops/${shopId}/billing-history`,
      ),
    );
  }

  subscriptionInvoices(shopId: number): Observable<Invoice[]> {
    return this.data(
      this.http.get<ApiEnvelope<Invoice[]>>(`${this.base}/subscriptions/shops/${shopId}/invoices`),
    );
  }

  subscriptionHistory(shopId: number): Observable<SubscriptionEvent[]> {
    return this.data(
      this.http.get<ApiEnvelope<SubscriptionEvent[]>>(
        `${this.base}/subscriptions/shops/${shopId}/history`,
      ),
    );
  }

  // ---- V3: Super Admin feature overrides (§11C) ---------------------------

  /** The controlled catalogue a Super Admin may grant from (§11D). */
  overrideCatalogue(): Observable<{ features: CatalogueFeature[] }> {
    return this.data(
      this.http.get<ApiEnvelope<{ features: CatalogueFeature[] }>>(
        `${this.base}/feature-overrides/catalogue`,
      ),
    );
  }

  overrideSummary(): Observable<FeatureOverrideSummary> {
    return this.data(
      this.http.get<ApiEnvelope<FeatureOverrideSummary>>(`${this.base}/feature-overrides/summary`),
    );
  }

  listOverrides(query: Record<string, unknown> = {}): Observable<Page<FeatureOverride>> {
    return this.http
      .get<ApiEnvelope<FeatureOverride[]>>(`${this.base}/feature-overrides`, {
        params: toParams(query),
      })
      .pipe(map((response) => ({ items: response.data, meta: response.meta! })));
  }

  overrideHistory(query: Record<string, unknown> = {}): Observable<FeatureOverrideEvent[]> {
    return this.data(
      this.http.get<ApiEnvelope<FeatureOverrideEvent[]>>(`${this.base}/feature-overrides/history`, {
        params: toParams(query),
      }),
    );
  }

  /** One shop: plan, plan features, and everything granted on top (§11C). */
  shopOverrides(shopId: number): Observable<ShopOverrideOverview> {
    return this.data(
      this.http.get<ApiEnvelope<ShopOverrideOverview>>(
        `${this.base}/feature-overrides/shops/${shopId}`,
      ),
    );
  }

  grantOverride(
    shopId: number,
    payload: {
      featureKey: string;
      adminUserId?: number;
      startsAt?: string;
      expiresAt?: string;
      isPermanent?: boolean;
      reason?: string;
    },
  ): Observable<FeatureOverride> {
    return this.data(
      this.http.post<ApiEnvelope<FeatureOverride>>(
        `${this.base}/feature-overrides/shops/${shopId}`,
        payload,
      ),
    );
  }

  revokeOverride(shopId: number, featureKey: string, reason?: string): Observable<FeatureOverride> {
    return this.data(
      this.http.delete<ApiEnvelope<FeatureOverride>>(
        `${this.base}/feature-overrides/shops/${shopId}/${featureKey}`,
        { body: { reason } },
      ),
    );
  }

  /** Platform-wide payment ledger, Super Admin only (§31). */
  allTransactions(query: Record<string, unknown> = {}): Observable<Page<PaymentTransaction>> {
    return this.http
      .get<ApiEnvelope<PaymentTransaction[]>>(`${this.base}/payments/transactions`, {
        params: toParams(query),
      })
      .pipe(map((response) => ({ items: response.data, meta: response.meta! })));
  }

  // ---- V3: campaigns ------------------------------------------------------

  listCampaigns(query: Record<string, unknown> = {}): Observable<Campaign[]> {
    return this.data(
      this.http.get<ApiEnvelope<Campaign[]>>(`${this.base}/campaigns`, { params: toParams(query) }),
    );
  }

  getCampaign(id: number): Observable<Campaign> {
    return this.data(this.http.get<ApiEnvelope<Campaign>>(`${this.base}/campaigns/${id}`));
  }

  createCampaign(payload: Record<string, unknown>): Observable<Campaign> {
    return this.data(this.http.post<ApiEnvelope<Campaign>>(`${this.base}/campaigns`, payload));
  }

  updateCampaign(id: number, payload: Record<string, unknown>): Observable<Campaign> {
    return this.data(this.http.put<ApiEnvelope<Campaign>>(`${this.base}/campaigns/${id}`, payload));
  }

  deleteCampaign(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/campaigns/${id}`);
  }

  // ---- V3: premium analytics ----------------------------------------------

  /**
   * Every premium dashboard shares one filter contract (§27), so they all go
   * through this one helper rather than each rebuilding the query string.
   */
  private premium<T>(path: string, filters: AnalyticsFilters, extra: Record<string, unknown> = {}) {
    return this.data(
      this.http.get<ApiEnvelope<T>>(`${this.base}/analytics/premium/${path}`, {
        params: toParams({ ...filters, ...extra }),
      }),
    );
  }

  premiumOverview(filters: AnalyticsFilters): Observable<PremiumOverview> {
    return this.premium<PremiumOverview>('overview', filters);
  }

  premiumOfferPerformance(filters: AnalyticsFilters): Observable<OfferPerformance> {
    return this.premium<OfferPerformance>('offer-performance', filters);
  }

  premiumFunnel(filters: AnalyticsFilters): Observable<PremiumFunnel> {
    return this.premium<PremiumFunnel>('funnel', filters);
  }

  premiumLocations(filters: AnalyticsFilters): Observable<LocationInsights> {
    return this.premium<LocationInsights>('locations', filters);
  }

  premiumBranches(filters: AnalyticsFilters): Observable<BranchPerformance> {
    return this.premium<BranchPerformance>('branches', filters);
  }

  premiumCustomers(filters: AnalyticsFilters): Observable<CustomerInsights> {
    return this.premium<CustomerInsights>('customers', filters);
  }

  premiumAcquisition(filters: AnalyticsFilters): Observable<Acquisition> {
    return this.premium<Acquisition>('acquisition', filters);
  }

  premiumRetention(filters: AnalyticsFilters): Observable<Retention> {
    return this.premium<Retention>('retention', filters);
  }

  premiumCampaigns(filters: AnalyticsFilters): Observable<CampaignPerformance> {
    return this.premium<CampaignPerformance>('campaigns', filters);
  }

  premiumOfferComparison(filters: AnalyticsFilters, offerIds: number[]): Observable<OfferComparison> {
    return this.premium<OfferComparison>('offer-comparison', filters, {
      offerIds: offerIds.join(','),
    });
  }

  premiumCategoryInsights(filters: AnalyticsFilters): Observable<CategoryInsights> {
    return this.premium<CategoryInsights>('category-insights', filters);
  }

  premiumRoi(filters: AnalyticsFilters): Observable<Roi> {
    return this.premium<Roi>('roi', filters);
  }

  premiumOfferIntelligence(filters: AnalyticsFilters): Observable<OfferIntelligence> {
    return this.premium<OfferIntelligence>('offer-intelligence', filters);
  }

  premiumDiscountEffectiveness(filters: AnalyticsFilters): Observable<DiscountEffectiveness> {
    return this.premium<DiscountEffectiveness>('discount-effectiveness', filters);
  }

  premiumBestTime(filters: AnalyticsFilters): Observable<BestTime> {
    return this.premium<BestTime>('best-time', filters);
  }

  reportTypes(): Observable<{ types: ReportType[]; formats: string[] }> {
    return this.data(
      this.http.get<ApiEnvelope<{ types: ReportType[]; formats: string[] }>>(
        `${this.base}/analytics/premium/reports`,
      ),
    );
  }

  /**
   * Downloads a report. Returned as a Blob rather than JSON so the caller can
   * hand it straight to a download link without a second round trip.
   */
  exportReport(type: string, format: 'csv' | 'xlsx', filters: AnalyticsFilters): Observable<Blob> {
    return this.http.get(`${this.base}/analytics/premium/reports/export`, {
      params: toParams({ ...filters, type, format }),
      responseType: 'blob',
    });
  }

  /** Fire-and-forget client analytics events (§28). */
  trackAnalyticsEvent(event: string, payload: Record<string, unknown> = {}): Observable<void> {
    return this.http.post<void>(`${this.base}/analytics/events`, { event, ...payload });
  }

  // ---- Uploads ------------------------------------------------------------

  uploadImage(
    type: 'offers' | 'shops' | 'categories' | 'avatars' | 'banners' | 'services',
    file: File,
  ): Observable<UploadResult> {
    const form = new FormData();
    form.append('image', file);
    return this.data(this.http.post<ApiEnvelope<UploadResult>>(`${this.base}/uploads/${type}`, form));
  }

  // ---- V4: Services ---------------------------------------------------------

  listServices(query: ServiceQuery): Observable<Page<Service>> {
    return this.page<Service>(`${this.base}/services`, query as Record<string, unknown>);
  }

  getService(id: number, position?: PreferredLocation | null): Observable<Service> {
    return this.data(
      this.http.get<ApiEnvelope<Service>>(`${this.base}/services/${id}`, {
        params: toParams({ latitude: position?.latitude, longitude: position?.longitude }),
      }),
    );
  }

  createService(payload: ServicePayload): Observable<Service> {
    return this.data(this.http.post<ApiEnvelope<Service>>(`${this.base}/services`, payload));
  }

  updateService(id: number, payload: ServicePayload): Observable<Service> {
    return this.data(this.http.put<ApiEnvelope<Service>>(`${this.base}/services/${id}`, payload));
  }

  setServiceStatus(id: number, status: string): Observable<Service> {
    return this.data(
      this.http.patch<ApiEnvelope<Service>>(`${this.base}/services/${id}/status`, { status }),
    );
  }

  duplicateService(id: number): Observable<Service> {
    return this.data(this.http.post<ApiEnvelope<Service>>(`${this.base}/services/${id}/duplicate`, {}));
  }

  deleteService(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/services/${id}`);
  }

  trackService(id: number, event: 'view' | 'click' | 'share' | 'enquire', branchId?: number): Observable<void> {
    return this.http.post<void>(`${this.base}/services/${id}/track`, { event, branchId });
  }

  bookService(
    id: number,
    payload: { branchId?: number | null; serviceOfferId?: number | null; requestedAt?: string | null; notes?: string | null },
  ): Observable<ServiceBooking> {
    return this.data(this.http.post<ApiEnvelope<ServiceBooking>>(`${this.base}/services/${id}/book`, payload));
  }

  updateBookingStatus(id: number, bookingId: number, status: string): Observable<ServiceBooking> {
    return this.data(
      this.http.patch<ApiEnvelope<ServiceBooking>>(`${this.base}/services/${id}/bookings/${bookingId}`, {
        status,
      }),
    );
  }

  // ---- V4: Service offers -----------------------------------------------------

  listServiceOffers(serviceId: number, query: Record<string, unknown> = {}): Observable<Page<ServiceOffer>> {
    return this.page<ServiceOffer>(`${this.base}/services/${serviceId}/offers`, query);
  }

  getServiceOffer(serviceId: number, offerId: number): Observable<ServiceOffer> {
    return this.data(
      this.http.get<ApiEnvelope<ServiceOffer>>(`${this.base}/services/${serviceId}/offers/${offerId}`),
    );
  }

  createServiceOffer(serviceId: number, payload: ServiceOfferPayload): Observable<ServiceOffer> {
    return this.data(
      this.http.post<ApiEnvelope<ServiceOffer>>(`${this.base}/services/${serviceId}/offers`, payload),
    );
  }

  updateServiceOffer(serviceId: number, offerId: number, payload: ServiceOfferPayload): Observable<ServiceOffer> {
    return this.data(
      this.http.put<ApiEnvelope<ServiceOffer>>(`${this.base}/services/${serviceId}/offers/${offerId}`, payload),
    );
  }

  setServiceOfferStatus(serviceId: number, offerId: number, status: string): Observable<ServiceOffer> {
    return this.data(
      this.http.patch<ApiEnvelope<ServiceOffer>>(
        `${this.base}/services/${serviceId}/offers/${offerId}/status`,
        { status },
      ),
    );
  }

  deleteServiceOffer(serviceId: number, offerId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/services/${serviceId}/offers/${offerId}`);
  }

  // ---- Service offer claims: the customer's side ------------------------------
  //
  // Deliberately no lookup or redeem here. Verifying and redeeming are the
  // merchant's business and go through `/redemptions`, which resolves either
  // kind from the code alone - a shopkeeper never picks a tab before scanning.

  listServiceClaims(query: Record<string, unknown> = {}): Observable<Page<Claim>> {
    return this.page<Claim>(`${this.base}/service-offer-claims`, query);
  }

  getServiceClaim(claimId: number): Observable<Claim> {
    return this.data(
      this.http.get<ApiEnvelope<Claim>>(`${this.base}/service-offer-claims/${claimId}`),
    );
  }

  claimServiceOffer(serviceOfferId: number): Observable<Claim> {
    return this.data(
      this.http.post<ApiEnvelope<Claim>>(`${this.base}/service-offer-claims/${serviceOfferId}`, {}),
    );
  }

  cancelServiceClaim(claimId: number): Observable<Claim> {
    return this.data(
      this.http.post<ApiEnvelope<Claim>>(`${this.base}/service-offer-claims/${claimId}/cancel`, {}),
    );
  }

  resolveServiceClaimQr(token: string): Observable<Claim> {
    return this.data(
      this.http.get<ApiEnvelope<Claim>>(
        `${this.base}/service-offer-claims/scan/${encodeURIComponent(token)}`,
      ),
    );
  }

  // ---- V4: Saved services -----------------------------------------------------

  listSavedServices(query: ServiceQuery = {}): Observable<Page<Service>> {
    return this.page<Service>(`${this.base}/saved-services`, query as Record<string, unknown>);
  }

  saveService(serviceId: number): Observable<void> {
    return this.http.post(`${this.base}/saved-services/${serviceId}`, {}).pipe(map(() => undefined));
  }

  unsaveService(serviceId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/saved-services/${serviceId}`);
  }

  // ---- V4: Unified discovery ("View Offers" union) -----------------------------

  listUnifiedOffers(query: Record<string, unknown> = {}): Observable<Page<UnifiedListing>> {
    return this.page<UnifiedListing>(`${this.base}/discovery/offers`, query);
  }

  // ---- V4: Service analytics ---------------------------------------------------

  private serviceAnalytics<T>(
    path: string,
    filters: AnalyticsFilters,
    extra: Record<string, unknown> = {},
  ): Observable<T> {
    return this.data(
      this.http.get<ApiEnvelope<T>>(`${this.base}/service-analytics/${path}`, {
        params: toParams({ ...filters, ...extra }),
      }),
    );
  }

  serviceAnalyticsOverview(filters: AnalyticsFilters): Observable<ServiceAnalyticsOverview> {
    return this.serviceAnalytics<ServiceAnalyticsOverview>('overview', filters);
  }

  serviceAnalyticsPerformance(filters: AnalyticsFilters): Observable<ServicePerformance> {
    return this.serviceAnalytics<ServicePerformance>('performance', filters);
  }

  serviceAnalyticsFunnel(filters: AnalyticsFilters): Observable<ServiceFunnelStage[]> {
    return this.serviceAnalytics<ServiceFunnelStage[]>('funnel', filters);
  }

  serviceAnalyticsOfferPerformance(filters: AnalyticsFilters): Observable<ServiceOfferPerformanceSplit> {
    return this.serviceAnalytics<ServiceOfferPerformanceSplit>('offer-performance', filters);
  }

  serviceAnalyticsBranches(filters: AnalyticsFilters): Observable<ServiceBranchRow[]> {
    return this.serviceAnalytics<ServiceBranchRow[]>('branches', filters);
  }

  serviceAnalyticsLocations(filters: AnalyticsFilters): Observable<ServiceLocationRow[]> {
    return this.serviceAnalytics<ServiceLocationRow[]>('locations', filters);
  }

  serviceAnalyticsCustomers(filters: AnalyticsFilters): Observable<ServiceCustomerInsights> {
    return this.serviceAnalytics<ServiceCustomerInsights>('customers', filters);
  }

  serviceAnalyticsCategoryInsights(filters: AnalyticsFilters): Observable<ServiceCategoryInsightRow[]> {
    return this.serviceAnalytics<ServiceCategoryInsightRow[]>('category-insights', filters);
  }

  serviceAnalyticsComparison(filters: AnalyticsFilters, serviceIds: number[]): Observable<ServiceComparisonRow[]> {
    return this.serviceAnalytics<ServiceComparisonRow[]>('comparison', filters, {
      serviceIds: serviceIds.join(','),
    });
  }
}
