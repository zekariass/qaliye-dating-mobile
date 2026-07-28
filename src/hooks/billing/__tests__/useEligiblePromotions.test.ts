jest.mock('@/api/billing/billingApi', () => ({
  fetchEligiblePromotions: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware');
  return {
    ...actual,
    persist: (config: any) => config,
    createJSONStorage: () => undefined,
  };
});

import type { CampaignRecord } from '@/stores/promotion-store';
import type { EligiblePromotionDto } from '@/types/billing';
import {
    canShowCampaign,
    getCooldownSequence,
    isPromoCurrentlyValid,
    isPromoStructurallyValid,
    parseUtcDate,
    selectPromotion,
} from '../useEligiblePromotions';

const H24 = 24 * 3600_000;
const D3 = 3 * 24 * 3600_000;
const D7 = 7 * 24 * 3600_000;

const NOW = new Date('2025-07-15T12:00:00Z');

function makePromotion(overrides: Partial<EligiblePromotionDto> = {}): EligiblePromotionDto {
  return {
    campaign_id: 'c1',
    campaign_key: 'promo_a',
    name: 'Test Promo',
    description: null,
    status: 'ACTIVE',
    trigger_type: 'USER_CLAIM',
    eligibility_type: 'ANY_ELIGIBLE_USER',
    benefit_type: 'FREE_PREMIUM',
    discount_type: null,
    discount_value: null,
    discount_currency: null,
    subscription_product_id: 'premium_monthly',
    duration_days: 7,
    max_redemptions: null,
    reserved_count: 0,
    fulfilled_count: 0,
    starts_at: '2025-07-10T00:00:00Z',
    ends_at: null,
    target_gender: null,
    can_redeem: true,
    priority: 0,
    ...overrides,
  } as EligiblePromotionDto;
}

function makeRecord(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    lastShownAt: null,
    lastDismissedAt: null,
    dismissalCount: 0,
    permanentlyHidden: false,
    claimedOrRedeemed: false,
    ...overrides,
  };
}

const noopStore = { isShownThisSession: () => false };

// ─── parseUtcDate ─────────────────────────────────────────────────────────────
describe('parseUtcDate', () => {
  it('parses a valid ISO string', () => {
    const d = parseUtcDate('2025-07-15T12:00:00Z');
    expect(d).not.toBeNull();
    expect(d!.toISOString()).toBe('2025-07-15T12:00:00.000Z');
  });

  it('returns null for null/undefined', () => {
    expect(parseUtcDate(null)).toBeNull();
    expect(parseUtcDate(undefined)).toBeNull();
  });

  it('returns null for an invalid string', () => {
    expect(parseUtcDate('not-a-date')).toBeNull();
  });
});

// ─── isPromoStructurallyValid ─────────────────────────────────────────────────
describe('isPromoStructurallyValid', () => {
  const base = makePromotion({});

  it('returns true for a fully valid promotion', () => {
    expect(isPromoStructurallyValid(base)).toBe(true);
  });

  it('returns false when campaign_key is missing', () => {
    expect(isPromoStructurallyValid({ ...base, campaign_key: '' })).toBe(false);
  });

  it('returns false when status is missing', () => {
    expect(isPromoStructurallyValid({ ...base, status: '' })).toBe(false);
  });

  it('returns false when eligibility_type is null', () => {
    expect(isPromoStructurallyValid({ ...base, eligibility_type: null })).toBe(false);
  });

  it('returns false when starts_at is null', () => {
    expect(isPromoStructurallyValid({ ...base, starts_at: null })).toBe(false);
  });

  it('returns false for unsupported trigger_type', () => {
    expect(isPromoStructurallyValid({ ...base, trigger_type: 'AUTO_ON_SIGNUP' as any })).toBe(false);
  });

  it('returns false for unsupported benefit_type', () => {
    expect(isPromoStructurallyValid({ ...base, benefit_type: 'CREDITS' as any })).toBe(false);
  });

  it('returns false for unsupported eligibility_type', () => {
    expect(isPromoStructurallyValid({ ...base, eligibility_type: 'UNKNOWN_TYPE' })).toBe(false);
  });

  it('returns false when starts_at is an invalid date string', () => {
    expect(isPromoStructurallyValid({ ...base, starts_at: 'garbage' })).toBe(false);
  });

  it('returns true when ends_at is null', () => {
    expect(isPromoStructurallyValid({ ...base, ends_at: null })).toBe(true);
  });

  it('returns false when ends_at is an invalid date string', () => {
    expect(isPromoStructurallyValid({ ...base, ends_at: 'garbage' })).toBe(false);
  });
});

// ─── isPromoCurrentlyValid ────────────────────────────────────────────────────
describe('isPromoCurrentlyValid', () => {
  const base = makePromotion({});

  it('returns true when status is ACTIVE and within time bounds', () => {
    expect(isPromoCurrentlyValid(base, NOW)).toBe(true);
  });

  it('returns false when status is not ACTIVE', () => {
    expect(isPromoCurrentlyValid({ ...base, status: 'PAUSED' }, NOW)).toBe(false);
  });

  it('returns false when now is before starts_at', () => {
    const p = { ...base, starts_at: '2025-07-20T00:00:00Z' };
    expect(isPromoCurrentlyValid(p, NOW)).toBe(false);
  });

  it('returns false when now is after ends_at', () => {
    const p = { ...base, ends_at: '2025-07-14T00:00:00Z' };
    expect(isPromoCurrentlyValid(p, NOW)).toBe(false);
  });

  it('returns true when ends_at is null (no end bound)', () => {
    const p = { ...base, ends_at: null };
    expect(isPromoCurrentlyValid(p, NOW)).toBe(true);
  });
});

// ─── getCooldownSequence ──────────────────────────────────────────────────────
describe('getCooldownSequence', () => {
  it('returns full sequence when ends_at is null', () => {
    expect(getCooldownSequence(null, NOW)).toEqual([H24, D3, D7, Infinity]);
  });

  it('returns [Infinity] when < 24h remaining', () => {
    const endsAt = new Date(NOW.getTime() + 12 * 3600_000).toISOString();
    expect(getCooldownSequence(endsAt, NOW)).toEqual([Infinity]);
  });

  it('returns [H24, Infinity] when < 3 days remaining', () => {
    const endsAt = new Date(NOW.getTime() + 2 * 24 * 3600_000).toISOString();
    expect(getCooldownSequence(endsAt, NOW)).toEqual([H24, Infinity]);
  });

  it('returns [H24, D3, Infinity] when <= 7 days remaining', () => {
    const endsAt = new Date(NOW.getTime() + 5 * 24 * 3600_000).toISOString();
    expect(getCooldownSequence(endsAt, NOW)).toEqual([H24, D3, Infinity]);
  });

  it('returns full sequence when > 7 days remaining', () => {
    const endsAt = new Date(NOW.getTime() + 14 * 24 * 3600_000).toISOString();
    expect(getCooldownSequence(endsAt, NOW)).toEqual([H24, D3, D7, Infinity]);
  });
});

// ─── canShowCampaign ──────────────────────────────────────────────────────────
describe('canShowCampaign', () => {
  const base = makePromotion({});

  it('returns true for a fresh record with no dismissals', () => {
    expect(canShowCampaign(base, makeRecord(), 'user-1', noopStore, NOW)).toBe(true);
  });

  it('returns false when permanentlyHidden is true', () => {
    expect(canShowCampaign(base, makeRecord({ permanentlyHidden: true }), 'user-1', noopStore, NOW)).toBe(false);
  });

  it('returns false when claimedOrRedeemed is true', () => {
    expect(canShowCampaign(base, makeRecord({ claimedOrRedeemed: true }), 'user-1', noopStore, NOW)).toBe(false);
  });

  it('returns false when already shown this session', () => {
    const store = { isShownThisSession: () => true };
    expect(canShowCampaign(base, makeRecord(), 'user-1', store, NOW)).toBe(false);
  });

  it('returns false when dismissalCount exceeds cooldown sequence length', () => {
    // ends_at null → full sequence [H24, D3, D7, Infinity] → length 4
    expect(canShowCampaign(base, makeRecord({ dismissalCount: 4 }), 'user-1', noopStore, NOW)).toBe(false);
  });

  it('returns false when within the first cooldown after first dismissal', () => {
    const dismissedAt = new Date(NOW.getTime() - 10_000).toISOString(); // 10s ago
    expect(canShowCampaign(base, makeRecord({ dismissalCount: 1, lastDismissedAt: dismissedAt }), 'user-1', noopStore, NOW)).toBe(false);
  });

  it('returns true when first cooldown has elapsed after first dismissal', () => {
    const dismissedAt = new Date(NOW.getTime() - H24 - 1000).toISOString(); // > 24h ago
    expect(canShowCampaign(base, makeRecord({ dismissalCount: 1, lastDismissedAt: dismissedAt }), 'user-1', noopStore, NOW)).toBe(true);
  });

  it('returns false for short-lived promo (< 24h) that was already shown once', () => {
    const endsAt = new Date(NOW.getTime() + 12 * 3600_000).toISOString();
    const p = { ...base, ends_at: endsAt };
    const record = makeRecord({ lastShownAt: '2025-07-15T10:00:00Z' });
    expect(canShowCampaign(p, record, 'user-1', noopStore, NOW)).toBe(false);
  });

  it('returns true for short-lived promo that has not been shown yet', () => {
    const endsAt = new Date(NOW.getTime() + 12 * 3600_000).toISOString();
    const p = { ...base, ends_at: endsAt };
    expect(canShowCampaign(p, makeRecord(), 'user-1', noopStore, NOW)).toBe(true);
  });
});

// ─── selectPromotion ──────────────────────────────────────────────────────────
describe('selectPromotion', () => {
  it('returns null for an empty list', () => {
    expect(selectPromotion([])).toBeNull();
  });

  it('prefers USER_CLAIM + FREE_PREMIUM (category 0)', () => {
    const claim = makePromotion({ campaign_key: 'claim', trigger_type: 'USER_CLAIM', benefit_type: 'FREE_PREMIUM' });
    const purchase = makePromotion({ campaign_key: 'buy', trigger_type: 'PURCHASE', benefit_type: 'DISCOUNT' });
    expect(selectPromotion([purchase, claim])?.campaign_key).toBe('claim');
  });

  it('prefers higher priority within the same category', () => {
    const low = makePromotion({ campaign_key: 'low', priority: 1 });
    const high = makePromotion({ campaign_key: 'high', priority: 10 });
    expect(selectPromotion([low, high])?.campaign_key).toBe('high');
  });

  it('prefers newer starts_at when priority is equal', () => {
    const older = makePromotion({ campaign_key: 'older', starts_at: '2025-07-01T00:00:00Z', priority: 0 });
    const newer = makePromotion({ campaign_key: 'newer', starts_at: '2025-07-10T00:00:00Z', priority: 0 });
    expect(selectPromotion([older, newer])?.campaign_key).toBe('newer');
  });

  it('breaks ties alphabetically by campaign_key', () => {
    const b = makePromotion({ campaign_key: 'bbb', starts_at: '2025-07-10T00:00:00Z', priority: 0 });
    const a = makePromotion({ campaign_key: 'aaa', starts_at: '2025-07-10T00:00:00Z', priority: 0 });
    expect(selectPromotion([b, a])?.campaign_key).toBe('aaa');
  });

  it('prefers FREE_PREMIUM over DISCOUNT regardless of trigger_type', () => {
    const free = makePromotion({ campaign_key: 'free', trigger_type: 'PURCHASE', benefit_type: 'FREE_PREMIUM' });
    const discount = makePromotion({ campaign_key: 'disc', trigger_type: 'USER_CLAIM', benefit_type: 'DISCOUNT' });
    expect(selectPromotion([discount, free])?.campaign_key).toBe('free');
  });
});
