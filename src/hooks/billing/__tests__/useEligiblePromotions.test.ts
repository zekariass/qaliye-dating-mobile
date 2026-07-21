jest.mock('@/api/billing/billingApi', () => ({
  fetchEligiblePromotions: jest.fn(),
}));

import type { EligiblePromotionDto } from '@/types/billing';
import { selectPromotionToDisplay } from '../useEligiblePromotions';

function makePromotion(overrides: Partial<EligiblePromotionDto>): EligiblePromotionDto {
  return {
    campaign_id: 'c1',
    campaign_key: 'promo_a',
    name: 'Test Promo',
    description: null,
    trigger_type: 'USER_CLAIM',
    benefit_type: 'FREE_PREMIUM',
    discount_type: null,
    discount_value: null,
    discount_currency: null,
    subscription_product_id: 'premium_monthly',
    duration_days: 7,
    max_redemptions: null,
    reserved_count: 0,
    fulfilled_count: 0,
    ends_at: null,
    can_redeem: true,
    ...overrides,
  };
}

describe('selectPromotionToDisplay', () => {
  it('returns null for empty list', () => {
    expect(selectPromotionToDisplay([])).toBeNull();
  });

  it('prefers USER_CLAIM with can_redeem=true over everything else', () => {
    const claimable = makePromotion({ campaign_key: 'claim', trigger_type: 'USER_CLAIM', can_redeem: true });
    const purchase = makePromotion({ campaign_key: 'buy', trigger_type: 'PURCHASE', benefit_type: 'DISCOUNT', can_redeem: false });
    expect(selectPromotionToDisplay([purchase, claimable])?.campaign_key).toBe('claim');
  });

  it('skips USER_CLAIM where can_redeem=false and falls through to FREE_PREMIUM', () => {
    // A DISCOUNT-type USER_CLAIM that can't be redeemed should not block a FREE_PREMIUM promo
    const notClaimable = makePromotion({
      campaign_key: 'not_claimable',
      trigger_type: 'USER_CLAIM',
      benefit_type: 'DISCOUNT',
      can_redeem: false,
    });
    const freePremium = makePromotion({
      campaign_key: 'free_prem',
      trigger_type: 'AUTO_ON_SIGNUP',
      benefit_type: 'FREE_PREMIUM',
      can_redeem: false,
    });
    expect(selectPromotionToDisplay([notClaimable, freePremium])?.campaign_key).toBe('free_prem');
  });

  it('prefers PURCHASE promotion ending soonest when no FREE_PREMIUM', () => {
    const later = makePromotion({
      campaign_key: 'later',
      trigger_type: 'PURCHASE',
      benefit_type: 'DISCOUNT',
      can_redeem: false,
      ends_at: '2025-12-31T00:00:00Z',
    });
    const sooner = makePromotion({
      campaign_key: 'sooner',
      trigger_type: 'PURCHASE',
      benefit_type: 'DISCOUNT',
      can_redeem: false,
      ends_at: '2025-06-01T00:00:00Z',
    });
    expect(selectPromotionToDisplay([later, sooner])?.campaign_key).toBe('sooner');
  });

  it('falls back to any PURCHASE promotion when no ends_at', () => {
    const purchase = makePromotion({
      campaign_key: 'buy',
      trigger_type: 'PURCHASE',
      benefit_type: 'DISCOUNT',
      can_redeem: false,
      ends_at: null,
    });
    expect(selectPromotionToDisplay([purchase])?.campaign_key).toBe('buy');
  });
});
