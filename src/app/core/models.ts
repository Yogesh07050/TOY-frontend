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
