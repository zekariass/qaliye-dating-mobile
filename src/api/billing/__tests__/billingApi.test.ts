import { apiClient } from '@/api/apiClient';

import { fetchEligiblePromotions, fetchOrders, fetchPromotionRedemptions, redeemPromotion } from '../billingApi';

jest.mock('@/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = (apiClient as any).post as jest.Mock;

describe('billingApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetchOrders passes statuses and pagination params in snake_case', async () => {
    mockedGet.mockResolvedValue({
      data: {
        orders: [],
        page: 1,
        page_size: 20,
        total: 0,
        total_pages: 1,
      },
    });

    await fetchOrders({
      statuses: 'AWAITING_PAYMENT,VERIFICATION_PENDING',
      page: 1,
      page_size: 20,
    });

    expect(mockedGet).toHaveBeenCalledWith('/api/v1/billing/orders', {
      params: {
        statuses: 'AWAITING_PAYMENT,VERIFICATION_PENDING',
        page: 1,
        page_size: 20,
      },
    });
  });

  it('fetchEligiblePromotions calls GET /api/v1/billing/promotions and normalises response', async () => {
    mockedGet.mockResolvedValue({
      data: [
        {
          campaign_id: 'c1',
          campaign_key: 'welcome_free_week',
          name: 'Welcome Week',
          description: null,
          trigger_type: 'USER_CLAIM',
          benefit_type: 'FREE_PREMIUM',
          discount_type: null,
          discount_value: null,
          discount_currency: null,
          subscription_product_id: 'premium_monthly',
          consumable_product_id: null,
          duration_days: 7,
          max_redemptions: null,
          reserved_count: 0,
          fulfilled_count: 0,
          ends_at: null,
          included_credits: null,
          can_redeem: true,
        },
      ],
    });

    const result = await fetchEligiblePromotions();

    expect(mockedGet).toHaveBeenCalledWith('/api/v1/billing/promotions');
    expect(result).toHaveLength(1);
    expect(result[0].campaign_key).toBe('welcome_free_week');
    expect(result[0].trigger_type).toBe('USER_CLAIM');
    expect(result[0].benefit_type).toBe('FREE_PREMIUM');
    expect(result[0].duration_days).toBe(7);
    expect(result[0].included_credits).toBeNull();
    expect(result[0].can_redeem).toBe(true);
  });

  it('fetchEligiblePromotions normalises CREDITS benefit type with included_credits', async () => {
    mockedGet.mockResolvedValue({
      data: [
        {
          campaign_id: 'c2',
          campaign_key: 'welcome_credits',
          name: 'Welcome Credits',
          description: 'Get 50 credits!',
          trigger_type: 'USER_CLAIM',
          benefit_type: 'CREDITS',
          discount_type: null,
          discount_value: null,
          discount_currency: null,
          subscription_product_id: null,
          consumable_product_id: 'credits_50',
          duration_days: null,
          max_redemptions: null,
          reserved_count: 0,
          fulfilled_count: 0,
          ends_at: null,
          included_credits: 50,
          can_redeem: true,
        },
      ],
    });

    const result = await fetchEligiblePromotions();

    expect(result).toHaveLength(1);
    expect(result[0].benefit_type).toBe('CREDITS');
    expect(result[0].included_credits).toBe(50);
    expect(result[0].can_redeem).toBe(true);
  });

  it('fetchEligiblePromotions returns empty array when no promotions are returned', async () => {
    mockedGet.mockResolvedValue({ data: [] });
    const result = await fetchEligiblePromotions();
    expect(result).toEqual([]);
  });

  it('fetchEligiblePromotions returns empty array for unexpected response shape', async () => {
    mockedGet.mockResolvedValue({ data: null });
    const result = await fetchEligiblePromotions();
    expect(result).toEqual([]);
  });

  it('fetchPromotionRedemptions calls GET with camelCase pageSize param', async () => {
    mockedGet.mockResolvedValue({
      data: [
        {
          id: 'r1',
          campaignId: 'c1',
          campaignKey: 'welcome_free_week',
          campaignName: 'Welcome Week',
          benefitType: 'FREE_PREMIUM',
          durationDays: 7,
          subscriptionId: 'sub_abc',
          paymentOrderId: null,
          status: 'FULFILLED',
          originalAmountMinor: null,
          discountAmountMinor: null,
          finalAmountMinor: null,
          currency: null,
          reservedAt: '2024-01-01T00:00:00Z',
          fulfilledAt: '2024-01-01T00:01:00Z',
          cancelledAt: null,
          expiredAt: null,
          failureCode: null,
        },
      ],
    });

    const result = await fetchPromotionRedemptions({ page: 1, page_size: 20 });

    expect(mockedGet).toHaveBeenCalledWith('/api/v1/billing/promotions/redemptions', {
      params: { page: 1, pageSize: 20 },
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r1');
    expect(result[0].status).toBe('FULFILLED');
    expect(result[0].campaign_key).toBe('welcome_free_week');
  });

  it('redeemPromotion calls POST /api/v1/billing/promotions/{key}/redeem and normalises', async () => {
    mockedPost.mockResolvedValue({
      data: {
        redemption_id: 'red_123',
        subscription_id: 'sub_abc',
        campaign_key: 'welcome_free_week',
        plan_code: 'PREMIUM_MONTHLY',
        duration_days: 7,
        period_end: '2024-01-08T00:00:00Z',
        credits_granted: null,
        message: 'Premium activated for 7 days.',
      },
    });

    const result = await redeemPromotion('welcome_free_week');

    expect(mockedPost).toHaveBeenCalledWith(
      '/api/v1/billing/promotions/welcome_free_week/redeem',
    );
    expect(result.redemption_id).toBe('red_123');
    expect(result.subscription_id).toBe('sub_abc');
    expect(result.campaign_key).toBe('welcome_free_week');
    expect(result.duration_days).toBe(7);
    expect(result.credits_granted).toBeNull();
    expect(result.message).toBe('Premium activated for 7 days.');
  });

  it('redeemPromotion normalises CREDITS-only response with null subscription fields', async () => {
    mockedPost.mockResolvedValue({
      data: {
        redemption_id: 'red_456',
        subscription_id: null,
        campaign_key: 'welcome_credits',
        plan_code: null,
        duration_days: null,
        period_end: null,
        credits_granted: 50,
        message: 'You received 50 credits!',
      },
    });

    const result = await redeemPromotion('welcome_credits');

    expect(result.redemption_id).toBe('red_456');
    expect(result.subscription_id).toBeNull();
    expect(result.plan_code).toBeNull();
    expect(result.duration_days).toBeNull();
    expect(result.period_end).toBeNull();
    expect(result.credits_granted).toBe(50);
    expect(result.message).toBe('You received 50 credits!');
  });

  it('redeemPromotion URL-encodes campaign key with special characters', async () => {
    mockedPost.mockResolvedValue({
      data: {
        redemption_id: 'red_x',
        subscription_id: 's1',
        campaign_key: 'promo key',
        plan_code: null,
        duration_days: 3,
        period_end: '2024-01-04T00:00:00Z',
        credits_granted: null,
        message: 'ok',
      },
    });

    await redeemPromotion('promo key');

    expect(mockedPost).toHaveBeenCalledWith(
      '/api/v1/billing/promotions/promo%20key/redeem',
    );
  });
});
