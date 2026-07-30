export type BillingPlan = 'FREE' | 'PREMIUM' | 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY' | 'FREE_PREMIUM' | (string & {});

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

export type BillingPlatform = 'IOS' | 'ANDROID' | 'WEB';

export type PaymentChannelOptionDto = {
  channel: PaymentChannel;
  display_name: string;
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

export type QuotaInfo = {
  used: number;
  limit: number | null;
  remaining: number | null;
  resets_at?: string;
};

export type EntitlementLimits = Record<string, QuotaInfo>;

export type EntitlementCredits = {
  boosts_available: number;
  super_likes_available: number;
  rewinds_available: number;
};

export type EntitlementFeatures = {
  see_who_liked_you: boolean;
  advanced_filters: boolean;
  incognito_mode: boolean;
};

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
  limits: EntitlementLimits;
  credits: EntitlementCredits;
  active_boost: ActiveBoostInfo;
  features: EntitlementFeatures;
  plan_limits: PlanLimits;
  boost_duration_minutes: number;
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
};

export type PaymentOptionsResponse = {
  platform: BillingPlatform;
  billing_country_code: string;
  resolved_market_country_code: string;
  fallback_to_global: boolean;
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
  poll_after_ms?: number | null;
  verify_et_request_id?: string;
  can_upload_receipt?: boolean;
  can_contact_support?: boolean;
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

export type CreditsProductCategory = 'BOOST' | 'SUPERLIKE' | 'REWIND';

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
export type PromotionBenefitType = 'FREE_PREMIUM' | 'DISCOUNT';
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
  subscription_product_id: string;
  duration_days: number | null;
  max_redemptions: number | null;
  reserved_count: number;
  fulfilled_count: number;
  starts_at: string | null;
  ends_at: string | null;
  target_gender: 'MALE' | 'FEMALE' | null;
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
  subscription_id: string;
  campaign_key: string;
  plan_code: string | null;
  duration_days: number;
  period_end: string;
  message: string;
};
