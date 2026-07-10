export type BillingPlan = 'FREE' | 'PREMIUM' | 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY' | (string & {});

export function isPremiumPlan(plan: BillingPlan | null | undefined): boolean {
  return !!plan && plan !== 'FREE';
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

export type SubscriptionInfo = {
  status: SubscriptionStatus;
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
};

export type EntitlementResponse = {
  plan: BillingPlan;
  subscription: SubscriptionInfo;
  limits: EntitlementLimits;
  credits: EntitlementCredits;
  active_boost: ActiveBoostInfo;
  features: EntitlementFeatures;
  plan_limits: PlanLimits;
};

export type OfferDto = {
  id: string;
  product_code: string;
  product_type: ProductType;
  country_code?: string;
  currency: string;
  price_minor_units: number;
  display_price: string;
  billing_interval_count?: number;
  billing_interval_unit?: BillingIntervalUnit;
  auto_renew: boolean;
  external_product_id?: string;
  revenuecat_offering_id?: string;
  revenuecat_package_id?: string;
  has_available_payment_methods: boolean;
  available_payment_method_count: number;
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
