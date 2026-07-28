import { apiClient } from '../apiClient';

import type {
    BillingIntervalUnit,
    BillingPlatform,
    BoostActivationRequest,
    BoostActivationResponse,
    ClaimablePromotionDto,
    CreateOrderRequest,
    EligiblePromotionDto,
    EntitlementResponse,
    ManualTransferVerifyRequest,
    ManualTransferVerifyResponse,
    OfferDto,
    OfferPromotionDto,
    OrderListItem,
    OrderListResponse,
    OrderResponse,
    PaymentChannel,
    PaymentChannelOptionDto,
    PaymentMethodDto,
    PaymentOptionsResponse,
    ProductType,
    PromotionBenefitType,
    PromotionDiscountType,
    PromotionTriggerType,
    QuotaInfo,
    RedeemPromotionResponse,
    RedemptionStatus,
    SubscriptionStatus,
    UserRedemptionDto,
    VerificationField,
    VerificationParams,
    VerifyPaymentRequest
} from '@/types/billing';

const BASE = '/api/v1/billing';

function normalizeQuota(raw: Record<string, unknown>): QuotaInfo {
  return {
    used: (raw.used ?? 0) as number,
    limit: (raw.limit ?? null) as number | null,
    remaining: (raw.remaining ?? null) as number | null,
    resets_at: (raw.resets_at ?? raw.resetsAt) as string | undefined,
  };
}

function normalizeEntitlements(raw: Record<string, unknown>): EntitlementResponse {
  const subRaw = (raw.subscription ?? null) as Record<string, unknown> | null;
  const limitsRaw = (raw.limits ?? {}) as Record<string, Record<string, unknown>>;
  const creditsRaw = (raw.credits ?? {}) as Record<string, unknown>;
  const featuresRaw = (raw.features ?? {}) as Record<string, unknown>;
  const boostRaw = (raw.activeBoost ?? raw.active_boost ?? null) as Record<string, unknown> | null;
  const planLimitsRaw = (raw.planLimits ?? raw.plan_limits ?? {}) as Record<string, unknown>;

  const limits: Record<string, QuotaInfo> = {};
  for (const [key, val] of Object.entries(limitsRaw)) {
    const snakeKey = key === 'superLikes' ? 'super_likes' : key;
    limits[snakeKey] = normalizeQuota(val as Record<string, unknown>);
  }

  return {
    plan: (raw.plan ?? 'FREE') as EntitlementResponse['plan'],
    subscription: subRaw
      ? {
          status: (subRaw.status ?? 'NONE') as SubscriptionStatus,
          billing_interval_count: (subRaw.billing_interval_count ?? subRaw.billingIntervalCount) as number | undefined,
          billing_interval_unit: (subRaw.billing_interval_unit ?? subRaw.billingIntervalUnit) as BillingIntervalUnit | undefined,
          expires_at: (subRaw.expires_at ?? subRaw.expiresAt) as string | undefined,
          auto_renew: (subRaw.auto_renew ?? subRaw.autoRenew ?? false) as boolean,
        }
      : null,
    limits,
    credits: {
      boosts_available: (creditsRaw.boosts_available ?? creditsRaw.boostsAvailable ?? 0) as number,
      super_likes_available: (creditsRaw.super_likes_available ?? creditsRaw.superLikesAvailable ?? 0) as number,
      rewinds_available: (creditsRaw.rewinds_available ?? creditsRaw.rewindsAvailable ?? 0) as number,
    },
    active_boost: boostRaw
      ? {
          boost_id: (boostRaw.boost_id ?? boostRaw.boostId ?? '') as string,
          started_at: (boostRaw.started_at ?? boostRaw.startedAt ?? '') as string,
          expires_at: (boostRaw.expires_at ?? boostRaw.expiresAt ?? '') as string,
          remaining_seconds: (boostRaw.remaining_seconds ?? boostRaw.remainingSeconds ?? 0) as number,
        }
      : null,
    features: {
      see_who_liked_you: (featuresRaw.see_who_liked_you ?? featuresRaw.seeWhoLikedYou ?? false) as boolean,
      advanced_filters: (featuresRaw.advanced_filters ?? featuresRaw.advancedFilters ?? false) as boolean,
      incognito_mode: (featuresRaw.incognito_mode ?? featuresRaw.incognitoMode ?? false) as boolean,
    },
    plan_limits: {
      LIKES: (planLimitsRaw.LIKES ?? null) as number | null,
      SUPERLIKES: (planLimitsRaw.SUPERLIKES ?? null) as number | null,
      REWINDS: (planLimitsRaw.REWINDS ?? null) as number | null,
      BOOSTS: (planLimitsRaw.BOOSTS ?? null) as number | null,
      VOICE_CHAT_MSGS: (planLimitsRaw.VOICE_CHAT_MSGS ?? planLimitsRaw.voiceChatMsgs ?? null) as number | null,
      IMAGE_CHAT_MSGS: (planLimitsRaw.IMAGE_CHAT_MSGS ?? planLimitsRaw.imageChatMsgs ?? null) as number | null,
    },
    boost_duration_minutes: (raw.boost_duration_minutes ?? raw.boostDurationMinutes ?? 30) as number,
  };
}

export async function fetchEntitlements(): Promise<EntitlementResponse> {
  const res = await apiClient.get<unknown>(`${BASE}/entitlements`);
  return normalizeEntitlements(res.data as Record<string, unknown>);
}

function normalizeOfferPromotion(raw: Record<string, unknown>): OfferPromotionDto {
  return {
    campaign_id: (raw.campaignId ?? raw.campaign_id ?? '') as string,
    campaign_key: (raw.campaignKey ?? raw.campaign_key ?? '') as string,
    name: (raw.name ?? '') as string,
    description: (raw.description ?? null) as string | null,
    discount_type: (raw.discountType ?? raw.discount_type ?? 'PERCENTAGE') as PromotionDiscountType,
    discount_value_basis_points_or_minor_units: (raw.discountValueBasisPointsOrMinorUnits ?? raw.discount_value_basis_points_or_minor_units ?? 0) as number,
    discount_currency: (raw.discountCurrency ?? raw.discount_currency ?? null) as string | null,
    original_amount_minor: (raw.originalAmountMinor ?? raw.original_amount_minor ?? 0) as number,
    discount_amount_minor: (raw.discountAmountMinor ?? raw.discount_amount_minor ?? 0) as number,
    final_amount_minor: (raw.finalAmountMinor ?? raw.final_amount_minor ?? 0) as number,
    effective_display_price: (raw.effectiveDisplayPrice ?? raw.effective_display_price ?? '') as string,
    ends_at: (raw.endsAt ?? raw.ends_at ?? null) as string | null,
  };
}

function normalizeClaimablePromotion(raw: Record<string, unknown>): ClaimablePromotionDto {
  return {
    campaign_id: (raw.campaignId ?? raw.campaign_id ?? '') as string,
    campaign_key: (raw.campaignKey ?? raw.campaign_key ?? '') as string,
    name: (raw.name ?? '') as string,
    description: (raw.description ?? null) as string | null,
    duration_days: (raw.durationDays ?? raw.duration_days ?? null) as number | null,
    ends_at: (raw.endsAt ?? raw.ends_at ?? null) as string | null,
    target_gender: (raw.targetGender ?? raw.target_gender ?? null) as 'MALE' | 'FEMALE' | null,
  };
}

function normalizeOffer(raw: Record<string, unknown>): OfferDto {
  const rawPromotion = (raw.promotion ?? null) as Record<string, unknown> | null;
  const rawClaimable = (raw.claimablePromotions ?? raw.claimable_promotions ?? []) as Record<string, unknown>[];
  return {
    id: raw.id as string,
    product_code: (raw.product_code ?? raw['productCode'] ?? '') as string,
    product_type: (raw.product_type ?? raw['productType'] ?? '') as ProductType,
    country_code: (raw.country_code ?? raw['countryCode']) as string | undefined,
    currency: (raw.currency ?? '') as string,
    price_minor_units: (raw.price_minor_units ?? raw['priceMinorUnits'] ?? 0) as number,
    display_price: (raw.display_price ?? raw['displayPrice'] ?? '') as string,
    effective_price_minor_units: (raw.effectivePriceMinorUnits ?? raw.effective_price_minor_units) as number | undefined,
    effective_display_price: (raw.effectiveDisplayPrice ?? raw.effective_display_price) as string | undefined,
    billing_interval_count: (raw.billing_interval_count ?? raw['billingIntervalCount']) as number | undefined,
    billing_interval_unit: (raw.billing_interval_unit ?? raw['billingIntervalUnit']) as BillingIntervalUnit | undefined,
    auto_renew: (raw.auto_renew ?? raw['autoRenew'] ?? false) as boolean,
    external_product_id: (raw.external_product_id ?? raw['externalProductId']) as string | undefined,
    revenuecat_offering_id: (raw.revenuecat_offering_id ?? raw['revenuecatOfferingId']) as string | undefined,
    revenuecat_package_id: (raw.revenuecat_package_id ?? raw['revenuecatPackageId']) as string | undefined,
    has_available_payment_methods: (raw.has_available_payment_methods ?? raw['hasAvailablePaymentMethods'] ?? false) as boolean,
    available_payment_method_count: (raw.available_payment_method_count ?? raw['availablePaymentMethodCount'] ?? 0) as number,
    promotion: rawPromotion ? normalizeOfferPromotion(rawPromotion) : null,
    claimable_promotions: rawClaimable.map(normalizeClaimablePromotion),
  };
}

export async function fetchOffers(platform: BillingPlatform): Promise<OfferDto[]> {
  const res = await apiClient.get<unknown>(`${BASE}/offers`, {
    params: { platform },
  });
  const raw = res.data;
  const items = Array.isArray(raw) ? raw : [];
  return items.map((item) => normalizeOffer(item as Record<string, unknown>));
}

function normalizeChannel(raw: unknown): PaymentChannelOptionDto {
  const ch = (raw ?? {}) as Record<string, unknown>;
  return {
    channel: (ch.code ?? ch.channel ?? '') as PaymentChannel,
    display_name: (ch.display_name ?? ch['displayName'] ?? ch.code ?? ch.channel ?? '') as string,
  };
}

export async function fetchPaymentChannels(platform: BillingPlatform): Promise<PaymentChannelOptionDto[]> {
  const res = await apiClient.get<unknown>(`${BASE}/payment-channels`, {
    params: { platform },
  });
  const raw = res.data;
  let items: unknown[] = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === 'object') {
    const wrapped = raw as Record<string, unknown>;
    const inner = wrapped.channels ?? wrapped.data ?? wrapped.payment_channels ?? wrapped['paymentChannels'];
    if (Array.isArray(inner)) items = inner;
  }
  return items.map(normalizeChannel);
}

function normalizeVerificationField(raw: Record<string, unknown>): VerificationField {
  return {
    name: (raw.name ?? '') as string,
    label: (raw.label ?? '') as string,
    type: (raw.type ?? 'string') as VerificationField['type'],
    required: (raw.required ?? false) as boolean,
    hint: raw.hint as string | undefined,
    pattern: raw.pattern as string | undefined,
    max_length: (raw.max_length ?? raw['maxLength']) as number | undefined,
    min_length: (raw.min_length ?? raw['minLength']) as number | undefined,
  };
}

function normalizeVerificationParams(raw: unknown): VerificationParams | null {
  if (!raw) return null;

  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (Array.isArray(parsed)) {
    return { fields: (parsed as Record<string, unknown>[]).map(normalizeVerificationField) };
  }
  if (typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray((parsed as VerificationParams).fields)) {
    return { fields: (parsed as VerificationParams).fields.map(normalizeVerificationField) };
  }
  return null;
}

function normalizePaymentMethod(raw: Record<string, unknown>): PaymentMethodDto {
  const verificationRaw = raw.verification_params ?? raw['verificationParams'] ?? null;
  const method: PaymentMethodDto = {
    id: raw.id as string,
    method_code: (raw.method_code ?? raw['methodCode'] ?? '') as string,
    display_name: (raw.display_name ?? raw['displayName'] ?? '') as string,
    payment_channel: (raw.payment_channel ?? raw['paymentChannel'] ?? '') as PaymentMethodDto['payment_channel'],
    payment_method: (raw.payment_method ?? raw['paymentMethod'] ?? '') as string,
    payment_instructions: (raw.payment_instructions ?? raw['paymentInstructions'] ?? raw['paymentInstructionsHtml'] ?? raw['payment_information'] ?? raw['paymentInformation'] ?? raw['payment_instructions_html'] ?? raw['paymentInformationHtml'] ?? null) as string | null,
    display_order: (raw.display_order ?? raw['displayOrder'] ?? 0) as number,
    verification_params: normalizeVerificationParams(verificationRaw),
  };
  return method;
}

export async function fetchPaymentOptions(
  platform: BillingPlatform,
  channel?: PaymentChannel,
): Promise<PaymentOptionsResponse> {
  const res = await apiClient.get<Record<string, unknown>>(`${BASE}/payment-options`, {
    params: channel ? { platform, channel } : { platform },
  });
  const data = res.data;
  const rawMethods = (data.payment_methods ?? data['paymentMethods'] ?? []) as Record<string, unknown>[];
  return {
    platform: (data.platform ?? platform) as BillingPlatform,
    billing_country_code: (data.billing_country_code ?? data['billingCountryCode'] ?? '') as string,
    resolved_market_country_code: (data.resolved_market_country_code ?? data['resolvedMarketCountryCode'] ?? '') as string,
    fallback_to_global: (data.fallback_to_global ?? data['fallbackToGlobal'] ?? false) as boolean,
    payment_methods: rawMethods.map(normalizePaymentMethod),
  };
}

function normalizeOrderResponse(raw: Record<string, unknown>): OrderResponse {
  const piRaw = (raw.payment_instructions ?? raw['paymentInstructions'] ?? null) as Record<string, unknown> | null;
  return {
    id: raw.id as string,
    order_reference: (raw.order_reference ?? raw['orderReference'] ?? '') as string,
    status: (raw.status ?? '') as OrderResponse['status'],
    expected_amount_minor_units: (raw.expected_amount_minor_units ?? raw['expectedAmountMinorUnits'] ?? 0) as number,
    expected_currency: (raw.expected_currency ?? raw['expectedCurrency'] ?? '') as string,
    payment_method_id: (raw.payment_method_id ?? raw['paymentMethodId'] ?? '') as string,
    payment_channel: (raw.payment_channel ?? raw['paymentChannel'] ?? '') as PaymentChannel,
    payment_method: (raw.payment_method ?? raw['paymentMethod'] ?? '') as string,
    method_code: (raw.method_code ?? raw['methodCode']) as string | undefined,
    payment_method_display_name: (raw.payment_method_display_name ?? raw['paymentMethodDisplayName'] ?? '') as string,
    provider_checkout_url: (raw.provider_checkout_url ?? raw['providerCheckoutUrl']) as string | undefined,
    payment_instructions: piRaw
      ? { instruction_text: (piRaw.instruction_text ?? piRaw['instructionText'] ?? '') as string }
      : undefined,
    expires_at: (raw.expires_at ?? raw['expiresAt']) as string | undefined,
    created_at: (raw.created_at ?? raw['createdAt'] ?? '') as string,
    poll_after_ms: (raw.poll_after_ms ?? raw['pollAfterMs'] ?? null) as number | null,
    verify_et_request_id: (raw.verify_et_request_id ?? raw['verifyEtRequestId']) as string | undefined,
    can_upload_receipt: (raw.can_upload_receipt ?? raw['canUploadReceipt']) as boolean | undefined,
    can_contact_support: (raw.can_contact_support ?? raw['canContactSupport']) as boolean | undefined,
    verification_count: (raw.verification_count ?? raw['verificationCount'] ?? 0) as number,
  };
}

export async function createOrder(body: CreateOrderRequest): Promise<OrderResponse> {
  const res = await apiClient.post<unknown>(`${BASE}/orders`, {
    paymentOfferId: body.payment_offer_id,
    paymentMethodId: body.payment_method_id,
    idempotencyKey: body.idempotency_key,
    platform: body.platform,
  });
  return normalizeOrderResponse(res.data as Record<string, unknown>);
}

export async function fetchOrder(orderId: string): Promise<OrderResponse> {
  const res = await apiClient.get<unknown>(`${BASE}/orders/${orderId}`);
  return normalizeOrderResponse(res.data as Record<string, unknown>);
}

function normalizeOrderListItem(raw: Record<string, unknown>): OrderListItem {
  return {
    id: raw.id as string,
    order_reference: (raw.order_reference ?? raw['orderReference'] ?? '') as string,
    status: (raw.status ?? '') as OrderListItem['status'],
    product_code: (raw.product_code ?? raw['productCode'] ?? '') as string,
    product_type: (raw.product_type ?? raw['productType'] ?? '') as OrderListItem['product_type'],
    display_name: (raw.display_name ?? raw['displayName'] ?? '') as string,
    expected_amount_minor_units: (raw.expected_amount_minor_units ?? raw['expectedAmountMinorUnits'] ?? 0) as number,
    expected_currency: (raw.expected_currency ?? raw['expectedCurrency'] ?? '') as string,
    display_price: (raw.display_price ?? raw['displayPrice'] ?? '') as string,
    payment_method_id: (raw.payment_method_id ?? raw['paymentMethodId'] ?? '') as string,
    payment_method_display_name: (raw.payment_method_display_name ?? raw['paymentMethodDisplayName'] ?? '') as string,
    payment_channel: (raw.payment_channel ?? raw['paymentChannel'] ?? '') as PaymentChannel,
    payment_method: (raw.payment_method ?? raw['paymentMethod'] ?? '') as string,
    method_code: (raw.method_code ?? raw['methodCode'] ?? '') as string,
    expires_at: (raw.expires_at ?? raw['expiresAt'] ?? null) as string | null,
    created_at: (raw.created_at ?? raw['createdAt'] ?? '') as string,
    updated_at: (raw.updated_at ?? raw['updatedAt'] ?? '') as string,
    can_resume_payment: (raw.can_resume_payment ?? raw['canResumePayment'] ?? false) as boolean,
    can_submit_payment: (raw.can_submit_payment ?? raw['canSubmitPayment'] ?? false) as boolean,
    can_create_new_order: (raw.can_create_new_order ?? raw['canCreateNewOrder'] ?? false) as boolean,
    verification_count: (raw.verification_count ?? raw['verificationCount'] ?? 0) as number,
  };
}

function normalizeOrderListResponse(raw: Record<string, unknown>): OrderListResponse {
  const ordersRaw = (raw.orders ?? []) as Record<string, unknown>[];
  return {
    orders: ordersRaw.map(normalizeOrderListItem),
    page: (raw.page ?? raw['page'] ?? 1) as number,
    page_size: (raw.page_size ?? raw['pageSize'] ?? 20) as number,
    total: (raw.total ?? raw['total'] ?? 0) as number,
    total_pages: (raw.total_pages ?? raw['totalPages'] ?? 1) as number,
  };
}

export async function fetchOrders(params?: {
  statuses?: string;
  page?: number;
  page_size?: number;
}): Promise<OrderListResponse> {
  const res = await apiClient.get<unknown>(`${BASE}/orders`, {
    params,
  });
  return normalizeOrderListResponse(res.data as Record<string, unknown>);
}

export async function verifyManualPayment(
  orderId: string,
  body: VerifyPaymentRequest,
): Promise<OrderResponse> {
  const res = await apiClient.post<unknown>(
    `${BASE}/orders/${orderId}/verify`,
    {
      verificationFields: body.verification_fields,
      submittedAmountMinorUnits: body.submitted_amount_minor_units,
      submittedCurrency: body.submitted_currency,
    },
  );
  return normalizeOrderResponse(res.data as Record<string, unknown>);
}

function normalizeManualTransferVerifyResponse(raw: Record<string, unknown>): ManualTransferVerifyResponse {
  return {
    order_id: (raw.order_id ?? raw['orderId'] ?? raw['id'] ?? '') as string,
    order_reference: (raw.order_reference ?? raw['orderReference'] ?? '') as string,
    status: (raw.status ?? '') as ManualTransferVerifyResponse['status'],
    expected_amount_minor_units: (raw.expected_amount_minor_units ?? raw['expectedAmountMinorUnits']) as number | undefined,
    expected_currency: (raw.expected_currency ?? raw['expectedCurrency']) as string | undefined,
    payment_method_display_name: (raw.payment_method_display_name ?? raw['paymentMethodDisplayName']) as string | undefined,
    expires_at: (raw.expires_at ?? raw['expiresAt']) as string | undefined,
  };
}

export async function verifyManualTransfer(
  body: ManualTransferVerifyRequest,
): Promise<ManualTransferVerifyResponse> {
  const payload = {
    payment_offer_id: body.payment_offer_id,
    payment_method_id: body.payment_method_id,
    platform: body.platform,
    verification_data: body.verification_data,
    idempotency_key: body.idempotency_key,
  };
  const res = await apiClient.post<unknown>(`${BASE}/manual-transfer/verify`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return normalizeManualTransferVerifyResponse(res.data as Record<string, unknown>);
}

function normalizeEligiblePromotion(raw: Record<string, unknown>): EligiblePromotionDto {
  return {
    campaign_id: (raw.campaignId ?? raw.campaign_id ?? '') as string,
    campaign_key: (raw.campaignKey ?? raw.campaign_key ?? '') as string,
    name: (raw.name ?? '') as string,
    description: (raw.description ?? null) as string | null,
    status: (raw.status ?? 'ACTIVE') as string,
    trigger_type: (raw.triggerType ?? raw.trigger_type ?? 'PURCHASE') as PromotionTriggerType,
    eligibility_type: (raw.eligibilityType ?? raw.eligibility_type ?? 'ANY_ELIGIBLE_USER') as string | null,
    benefit_type: (raw.benefitType ?? raw.benefit_type ?? 'DISCOUNT') as PromotionBenefitType,
    discount_type: (raw.discountType ?? raw.discount_type ?? null) as PromotionDiscountType | null,
    discount_value: (raw.discountValue ?? raw.discount_value ?? null) as number | null,
    discount_currency: (raw.discountCurrency ?? raw.discount_currency ?? null) as string | null,
    subscription_product_id: (raw.subscriptionProductId ?? raw.subscription_product_id ?? '') as string,
    duration_days: (raw.durationDays ?? raw.duration_days ?? null) as number | null,
    max_redemptions: (raw.maxRedemptions ?? raw.max_redemptions ?? null) as number | null,
    reserved_count: (raw.reservedCount ?? raw.reserved_count ?? 0) as number,
    fulfilled_count: (raw.fulfilledCount ?? raw.fulfilled_count ?? 0) as number,
    starts_at: (raw.startsAt ?? raw.starts_at ?? '1970-01-01T00:00:00Z') as string | null,
    ends_at: (raw.endsAt ?? raw.ends_at ?? null) as string | null,
    target_gender: (raw.targetGender ?? raw.target_gender ?? null) as 'MALE' | 'FEMALE' | null,
    can_redeem: (raw.canRedeem ?? raw.can_redeem ?? true) as boolean,
    priority: typeof raw.priority === 'number' ? (raw.priority as number) : 0,
  };
}

function normalizeUserRedemption(raw: Record<string, unknown>): UserRedemptionDto {
  return {
    id: (raw.id ?? '') as string,
    campaign_id: (raw.campaignId ?? raw.campaign_id ?? '') as string,
    campaign_key: (raw.campaignKey ?? raw.campaign_key ?? '') as string,
    campaign_name: (raw.campaignName ?? raw.campaign_name ?? '') as string,
    benefit_type: (raw.benefitType ?? raw.benefit_type ?? 'FREE_PREMIUM') as PromotionBenefitType,
    duration_days: (raw.durationDays ?? raw.duration_days ?? null) as number | null,
    subscription_id: (raw.subscriptionId ?? raw.subscription_id ?? null) as string | null,
    payment_order_id: (raw.paymentOrderId ?? raw.payment_order_id ?? null) as string | null,
    status: (raw.status ?? 'RESERVED') as RedemptionStatus,
    original_amount_minor: (raw.originalAmountMinor ?? raw.original_amount_minor ?? null) as number | null,
    discount_amount_minor: (raw.discountAmountMinor ?? raw.discount_amount_minor ?? null) as number | null,
    final_amount_minor: (raw.finalAmountMinor ?? raw.final_amount_minor ?? null) as number | null,
    currency: (raw.currency ?? null) as string | null,
    reserved_at: (raw.reservedAt ?? raw.reserved_at ?? '') as string,
    fulfilled_at: (raw.fulfilledAt ?? raw.fulfilled_at ?? null) as string | null,
    cancelled_at: (raw.cancelledAt ?? raw.cancelled_at ?? null) as string | null,
    expired_at: (raw.expiredAt ?? raw.expired_at ?? null) as string | null,
    failure_code: (raw.failureCode ?? raw.failure_code ?? null) as string | null,
    eligibility_gender: (raw.eligibilityGender ?? raw.eligibility_gender ?? null) as 'MALE' | 'FEMALE' | null,
  };
}

export async function fetchEligiblePromotions(): Promise<EligiblePromotionDto[]> {
  const res = await apiClient.get<unknown>(`${BASE}/promotions`);
  const raw = res.data;
  console.log('[promo] RAW API response:', JSON.stringify(raw, null, 2));
  const items = Array.isArray(raw) ? raw : [];
  return items.map((item) => normalizeEligiblePromotion(item as Record<string, unknown>));
}

export async function fetchPromotionByKey(campaignKey: string): Promise<EligiblePromotionDto> {
  const res = await apiClient.get<unknown>(`${BASE}/promotions/${encodeURIComponent(campaignKey)}`);
  return normalizeEligiblePromotion(res.data as Record<string, unknown>);
}

export async function fetchPromotionRedemptions(params?: {
  page?: number;
  page_size?: number;
}): Promise<UserRedemptionDto[]> {
  const queryParams: Record<string, unknown> = {};
  if (params?.page != null) queryParams.page = params.page;
  if (params?.page_size != null) queryParams.pageSize = params.page_size;
  const res = await apiClient.get<unknown>(`${BASE}/promotions/redemptions`, { params: queryParams });
  const raw = res.data;
  const items = Array.isArray(raw) ? raw : [];
  return items.map((item) => normalizeUserRedemption(item as Record<string, unknown>));
}

export async function redeemPromotion(campaignKey: string): Promise<RedeemPromotionResponse> {
  const res = await apiClient.post<unknown>(`${BASE}/promotions/${encodeURIComponent(campaignKey)}/redeem`);
  const raw = res.data as Record<string, unknown>;
  return {
    redemption_id: (raw.redemptionId ?? raw.redemption_id ?? '') as string,
    subscription_id: (raw.subscriptionId ?? raw.subscription_id ?? '') as string,
    campaign_key: (raw.campaignKey ?? raw.campaign_key ?? '') as string,
    plan_code: (raw.planCode ?? raw.plan_code ?? null) as string | null,
    duration_days: (raw.durationDays ?? raw.duration_days ?? 0) as number,
    period_end: (raw.periodEnd ?? raw.period_end ?? '') as string,
    message: (raw.message ?? '') as string,
  };
}

export async function activateBoost(
  body?: BoostActivationRequest,
): Promise<BoostActivationResponse> {
  const res = await apiClient.post<BoostActivationResponse>(
    `${BASE}/boosts/activate`,
    body ?? {},
  );
  return res.data;
}
