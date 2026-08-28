export type BillingPlan = 'FREE' | 'PREMIUM' | 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY' | 'FREE_PREMIUM' | (string & {});

export type CountrySettings = {
  country_code: string;
  subscription_enabled: boolean;
  credits_enabled: boolean;
  identity_verification_required: boolean;
};

export function isPremiumPlan(plan: BillingPlan | null | undefined): boolean {
  return !!plan && plan !== 'FREE';
}

export function isFreePremiumPlan(plan: BillingPlan | null | undefined): boolean {
  return plan === 'FREE_PREMIUM';
}

export function isActiveSubscription(sub: SubscriptionInfo | null | undefined): boolean {
  return sub?.status === 'ACTIVE';
}

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'NONE';

export type BillingIntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export type PaymentChannel =
  | 'REVENUECAT_APPLE'
  | 'REVENUECAT_GOOGLE'
  | 'ONLINE'
  | 'CHAPA'
  | 'ARIFPAY'
  | 'MANUAL_TRANSFER'
  | 'ONLINE_PAYMENT'
  | 'DIRECT_TELEBIRR';

export type ProductType = 'SUBSCRIPTION' | 'CONSUMABLE';

export type OrderStatus =
  | 'CREATED'
  | 'AWAITING_PAYMENT'
  | 'VERIFICATION_PENDING'
  | 'MANUAL_REVIEW'
  | 'ADMIN_REVIEW'
  | 'REVIEW_REQUIRED'
  | 'RECEIPT_SUBMITTED'
  | 'VERIFIED'
  | 'FULFILLED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type IdentityVerificationStatus =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'VERIFIED'
  | 'FAILED'
  | 'MANUAL_REVIEW';

export type IdentityVerificationResponse = {
  verification_status: IdentityVerificationStatus;
  error_code?: string;
  message: string;
};

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ManualReviewStatus = {
  verification_status: IdentityVerificationStatus;
  review_id?: string;
  review_status?: ReviewStatus;
  submitted_at?: string;
  reviewed_at?: string | null;
  reviewer_note?: string | null;
};

export const ORDER_TERMINAL_STATUSES: OrderStatus[] = [
  'VERIFIED',
  'FULFILLED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
];

export const POLLING_ORDER_STATUSES: OrderStatus[] = [
  'CREATED',
  'AWAITING_PAYMENT',
  'VERIFICATION_PENDING',
  'MANUAL_REVIEW',
  'ADMIN_REVIEW',
  'REVIEW_REQUIRED',
  'RECEIPT_SUBMITTED',
];

export type BillingPlatform = 'IOS' | 'ANDROID' | 'WEB' | 'MOBILE';

export type PaymentChannelOptionDto = {
  channel: PaymentChannel;
  display_name: string;
  active_online_method_code?: string | null;
  display_order?: number;
  method_count?: number;
};

export type SubscriptionProvider =
  | 'GOOGLE_PLAY'
  | 'APPLE_APP_STORE'
  | 'REVENUECAT'
  | 'PROMOTION'
  | 'TELEBIRR'
  | 'CBE_BIRR'
  | 'CHAPA'
  | 'ARIFPAY'
  | 'BANK_TRANSFER'
  | 'STRIPE';

export type SubscriptionInfo = {
  status: SubscriptionStatus;
  provider?: SubscriptionProvider;
  billing_interval_count?: number;
  billing_interval_unit?: BillingIntervalUnit;
  expires_at?: string;
  auto_renew: boolean;
} | null;

/**
 * Merged limit + cost entry for a single action.
 *
 * Replaces the old separate `QuotaInfo` (from `limits`) and `ActionCostInfo`
 * (from `costs`). The backend now returns a single `limits_and_costs` map
 * keyed by UPPER_SNAKE_CASE action codes (LIKE, SUPER_LIKE, …).
 */
export type ActionLimitAndCost = {
  used: number;
  limit: number | null;
  remaining: number | null;
  resets_at: string | null;
  member_credit_cost: number;
  actual_credit_cost: number;
  period_type: string;
  apply_credit_after_limit: boolean;
};

/**
 * @deprecated Use `ActionLimitAndCost` instead. Kept for backward compat with
 * code that hasn't been migrated yet.
 */
export type QuotaInfo = {
  used: number;
  limit: number | null;
  remaining: number | null;
  resets_at?: string;
};

/**
 * @deprecated Use `ActionLimitAndCost` instead.
 */
export type ActionCostInfo = {
  member_credit_cost: number;
  actual_credit_cost: number;
  limit_value: number | null;
  period_type: string;
  apply_credit_after_limit: boolean;
};

export type EntitlementLimitsAndCosts = Record<string, ActionLimitAndCost>;

export type EntitlementCredits = {
  credit_balance: number;
  boosts_available: number;
  super_likes_available: number;
  rewinds_available: number;
};

export type EntitlementFeatures = {
  see_who_liked_you: boolean;
  advanced_filters: boolean;
  incognito_mode: boolean;
};

/**
 * Canonical action codes used as keys in `limits_and_costs`.
 */
export const ACTION_CODES = {
  LIKE: 'LIKE',
  SUPER_LIKE: 'SUPER_LIKE',
  REWIND: 'REWIND',
  BOOST: 'BOOST',
  VOICE_MESSAGE: 'VOICE_MESSAGE',
  IMAGE_MESSAGE: 'IMAGE_MESSAGE',
} as const;

/**
 * @deprecated Use `ACTION_CODES` instead. Kept for backward compat.
 * Old camelCase limit keys (likes, super_likes, …) are no longer returned
 * by the API — use the UPPER_SNAKE_CASE action codes in `ACTION_CODES`.
 */
export const LIMIT_KEYS = {
  LIKES: 'likes',
  SUPER_LIKES: 'super_likes',
  REWINDS: 'rewinds',
  BOOSTS: 'boosts',
  VOICE_CHAT_MSGS: 'voice_chat_msgs',
  IMAGE_CHAT_MSGS: 'image_chat_msgs',
} as const;

export type ActiveBoostInfo = {
  boost_id: string;
  started_at: string;
  expires_at: string;
  remaining_seconds: number;
} | null;

export type PlanLimits = {
  LIKES: number | null;
  SUPERLIKES: number | null;
  REWINDS: number | null;
  BOOSTS: number | null;
  VOICE_CHAT_MSGS: number | null;
  IMAGE_CHAT_MSGS: number | null;
};

export type EntitlementResponse = {
  plan: BillingPlan;
  subscription: SubscriptionInfo;
  limits_and_costs: EntitlementLimitsAndCosts;
  credits: EntitlementCredits;
  active_boost: ActiveBoostInfo;
  features: EntitlementFeatures;
  plan_limits: PlanLimits;
  boost_duration_minutes: number;
  country_settings?: CountrySettings;
};

export type OfferDto = {
  id: string;
  product_code: string;
  product_type: ProductType;
  country_code?: string;
  currency: string;
  price_minor_units: number;
  display_price: string;
  effective_price_minor_units?: number;
  effective_display_price?: string;
  billing_interval_count?: number;
  billing_interval_unit?: BillingIntervalUnit;
  auto_renew: boolean;
  external_product_id?: string;
  revenuecat_offering_id?: string;
  revenuecat_package_id?: string;
  included_credits?: number;
  has_available_payment_methods: boolean;
  available_payment_method_count: number;
  promotion?: OfferPromotionDto | null;
  claimable_promotions?: ClaimablePromotionDto[];
};

export type VerificationField = {
  name: string;
  label: string;
  type: 'text' | 'tel' | 'number' | 'string';
  required: boolean;
  hint?: string;
  pattern?: string;
  max_length?: number;
  min_length?: number;
};

export type VerificationParams = {
  fields: VerificationField[];
};

export type PaymentMethodDto = {
  id: string;
  method_code: string;
  display_name: string;
  payment_channel: PaymentChannel;
  payment_method: string;
  payment_instructions: string | null;
  display_order: number;
  verification_params: VerificationParams | null;
  logo_url?: string | null;
};

export type PaymentOptionsResponse = {
  platform: BillingPlatform;
  billing_country_code: string;
  resolved_market_country_code: string;
  fallback_to_global: boolean;
  active_online_method_code?: string | null;
  payment_methods: PaymentMethodDto[];
};

export type PaymentInstructions = {
  instruction_text: string;
};

export type CreateOrderRequest = {
  payment_offer_id: string;
  payment_method_id: string;
  idempotency_key?: string;
  platform?: BillingPlatform;
  // Chapa-specific: the deep-link the WebView should be redirected to after
  // payment so the app can intercept it and trigger verification automatically.
  return_url?: string;
};

export type VerifyPaymentRequest = {
  verification_fields: Record<string, string>;
  submitted_amount_minor_units: number;
  submitted_currency: string;
};

export type ManualTransferVerifyRequest = {
  payment_offer_id: string;
  payment_method_id: string;
  platform?: BillingPlatform;
  verification_data: Record<string, string>;
  idempotency_key?: string;
};

export type ManualTransferVerifyResponse = {
  order_id: string;
  order_reference: string;
  status: OrderStatus;
  expected_amount_minor_units?: number;
  expected_currency?: string;
  payment_method_display_name?: string;
  expires_at?: string;
};

export type OrderResponse = {
  id: string;
  order_reference: string;
  status: OrderStatus;
  status_reason?: string | null;
  payment_offer_id?: string;
  expected_amount_minor_units: number;
  expected_currency: string;
  payment_method_id: string;
  payment_channel: PaymentChannel;
  payment_method: string;
  method_code?: string;
  payment_method_display_name: string;
  provider_checkout_url?: string;
  payment_instructions?: PaymentInstructions;
  expires_at?: string;
  created_at: string;
  updated_at?: string;
  poll_after_ms?: number | null;
  verify_et_request_id?: string;
  can_upload_receipt?: boolean;
  can_contact_support?: boolean;
  can_retry_verification?: boolean;
  verification_count?: number;
};


export type BoostActivationRequest = {
  idempotency_key?: string;
};

export type BoostActivationResponse = {
  boost_id: string;
  started_at: string;
  expires_at: string;
  credits_remaining: number;
};

export type OrderListItem = {
  id: string;
  order_reference: string;
  status: OrderStatus;
  product_code: string;
  product_type: ProductType;
  display_name: string;
  expected_amount_minor_units: number;
  expected_currency: string;
  display_price: string;
  payment_method_id: string;
  payment_method_display_name: string;
  payment_channel: PaymentChannel;
  payment_method: string;
  method_code: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  can_resume_payment: boolean;
  can_submit_payment: boolean;
  verification_count?: number;
  can_create_new_order: boolean;
};

export type OrderListResponse = {
  orders: OrderListItem[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type SuperLikeExhaustionContext = 'QUOTA' | 'CREDITS';

// ─── Promotion Types ───────────────────────────────────────────────────────────

export type RedemptionStatus = 'RESERVED' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';

export type PromotionTriggerType = 'USER_CLAIM' | 'PURCHASE' | 'AUTO_ON_SIGNUP';
export type PromotionBenefitType = 'FREE_PREMIUM' | 'DISCOUNT' | 'CREDITS';
export type PromotionEligibilityType =
  | 'ANY_ELIGIBLE_USER'
  | 'NEW_USER'
  | 'NEVER_SUBSCRIBED'
  | 'NO_ACTIVE_SUBSCRIPTION'
  | (string & {});
export type PromotionDiscountType = 'PERCENTAGE' | 'FIXED';

export type OfferPromotionDto = {
  campaign_id: string;
  campaign_key: string;
  name: string;
  description: string | null;
  discount_type: PromotionDiscountType;
  discount_value_basis_points_or_minor_units: number;
  discount_currency: string | null;
  original_amount_minor: number;
  discount_amount_minor: number;
  final_amount_minor: number;
  effective_display_price: string;
  ends_at: string | null;
};

export type ClaimablePromotionDto = {
  campaign_id: string;
  campaign_key: string;
  name: string;
  description: string | null;
  duration_days: number | null;
  ends_at: string | null;
  target_gender: 'MALE' | 'FEMALE' | null;
};

export type EligiblePromotionDto = {
  campaign_id: string;
  campaign_key: string;
  name: string;
  description: string | null;
  status: string;
  trigger_type: PromotionTriggerType;
  eligibility_type: PromotionEligibilityType | null;
  benefit_type: PromotionBenefitType;
  discount_type: PromotionDiscountType | null;
  discount_value: number | null;
  discount_currency: string | null;
  subscription_product_id: string | null;
  consumable_product_id: string | null;
  duration_days: number | null;
  max_redemptions: number | null;
  reserved_count: number;
  fulfilled_count: number;
  starts_at: string | null;
  ends_at: string | null;
  target_gender: 'MALE' | 'FEMALE' | null;
  included_credits: number | null;
  can_redeem: boolean;
  priority: number;
};

export type UserRedemptionDto = {
  id: string;
  campaign_id: string;
  campaign_key: string;
  campaign_name: string;
  benefit_type: PromotionBenefitType;
  duration_days: number | null;
  subscription_id: string | null;
  payment_order_id: string | null;
  status: RedemptionStatus;
  original_amount_minor: number | null;
  discount_amount_minor: number | null;
  final_amount_minor: number | null;
  currency: string | null;
  reserved_at: string;
  fulfilled_at: string | null;
  cancelled_at: string | null;
  expired_at: string | null;
  failure_code: string | null;
  eligibility_gender: 'MALE' | 'FEMALE' | null;
  subscription_status: string | null;
  subscription_period_end: string | null;
};

export type RedeemPromotionResponse = {
  redemption_id: string;
  subscription_id: string | null;
  campaign_key: string;
  plan_code: string | null;
  duration_days: number | null;
  period_end: string | null;
  credits_granted: number | null;
  message: string;
};
