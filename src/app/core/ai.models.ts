/**
 * Types for the AI Offer Assistant and the AI Content Generator.
 *
 * Kept in their own file rather than added to `models.ts` so the AI feature is
 * a clean addition to the existing app rather than an edit through it.
 */

import { DiscountType, OfferType } from './models';

// ---------------------------------------------------------------------------
// Subscriptions (§3)
// ---------------------------------------------------------------------------

export type PlanCode = 'FREE' | 'BUSINESS' | 'PREMIUM' | string;

export interface SubscriptionPlan {
  id: number;
  code: PlanCode;
  name: string;
  description: string | null;
  priceMonthly: number;
  currency: string;
  aiAssistantEnabled: boolean;
  aiContentEnabled: boolean;
  aiOptimizerEnabled: boolean;
  historicalInsights: boolean;
  locationInsights: boolean;
  timingInsights: boolean;
  socialCaptionEnabled: boolean;
  /** null means unlimited; 0 means the feature is off for this plan. */
  aiAssistantMonthlyLimit: number | null;
  aiContentMonthlyLimit: number | null;
  aiOptimizerMonthlyLimit: number | null;
  displayOrder: number;
  isSystem: boolean;
  status: 'active' | 'inactive';
}

export interface ShopSubscription {
  shop: { id: number; name: string; slug: string } | null;
  plan: SubscriptionPlan;
  /** 'subscription' | 'lapsed' | 'default' — why the shop is on this plan. */
  source: string;
  startedAt: string | null;
  expiresAt: string | null;
}

export type AiFeature = 'AI_OFFER_ASSISTANT' | 'AI_CONTENT_GENERATOR' | 'AI_OFFER_OPTIMIZER';

export interface AiFeatureStatus {
  feature: AiFeature;
  label: string;
  enabled: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  unlimited: boolean;
  exhausted: boolean;
}

export interface AiCapabilities {
  shopId: number;
  plan: SubscriptionPlan;
  planSource: string;
  expiresAt: string | null;
  features: Record<AiFeature, AiFeatureStatus>;
  insights: { historical: boolean; location: boolean; timing: boolean };
  sections: { socialCaption: boolean };
}

// ---------------------------------------------------------------------------
// Assistant (§4–§13)
// ---------------------------------------------------------------------------

export type BusinessGoal =
  | 'increase_sales'
  | 'clear_inventory'
  | 'attract_new_customers'
  | 'win_back_customers'
  | 'promote_new_product'
  | 'weekend_traffic'
  | 'store_visits'
  | 'promote_category'
  | 'other';

export interface AssistantRequest {
  shopId: number;
  goal: BusinessGoal;
  goalLabel?: string | null;
  details?: string | null;
  productOrCategory?: string | null;
  preferredDiscount?: string | null;
  targetCustomer?: string | null;
  locationRadiusKm?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: string | null;
  inventoryNotes?: string | null;
  additionalInstructions?: string | null;
  optionCount?: number;
  /** Regenerate only: ideas the admin has already turned down (§7). */
  previousTitles?: string[];
  refinement?: string | null;
}

/** §11 — an observed reason came from the merchant's own numbers. */
export interface AiReason {
  text: string;
  basis: 'observed' | 'general';
}

export interface AiRecommendation {
  label: string;
  title: string;
  offerText: string | null;
  description: string | null;
  offerType: OfferType;
  discountType: DiscountType;
  discountValue: number | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  productName: string | null;
  categoryName: string | null;
  goal: string | null;
  recommendedDurationDays: number | null;
  recommendedStartDate: string | null;
  recommendedEndDate: string | null;
  recommendedSchedule: string | null;
  targetRadiusKm: number | null;
  reasoning: AiReason[];
  tradeOffs: string[];
}

/** What the offer form is pre-filled with when a recommendation is chosen (§9). */
export interface AiOfferPrefill {
  shopId: number;
  title: string;
  offerText: string | null;
  description: string | null;
  productName: string | null;
  categoryName: string | null;
  offerType: OfferType;
  discountType: DiscountType;
  discountValue: number | null;
  buyQuantity: number | null;
  getQuantity: number | null;
  startDate: string;
  endDate: string;
  targetRadiusKm: number | null;
}

export interface AssistantResult {
  recommendations: AiRecommendation[];
  insufficientData: boolean;
  dataNotes: string[];
  locationInsight: string | null;
  timingInsight: string | null;
  historyId: number | null;
  prefill: AiOfferPrefill[];
  meta?: { provider: string; model: string; warnings?: string[] };
}

// ---------------------------------------------------------------------------
// Content generator (§15–§22, §34)
// ---------------------------------------------------------------------------

export type ContentSection =
  | 'title'
  | 'shortDescription'
  | 'detailedDescription'
  | 'bannerText'
  | 'pushNotification'
  | 'socialCaption';

export type ContentTone = 'professional' | 'friendly' | 'exciting' | 'minimal' | 'urgent';
export type ContentLength = 'short' | 'medium' | 'long';

export interface ContentControls {
  tone: ContentTone;
  length: ContentLength;
  language: string;
  targetAudience?: string | null;
  emoji: boolean;
  callToAction?: string | null;
  additionalNotes?: string | null;
  variants: number;
}

/** The offer the copy is about — either a saved id, or the unsaved form values. */
export interface AiOfferFacts {
  title?: string | null;
  productName?: string | null;
  categoryName?: string | null;
  offerType?: OfferType | null;
  offerText?: string | null;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  originalPrice?: number | null;
  discountedPrice?: number | null;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  minPurchase?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  termsConditions?: string | null;
  eligibility?: string | null;
  usageRestrictions?: string | null;
  applicableProducts?: string | null;
}

export interface ContentRequest {
  shopId: number;
  offerId?: number | null;
  offer?: AiOfferFacts;
  sections: ContentSection[];
  controls: ContentControls;
  previousVersions?: Record<string, string[]>;
  refinement?: string | null;
}

export interface ContentResult {
  sections: Partial<Record<ContentSection, string[]>>;
  suggestedTerms: string[];
  offerId: number | null;
  historyId: number | null;
  /** Requested but not produced because the plan does not include them (§22). */
  skippedSections: ContentSection[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Improve (§14)
// ---------------------------------------------------------------------------

export interface ImproveRequest {
  shopId: number;
  offerId?: number | null;
  offer?: AiOfferFacts;
  controls: ContentControls;
  focus?: string | null;
}

export interface ImproveResult {
  improvements: string[];
  suggestedTitle: string | null;
  suggestedOfferText: string | null;
  suggestedShortDescription: string | null;
  suggestedDescription: string | null;
  offerId: number | null;
  historyId: number | null;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Usage and history (§32, §33)
// ---------------------------------------------------------------------------

export interface AiUsagePoint {
  feature: AiFeature;
  month: string;
  successes: number;
  failures: number;
  tokens: number;
}

export interface AiUsage {
  scope: 'platform' | 'shop';
  shopIds: number[] | null;
  plan: SubscriptionPlan | null;
  features: Record<AiFeature, AiFeatureStatus> | null;
  timeline: AiUsagePoint[];
}

export interface AiHistoryEntry {
  id: number;
  feature: AiFeature;
  shopName: string;
  userName: string | null;
  offerId: number | null;
  offerTitle: string | null;
  request: string | null;
  result: string | null;
  outcome: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface AiHistoryDetail {
  id: number;
  feature: AiFeature;
  offerId: number | null;
  outcome: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  request: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
}

export interface AiServiceStatus {
  reachable: boolean;
  reason?: string;
  provider?: string;
  model?: string;
  providerConfigured?: boolean;
}

export interface AiShop {
  id: number;
  name: string;
  slug: string;
}
