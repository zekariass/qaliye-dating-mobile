import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { fetchEligiblePromotions } from '@/api/billing/billingApi';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import type { CampaignRecord } from '@/stores/promotion-store';
import { usePromotionStore } from '@/stores/promotion-store';
import type { EligiblePromotionDto } from '@/types/billing';
import { isActiveSubscription, isPremiumPlan } from '@/types/billing';

export const PROMOTIONS_KEY = ['billing', 'promotions'] as const;

// ─── Supported filter sets ───────────────────────────────────────────────────
const SUPPORTED_TRIGGER_TYPES = new Set(['USER_CLAIM', 'PURCHASE']);
const SUPPORTED_ELIGIBILITY_TYPES = new Set([
  'ANY_ELIGIBLE_USER',
  'NEW_USER',
  'NEVER_SUBSCRIBED',
  'NO_ACTIVE_SUBSCRIPTION',
]);
const SUPPORTED_BENEFIT_TYPES = new Set(['FREE_PREMIUM', 'DISCOUNT', 'CREDITS']);

// ─── Date helpers ────────────────────────────────────────────────────────────
export function parseUtcDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  try {
    // Handle Postgres timestamp format: "2026-07-21 01:08:04.701158+00" → "2026-07-21T01:08:04.701158+00"
    const normalized = iso.includes('T') ? iso : iso.replace(' ', 'T');
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

// ─── Structural validity (required fields + supported types) ─────────────────
export function isPromoStructurallyValid(p: EligiblePromotionDto): boolean {
  if (!p.campaign_key || !p.status || !p.trigger_type || !p.benefit_type) return false;
  if (!p.eligibility_type || !p.starts_at) return false;
  if (!SUPPORTED_TRIGGER_TYPES.has(p.trigger_type)) return false;
  if (!SUPPORTED_ELIGIBILITY_TYPES.has(p.eligibility_type)) return false;
  if (!SUPPORTED_BENEFIT_TYPES.has(p.benefit_type)) return false;
  if (parseUtcDate(p.starts_at) === null) return false;
  if (p.ends_at !== null && parseUtcDate(p.ends_at) === null) return false;
  return true;
}

// ─── Temporal validity (status + time bounds) ────────────────────────────────
export function isPromoCurrentlyValid(p: EligiblePromotionDto, now: Date): boolean {
  if (p.status !== 'ACTIVE') return false;
  const startsAt = parseUtcDate(p.starts_at);
  if (!startsAt || now < startsAt) return false;
  if (p.ends_at !== null) {
    const endsAt = parseUtcDate(p.ends_at);
    if (!endsAt || now >= endsAt) return false;
  }
  return true;
}

// ─── Cooldown sequence based on remaining campaign lifetime ──────────────────
const H24 = 24 * 3600_000;
const D3 = 3 * 24 * 3600_000;
const D7 = 7 * 24 * 3600_000;

export function getCooldownSequence(endsAt: string | null, now: Date): number[] {
  if (!endsAt) return [H24, D3, D7, Infinity];
  const endsAtDate = parseUtcDate(endsAt);
  if (!endsAtDate) return [H24, D3, D7, Infinity];
  const remainingMs = endsAtDate.getTime() - now.getTime();
  if (remainingMs < H24)  return [Infinity];           // ≤1 show; dismiss → permanent
  if (remainingMs < D3)   return [H24, Infinity];      // 24h cooldown, then permanent
  if (remainingMs <= D7)  return [H24, D3, Infinity];  // 24h + 3-day, then permanent
  return [H24, D3, D7, Infinity];                      // full sequence
}

// ─── Per-campaign display gate ───────────────────────────────────────────────
export function canShowCampaign(
  p: EligiblePromotionDto,
  record: CampaignRecord,
  userId: string,
  store: { isShownThisSession: (u: string, k: string) => boolean },
  now: Date,
): boolean {
  if (record.permanentlyHidden) return false;
  if (record.claimedOrRedeemed) return false;
  if (store.isShownThisSession(userId, p.campaign_key)) return false;

  const cooldowns = getCooldownSequence(p.ends_at, now);
  const count = record.dismissalCount;
  if (count >= cooldowns.length) return false;

  if (count > 0) {
    const cooldownMs = cooldowns[count - 1];
    if (cooldownMs === Infinity) return false;
    const dismissedAt = parseUtcDate(record.lastDismissedAt);
    if (dismissedAt && now.getTime() - dismissedAt.getTime() < cooldownMs) return false;
  }

  // Short-lived: < 24h remaining → at most 1 total display
  if (p.ends_at) {
    const endsAt = parseUtcDate(p.ends_at);
    if (endsAt) {
      if (now >= endsAt) return false;
      if (endsAt.getTime() - now.getTime() < H24 && record.lastShownAt) return false;
    }
  }

  return true;
}

// ─── Deterministic campaign selection ────────────────────────────────────────
function categoryOf(p: EligiblePromotionDto): number {
  if (p.trigger_type === 'USER_CLAIM' && p.benefit_type === 'FREE_PREMIUM') return 0;
  if (p.trigger_type === 'USER_CLAIM' && p.benefit_type === 'CREDITS') return 1;
  if (p.benefit_type === 'FREE_PREMIUM') return 2;
  if (p.benefit_type === 'CREDITS') return 3;
  if (p.trigger_type === 'PURCHASE' && p.benefit_type === 'DISCOUNT') return 4;
  return 5;
}

export function selectPromotion(candidates: EligiblePromotionDto[]): EligiblePromotionDto | null {
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => {
    const catDiff = categoryOf(a) - categoryOf(b);
    if (catDiff !== 0) return catDiff;
    const priDiff = (b.priority ?? 0) - (a.priority ?? 0);
    if (priDiff !== 0) return priDiff;
    const aStart = parseUtcDate(a.starts_at)?.getTime() ?? 0;
    const bStart = parseUtcDate(b.starts_at)?.getTime() ?? 0;
    if (bStart !== aStart) return bStart - aStart; // newer first
    return a.campaign_key.localeCompare(b.campaign_key);
  })[0] ?? null;
}

export { selectPromotion as selectPromotionToDisplay };

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useEligiblePromotions(userId?: string) {
  const qc = useQueryClient();
  const { entitlements } = useEntitlements();
  const store = usePromotionStore();

  const query = useQuery<EligiblePromotionDto[]>({
    queryKey: PROMOTIONS_KEY,
    queryFn: fetchEligiblePromotions,
    staleTime: 2 * 60_000,
    retry: 1,
  });

  const hasActivePremium = useMemo(
    () =>
      isPremiumPlan(entitlements?.plan) &&
      isActiveSubscription(entitlements?.subscription),
    [entitlements?.plan, entitlements?.subscription],
  );

  const tryShowPromotion = useCallback(async (): Promise<EligiblePromotionDto | null> => {
    if (__DEV__) console.log('[promo] tryShowPromotion called, userId:', userId, 'hasActivePremium:', hasActivePremium);
    if (!userId) {
      if (__DEV__) console.log('[promo] blocked: no userId');
      return null;
    }
    // Premium users can still receive CREDITS promotions. We don't bail early
    // here; instead non-CREDITS promotions are filtered out below.
    if (!store.acquireDisplayLock()) {
      if (__DEV__) console.log('[promo] blocked: display lock held');
      return null;
    }

    try {
      const fresh = await qc.fetchQuery<EligiblePromotionDto[]>({
        queryKey: PROMOTIONS_KEY,
        queryFn: fetchEligiblePromotions,
        staleTime: 0,
      });
      if (__DEV__) console.log('[promo] fresh promotions:', fresh?.length, JSON.stringify(fresh?.map(p => ({ key: p.campaign_key, status: p.status, trigger: p.trigger_type, canRedeem: p.can_redeem, benefit: p.benefit_type }))));

      const now = new Date();
      const displayable = fresh.filter((p) => {
        // Premium users should only see CREDITS promotions.
        if (hasActivePremium && p.benefit_type !== 'CREDITS') {
          if (__DEV__) console.log('[promo] skipping non-CREDITS for premium user:', p.campaign_key, 'benefit:', p.benefit_type);
          return false;
        }
        const structValid = isPromoStructurallyValid(p);
        if (!structValid) {
          if (__DEV__) console.log('[promo] structurally invalid:', p.campaign_key, 'status:', p.status, 'trigger:', p.trigger_type, 'eligibility:', p.eligibility_type, 'benefit:', p.benefit_type, 'starts_at:', p.starts_at);
          return false;
        }
        const timeValid = isPromoCurrentlyValid(p, now);
        if (!timeValid) {
          if (__DEV__) console.log('[promo] not currently valid:', p.campaign_key, 'status:', p.status, 'starts_at:', p.starts_at, 'ends_at:', p.ends_at, 'now:', now.toISOString());
          return false;
        }
        const record = store.getRecord(userId, p.campaign_key);
        const canShow = canShowCampaign(p, record, userId, store, now);
        if (!canShow) {
          if (__DEV__) console.log('[promo] canShowCampaign false:', p.campaign_key, 'record:', JSON.stringify(record), 'sessionShown:', store.isShownThisSession(userId, p.campaign_key));
          return false;
        }
        if (__DEV__) console.log('[promo] displayable:', p.campaign_key);
        return true;
      });

      if (__DEV__) console.log('[promo] displayable count:', displayable.length);
      const selected = selectPromotion(displayable);
      if (__DEV__) console.log('[promo] selected:', selected?.campaign_key ?? 'none');
      if (!selected) return null;

      store.recordShown(userId, selected.campaign_key);
      store.markShownThisSession(userId, selected.campaign_key);
      return selected;
    } catch (err) {
      if (__DEV__) console.log('[promo] error in tryShowPromotion:', err);
      return null;
    } finally {
      store.releaseDisplayLock();
    }
  }, [userId, hasActivePremium, store, qc]);

  return {
    ...query,
    hasActivePremium,
    tryShowPromotion,
  };
}
