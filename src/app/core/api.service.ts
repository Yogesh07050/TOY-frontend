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

  // ---- V2: claims ----------------------------------------------------------

  listClaims(query: Record<string, unknown> = {}): Observable<Page<Claim>> {
    return this.page<Claim>(`${this.base}/claims`, query);
  }

  claimOffer(offerId: number): Observable<Claim> {
    return this.data(this.http.post<ApiEnvelope<Claim>>(`${this.base}/claims/${offerId}`, {}));
  }

  lookupClaim(code: string): Observable<Claim> {
    return this.data(this.http.get<ApiEnvelope<Claim>>(`${this.base}/claims/lookup/${code}`));
  }

  redeemClaim(code: string): Observable<Claim> {
    return this.data(
      this.http.post<ApiEnvelope<Claim>>(`${this.base}/claims/lookup/${code}/redeem`, {}),
    );
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

  // ---- Uploads ------------------------------------------------------------

  uploadImage(
    type: 'offers' | 'shops' | 'categories' | 'avatars' | 'banners',
    file: File,
  ): Observable<UploadResult> {
    const form = new FormData();
    form.append('image', file);
    return this.data(this.http.post<ApiEnvelope<UploadResult>>(`${this.base}/uploads/${type}`, form));
  }
}
