/** Shared API contracts. These mirror the shapes the Express layer returns. */

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: PageMeta;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  unread?: number;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export interface ShopMembership {
  shopId: number;
  shopName: string;
  shopSlug: string;
  shopLogoUrl: string | null;
  branchId: number | null;
  designation: string | null;
  roleName: string | null;
  permissions: string[];
}

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  preferredLocation: PreferredLocation | null;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  /** True when the user administers anything at all (any shop, or globally). */
  canAccessAdmin: boolean;
  /**
   * Shop-scoped roles the user holds that are inert because they have not been
   * assigned to a shop yet - surfaced so the situation is explained, not silent.
   */
  unassignedShopRoles: string[];
  shops: ShopMembership[];
  unreadNotifications?: number;
}

export interface PreferredLocation {
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface AuthSession {
  user: CurrentUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive';
  emailVerified: boolean;
  avatarUrl: string | null;
  preferredLocation: PreferredLocation;
  lastLoginAt: string | null;
  createdAt: string;
  roles: { id: number; name: string }[];
  shops: { id: number; name: string }[];
  memberships?: UserMembership[];
}

export interface UserMembership {
  id: number;
  shopId: number;
  shopName: string;
  branchId: number | null;
  branchName: string | null;
  designation: string | null;
  status: string;
  roleName: string | null;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  /** 'shop' roles only take effect for shops the holder is a member of. */
  scope: 'global' | 'shop';
  status: 'active' | 'inactive';
  isSystem: boolean;
  userCount?: number;
  permissions: { id: number; name: string }[];
}

export interface Permission {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  isBuiltIn: boolean;
  roleCount?: number;
}

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  imageUrl: string | null;
  parentId: number | null;
  status: 'active' | 'inactive';
  offerCount?: number;
  shopCount?: number;
  isFollowing?: boolean;
  /** Only returned by the "categories I follow" endpoint. */
  activeOfferCount?: number;
  followedAt?: string;
}

export interface Branch {
  id: number;
  shopId: number;
  branchName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  contactNumber: string | null;
  isPrimary: boolean;
  status: 'active' | 'inactive';
  offerCount?: number;
  distanceKm: number | null;
}

export interface Shop {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  contactNumber: string | null;
  email: string | null;
  websiteUrl: string | null;
  socialLinks: Record<string, string> | null;
  status: 'active' | 'inactive';
  branchCount?: number;
  activeOfferCount?: number;
  followerCount?: number;
  isFollowing?: boolean;
  distanceKm: number | null;
  city: string | null;
  categories: { id: number; name: string; slug: string }[];
  branches?: Branch[];
  rating?: RatingSummary;
}

export interface ShopMember {
  id: number;
  shopId: number;
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  userStatus: string;
  branchId: number | null;
  branchName: string | null;
  roleId: number | null;
  roleName: string | null;
  designation: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export type OfferStatus = 'draft' | 'scheduled' | 'active' | 'expired' | 'deactivated';
export type OfferType = 'percentage' | 'flat' | 'buy_x_get_y' | 'price_drop' | 'up_to' | 'other';
export type DiscountType = 'percentage' | 'flat' | 'none';
export type ApplicabilityType = 'shop_wide' | 'selected_branches' | 'online';

export interface RatingSummary {
  count: number;
  average: number | null;
}

export interface OfferImage {
  id: number;
  url: string;
  thumbnailUrl: string | null;
  displayOrder: number;
}

export interface Offer {
  id: number;
  title: string;
  productName: string | null;
  description: string | null;
  offerText: string | null;
  offerType: OfferType;
  discountType: DiscountType;
  discountValue: number | null;
  originalPrice: number | null;
  discountedPrice: number | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  minPurchase: number | null;
  termsConditions: string | null;
  eligibility: string | null;
  usageRestrictions: string | null;
  applicableProducts: string | null;
  isRecurring: boolean;
  recurrenceType: string | null;
  startDate: string;
  endDate: string;
  status: OfferStatus;
  applicabilityType: ApplicabilityType;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  viewCount: number;
  clickCount: number;
  favoriteCount: number;
  distanceKm: number | null;
  locationLabel: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  shop: {
    id: number;
    name: string;
    slug: string;
    logoUrl: string | null;
    description?: string | null;
    contactNumber?: string | null;
  };
  category: { id: number; name: string; slug: string } | null;
  subcategory?: { id: number; name: string } | null;
  createdBy?: { id: number; name: string } | null;
  updatedBy?: { id: number; name: string } | null;
  images?: OfferImage[];
  branches?: Branch[];
  branchIds?: number[];
  rating?: RatingSummary;
}

export interface OfferQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  categoryId?: number;
  shop?: string;
  shopId?: number;
  branchId?: number;
  city?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  minDiscount?: number;
  maxDiscount?: number;
  offerType?: OfferType;
  status?: OfferStatus | 'all';
  expiringInDays?: number;
  favorites?: boolean;
  following?: boolean;
  manage?: boolean;
  sort?: OfferSort;
}

export type OfferSort =
  | 'newest'
  | 'endingSoon'
  | 'highestDiscount'
  | 'mostViewed'
  | 'mostPopular'
  | 'nearest';

export interface OfferPayload {
  shopId: number;
  categoryId?: number | null;
  subcategoryId?: number | null;
  title: string;
  productName?: string | null;
  description?: string | null;
  offerText?: string | null;
  offerType: OfferType;
  discountType: DiscountType;
  discountValue?: number | null;
  originalPrice?: number | null;
  discountedPrice?: number | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  minPurchase?: number | null;
  termsConditions?: string | null;
  eligibility?: string | null;
  usageRestrictions?: string | null;
  applicableProducts?: string | null;
  isRecurring: boolean;
  recurrenceType?: string | null;
  startDate: string;
  endDate: string;
  status: 'draft' | 'scheduled' | 'active';
  applicabilityType: ApplicabilityType;
  branchIds: number[];
  images: { url: string; thumbnailUrl?: string | null }[];
}

// ---------------------------------------------------------------------------
// V2
// ---------------------------------------------------------------------------

export type BannerStatus = 'draft' | 'scheduled' | 'published' | 'expired' | 'deactivated';

export interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  desktopImageUrl: string | null;
  buttonText: string;
  offerId: number;
  offerTitle: string;
  offerText: string | null;
  offerStatus: OfferStatus;
  offerEndDate: string;
  offerImageUrl: string | null;
  shop: { id: number; name: string; slug: string; logoUrl: string | null };
  startDate: string;
  endDate: string;
  status: BannerStatus;
  displayOrder: number;
  /** True when the customer feed would show this right now. */
  isLive: boolean;
  impressionCount: number;
  clickCount: number;
  createdByName?: string | null;
  createdAt: string;
}

export interface BannerPayload {
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  mobileImageUrl?: string | null;
  desktopImageUrl?: string | null;
  offerId: number;
  buttonText: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'scheduled' | 'published' | 'deactivated';
  displayOrder: number;
}

export interface SelectableOffer {
  id: number;
  title: string;
  offerText: string | null;
  status: string;
  endDate: string;
  shopName: string;
}

export interface BannerStat {
  id: number;
  title: string;
  status: BannerStatus;
  offerId: number;
  offerTitle: string;
  shopName: string;
  impressions: number;
  clicks: number;
  ctr: number;
  offerViews: number;
}

/** Urgency bucket computed server-side so every client words it the same. */
export interface EndingBucket {
  key: 'urgent' | 'today' | 'tomorrow' | 'three-days' | 'soon';
  label: string;
}

export interface EndingSoonOffer extends Offer {
  endingBucket: EndingBucket;
}

export interface RecommendedOffer extends Offer {
  score: number;
  /** Human explanation, e.g. "Because you follow this shop". */
  reason: string;
}

export interface Claim {
  id: number;
  code: string;
  status: 'claimed' | 'redeemed' | 'expired' | 'cancelled';
  claimedAt: string;
  redeemedAt: string | null;
  offer: { id: number; title: string; offerText: string | null; endDate: string; imageUrl: string | null };
  shop: { id: number; name: string };
  branch: { id: number; name: string } | null;
  customer?: { id: number; name: string };
}

export interface FunnelStage {
  key: string;
  label: string;
  value: number;
  /** Percentage of the previous stage; null for the first. */
  conversion: number | null;
}

export interface Funnel {
  range: { from: string; to: string };
  stages: FunnelStage[];
  totals: {
    impressions: number;
    views: number;
    saves: number;
    claims: number;
    redemptions: number;
  };
}

export interface GrowthPoint {
  day: string;
  customers: number;
  shops: number;
  offers: number;
  claims: number;
}

export interface Review {
  id: number;
  offerId: number | null;
  shopId: number | null;
  rating: number;
  comment: string | null;
  status: 'pending' | 'approved' | 'rejected';
  user: { id: number; name: string; avatarUrl: string | null };
  offerTitle?: string | null;
  shopName?: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Notifications & analytics
// ---------------------------------------------------------------------------

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string | null;
  entityType: string | null;
  entityId: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  followedShopOffers: boolean;
  followedCategoryOffers: boolean;
  nearbyOffers: boolean;
  favoriteExpiring: boolean;
  offerUpdates: boolean;
  adminAnnouncements: boolean;
}

export interface AnalyticsOverview {
  scope: 'platform' | 'shop';
  shopIds: number[] | null;
  offers: {
    total: number;
    draft: number;
    scheduled: number;
    active: number;
    expired: number;
    deactivated: number;
    expiringSoon: number;
  };
  engagement: {
    views: number;
    clicks: number;
    favorites: number;
    claims: number;
    redemptions: number;
  };
  platform?: {
    totalUsers: number;
    activeUsers: number;
    totalAdmins: number;
    totalCustomers: number;
    totalShops: number;
    activeShops: number;
    totalBranches: number;
    activeBranches: number;
    totalFollows: number;
  };
  shop?: { branches: number; members: number };
}

export interface OfferStat {
  id: number;
  title: string;
  shopName: string;
  views: number;
  clicks: number;
  favorites: number;
}

export interface AnalyticsOffers {
  timeline: { day: string; created: number; views: number; clicks: number; shares: number }[];
  mostViewed: OfferStat[];
  mostPopular: OfferStat[];
  expiringSoon: { id: number; title: string; shopName: string; endDate: string }[];
}

export interface ShopAnalytics {
  shop: { id: number; name: string };
  offers: AnalyticsOverview['offers'];
  engagement: AnalyticsOverview['engagement'];
  branches: { id: number; branchName: string; city: string | null; activeOffers: number; views: number }[];
  mostViewed: OfferStat[];
}

export interface CategoryStat {
  id: number;
  name: string;
  offerCount: number;
  views: number;
  followers: number;
}

export interface LocationStat {
  city: string;
  state: string | null;
  branchCount: number;
  shopCount: number;
  activeOffers: number;
}

export interface ShopStat {
  id: number;
  name: string;
  logoUrl: string | null;
  activeOffers: number;
  views: number;
  followers: number;
}

export interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: { id: number; name: string; email: string } | null;
}

export interface UploadResult {
  url: string;
  thumbnailUrl: string | null;
  width: number;
  height: number;
  bytes: number;
}

// ---------------------------------------------------------------------------
// V3 — subscriptions
// ---------------------------------------------------------------------------

export type PlanKey = 'FREE' | 'BUSINESS' | 'PREMIUM';

/** Feature flag names, mirroring `config/plans.js` on the backend. */
export type FeatureName =
  | 'OFFER_SCHEDULING'
  | 'RECURRING_OFFERS'
  | 'FEATURED_BANNERS'
  | 'BANNER_SCHEDULING'
  | 'ENDING_SOON'
  | 'CAMPAIGNS'
  | 'ANALYTICS_STANDARD'
  | 'ANALYTICS_ADVANCED'
  | 'CUSTOMER_ANALYTICS_BASIC'
  | 'CUSTOMER_ANALYTICS_ADVANCED'
  | 'LOCATION_ANALYTICS_BASIC'
  | 'LOCATION_ANALYTICS_ADVANCED'
  | 'BRANCH_ANALYTICS'
  | 'CATEGORY_INSIGHTS'
  | 'CUSTOMER_TRENDS'
  | 'OFFER_COMPARISON'
  | 'FUNNEL_BASIC'
  | 'FUNNEL_ADVANCED'
  | 'CLAIMS_ANALYTICS'
  | 'CAMPAIGN_ANALYTICS'
  | 'OFFER_INTELLIGENCE'
  | 'ROI_DASHBOARD'
  | 'ANALYTICS_EXPORT'
  | 'NOTIFICATIONS_ADVANCED'
  | 'PRIORITY_SUPPORT'
  | 'PRIORITY_DISCOVERY';

/** `null` for a limit means unlimited. */
export interface PlanLimits {
  offersPerMonth: number | null;
  branches: number | null;
  categories: number | null;
  banners: number | null;
  exportsPerMonth: number | null;
}

export interface Plan {
  key: PlanKey;
  name: string;
  tagline: string;
  description: string;
  price: number;
  currency: string;
  rank: number;
  limits: PlanLimits;
  features: FeatureName[];
  profile: string;
  visibility: { nearMe: string; search: string; discoveryBoost: number };
}

/** A row of the §3 comparison matrix. `false` renders as a cross. */
export interface ComparisonRow {
  label: string;
  values: (string | boolean)[];
}

export interface PlanCatalogue {
  plans: Plan[];
  featureLabels: Record<string, string>;
  comparison: ComparisonRow[];
}

export interface SubscriptionUsage {
  period: string;
  offersThisMonth: number;
  branches: number;
  categories: number;
  banners: number;
  exportsThisMonth: number;
}

export interface Entitlements {
  shopId: number;
  plan: PlanKey;
  planName: string;
  tagline: string;
  price: number;
  currency: string;
  status: 'active' | 'past_due' | 'cancelled' | 'expired';
  billingCycle: 'monthly' | 'yearly';
  paymentStatus: 'not_required' | 'pending' | 'paid' | 'failed';
  startedAt: string;
  renewsAt: string | null;
  cancelledAt: string | null;
  limits: PlanLimits;
  features: FeatureName[];
  profile: string;
  visibility: { nearMe: string; search: string; discoveryBoost: number };
  usage: SubscriptionUsage;
  /** `null` where the plan is unlimited. */
  remaining: {
    offersThisMonth: number | null;
    branches: number | null;
    categories: number | null;
    banners: number | null;
  };
}

export interface SubscriptionEvent {
  id: number;
  fromPlan: PlanKey | null;
  toPlan: PlanKey;
  action: 'created' | 'upgraded' | 'downgraded' | 'renewed' | 'cancelled' | 'reactivated';
  amount: number;
  note: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface Invoice {
  id: number;
  reference: string;
  plan: PlanKey;
  description: string;
  amount: number;
  currency: string;
  status: string;
  issuedAt: string;
}

/** The `details` payload of a PLAN_UPGRADE_REQUIRED error (§31). */
export interface UpgradeRequirement {
  requiredPlan: PlanKey;
  requiredPlanName: string;
  requiredPlanPrice: number;
  feature?: FeatureName;
  currentPlan?: PlanKey | null;
  limit?: number;
  used?: number;
  limitKey?: string;
}

export interface Campaign {
  id: number;
  shopId: number;
  shopName: string | null;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  cost: number | null;
  averageOrderValue: number | null;
  averageMarginPercent: number | null;
  status: 'draft' | 'running' | 'completed' | 'archived';
  offerCount: number;
  bannerCount: number;
  createdAt: string;
  offers?: { id: number; title: string; status: string; endDate: string }[];
}

// ---------------------------------------------------------------------------
// V3 — premium analytics
// ---------------------------------------------------------------------------

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'last90'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom';

/** The shared filter contract from §27. */
export interface AnalyticsFilters {
  preset: DatePreset;
  from?: string;
  to?: string;
  shopId?: number | null;
  branchId?: number | null;
  categoryId?: number | null;
  offerId?: number | null;
  campaignId?: number | null;
  city?: string | null;
  offerType?: string | null;
  discountType?: string | null;
  status?: string | null;
  sort?: string;
  limit?: number;
}

export type Trend = 'up' | 'down' | 'flat';

export interface Kpi {
  key: string;
  label: string;
  value: number;
  previous: number;
  /** Percentage change on the previous period; null when there is no baseline. */
  change: number | null;
  trend: Trend;
  format: string;
  hint: string | null;
}

export interface OverviewAlert {
  key: string;
  icon: string;
  tone: 'info' | 'success' | 'warning';
  message: string;
  entityId?: number;
}

export interface OverviewPoint {
  day: string;
  views: number;
  impressions: number;
  claims: number;
  redemptions: number;
  newCustomers: number;
}

export interface PremiumOverview {
  range: { from: string; to: string; previousFrom: string; previousTo: string };
  kpis: Kpi[];
  totals: Record<string, number>;
  previousTotals: Record<string, number>;
  timeline: OverviewPoint[];
  alerts: OverviewAlert[];
}

export interface OfferRates {
  impressionToView: number | null;
  viewToSave: number | null;
  viewToClaim: number | null;
  claimToRedemption: number | null;
  viewToRedemption: number | null;
  engagement: number | null;
}

export interface OfferPerformanceRow {
  id: number;
  title: string;
  status: OfferStatus;
  offerType: string;
  discountType: string;
  discountValue: number | null;
  category: string | null;
  shopName: string;
  startDate: string;
  endDate: string;
  impressions: number;
  views: number;
  clicks: number;
  shares: number;
  saves: number;
  claims: number;
  redemptions: number;
  rates: OfferRates;
}

export interface OfferPerformance {
  range: { from: string; to: string };
  offers: OfferPerformanceRow[];
  totals: Record<string, number>;
  rates: OfferRates;
}

export interface PremiumFunnelStage {
  key: string;
  label: string;
  value: number;
  /** The stage this one converts from — not always the one drawn above it. */
  from: string | null;
  conversion: number | null;
  dropOff: number | null;
  shareOfTop: number | null;
}

export interface PremiumFunnel {
  range: { from: string; to: string };
  stages: PremiumFunnelStage[];
  totals: Record<string, number>;
  rates: Omit<OfferRates, 'engagement'>;
  biggestDropOff: { stage: string; label: string; conversion: number } | null;
}

export interface LocationRow {
  city: string;
  views: number;
  claims: number;
  redemptions: number;
  customers: number;
  conversion: number | null;
}

export interface LocationInsights {
  range: { from: string; to: string };
  locations: LocationRow[];
  heatmap: { latitude: number; longitude: number; weight: number }[];
  branches: { id: number; branchName: string; city: string | null; latitude: number | null; longitude: number | null }[];
  radius: { withinKm: number; views: number; customers: number }[] | null;
  highlights: { mostActive: LocationRow | null; highestConverting: LocationRow | null };
}

export interface BranchRow {
  id: number;
  branchName: string;
  city: string | null;
  isPrimary: boolean;
  activeOffers: number;
  views: number;
  customers: number;
  claims: number;
  redemptions: number;
  conversion: number | null;
  topOffer: { id: number; title: string; views: number } | null;
}

export interface BranchPerformance {
  range: { from: string; to: string };
  branches: BranchRow[];
  winners: {
    bestPerforming: BranchRow | null;
    highestConversion: BranchRow | null;
    mostViewed: BranchRow | null;
    mostRedemptions: BranchRow | null;
  };
}

export interface CustomerInsights {
  range: { from: string; to: string };
  totals: {
    reach: number;
    newCustomers: number;
    returningCustomers: number;
    savingCustomers: number;
    claimingCustomers: number;
    redeemingCustomers: number;
  };
  split: { newPercent: number | null; returningPercent: number | null };
  interests: { category: string; interactions: number; percent: number | null }[];
  visitFrequency: { bucket: string; customers: number; percent: number | null }[];
  segments: { key: string; label: string; customers: number }[];
}

export interface Acquisition {
  range: { from: string; to: string; previousFrom: string; previousTo: string };
  newCustomers: number;
  previousNewCustomers: number;
  growth: number | null;
  trend: Trend;
  timeline: { day: string; customers: number }[];
  funnel: FunnelStage[];
}

export interface Retention {
  range: { from: string; to: string };
  customers: number;
  returningRate: number | null;
  repeatClaimRate: number | null;
  repeatRedemptionRate: number | null;
  averageVisitsPerCustomer: number;
  timeline: { month: string; active: number; returning: number; returningRate: number | null }[];
}

export interface CampaignBannerRow {
  id: number;
  title: string;
  status: string;
  campaignId: number | null;
  campaignName: string | null;
  offerId: number;
  offerTitle: string;
  shopName: string;
  impressions: number;
  clicks: number;
  ctr: number | null;
  reach: number;
  offerViews: number;
  offerClaims: number;
  offerRedemptions: number;
}

export interface CampaignRow {
  id: number;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  cost: number | null;
  impressions: number;
  clicks: number;
  ctr: number | null;
  reach: number;
  offerViews: number;
  offerClaims: number;
  offerRedemptions: number;
  banners: number;
}

export interface CampaignPerformance {
  range: { from: string; to: string };
  banners: CampaignBannerRow[];
  campaigns: CampaignRow[];
  winners: Record<string, (CampaignRow & CampaignBannerRow) | null>;
}

export interface ComparisonOffer {
  id: number;
  title: string;
  offerType: string;
  discountType: string;
  discountValue: number | null;
  status: string;
  impressions: number;
  views: number;
  saves: number;
  shares: number;
  claims: number;
  redemptions: number;
  conversion: number | null;
  redemptionRate: number | null;
}

export interface OfferComparison {
  range: { from: string; to: string };
  offers: ComparisonOffer[];
  /** Which offer wins each metric, so the UI can highlight the strongest cell. */
  metrics: { key: string; bestOfferId: number | null }[];
  best: ComparisonOffer | null;
}

export interface DiscountBand {
  band: string;
  offers: number;
  views: number;
  claims: number;
  redemptions: number;
  conversion: number | null;
  sampleSize: number;
}

export interface DiscountEffectiveness {
  range: { from: string; to: string };
  bands: DiscountBand[];
  offerTypes: (DiscountBand & { offerType: string; label: string })[];
  hasEnoughData: boolean;
  observation: string | null;
}

export interface BestTime {
  lookbackDays: number;
  hasEnoughData: boolean;
  message: string | null;
  days: { day: string; views: number; averageViews: number; rating: number }[];
  hours: { hour: number; views: number; claims: number; conversion: number | null }[];
  bestDay: { day: string; views: number; averageViews: number; rating: number } | null;
  bestWindow: { fromHour: number; toHour: number; views: number } | null;
  averages: { views: number; claims: number; conversion: number | null } | null;
}

export interface EndingSoonOpportunity {
  id: number;
  title: string;
  offerText: string | null;
  shopName: string;
  endDate: string;
  hoursLeft: number;
  views: number;
  recentViews: number;
  saves: number;
  claims: number;
  classification: 'high-priority' | 'needs-attention';
  recommendation: string;
  actions: string[];
}

export interface OfferHealthRow {
  id: number;
  title: string;
  status: string;
  endDate: string;
  score: number;
  level: string;
  views: number;
  saves: number;
  claims: number;
  redemptions: number;
  /** Why the score is what it is — §20 requires the score to be explained. */
  reasons: { label: string; good: boolean; detail: string }[];
}

export interface MerchantRecommendation {
  key: string;
  kind: string;
  icon: string;
  title: string;
  body: string;
  action: string;
  entityId?: number;
  evidence: { metric: string; value: number; comparedTo?: number };
}

export interface CategoryInsights {
  range: { from: string; to: string };
  categories: { id: number; name: string; customerInterest: number; previousInterest: number; change: number | null; trend: Trend }[];
  yourCategories: { id: number; name: string; offers: number; views: number }[];
  popularOfferTypes: { offerType: string; offers: number; views: number }[];
  hasEnoughData: boolean;
  note: string;
}

export interface RoiCampaign {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  claims: number;
  redemptions: number;
  cost: number | null;
  averageOrderValue: number | null;
  averageMarginPercent: number | null;
  estimatedOrders: number;
  estimatedRevenue: number;
  estimatedGrossProfit: number | null;
  estimatedRoi: number;
  estimated: true;
}

export interface Roi {
  range: { from: string; to: string };
  campaigns: RoiCampaign[];
  /** Campaigns the merchant has not given cost/order-value figures for yet. */
  needsInput: (Omit<RoiCampaign, 'estimatedOrders' | 'estimatedRevenue' | 'estimatedGrossProfit' | 'estimatedRoi' | 'estimated'> & { missing: string[] })[];
  hasEnoughData: boolean;
  disclaimer: string;
}

/** Everything the Offer Intelligence page needs, in one round trip. */
export interface OfferIntelligence {
  discountEffectiveness: DiscountEffectiveness;
  bestTime: BestTime;
  endingSoon: { withinHours: number; offers: EndingSoonOpportunity[] };
  health: { range: { from: string; to: string }; offers: OfferHealthRow[]; hasEnoughData: boolean };
  recommendations: { items: MerchantRecommendation[]; hasEnoughData: boolean };
}

export interface ReportType {
  key: string;
  label: string;
  description: string;
}
