import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { fetchEligiblePromotions } from '@/api/billing/billingApi';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import type { EligiblePromotionDto } from '@/types/billing';
import { isActiveSubscription, isPremiumPlan } from '@/types/billing';

export const PROMOTIONS_KEY = ['billing', 'promotions'] as const;

export function selectPromotionToDisplay(
  promotions: EligiblePromotionDto[],
): EligiblePromotionDto | null {
  if (!promotions.length) return null;

  // 1. USER_CLAIM with canRedeem = true
  const claimable = promotions.find(
    (p) => p.trigger_type === 'USER_CLAIM' && p.can_redeem,
  );
  if (claimable) return claimable;

  // 2. FREE_PREMIUM (any trigger)
  const freePremium = promotions.find((p) => p.benefit_type === 'FREE_PREMIUM');
  if (freePremium) return freePremium;

  // 3. PURCHASE ending soonest
  const purchaseWithEnd = promotions
    .filter((p) => p.trigger_type === 'PURCHASE' && p.ends_at != null)
    .sort(
      (a, b) =>
        new Date(a.ends_at!).getTime() - new Date(b.ends_at!).getTime(),
    );
  if (purchaseWithEnd.length > 0) return purchaseWithEnd[0];

  // 4. Any remaining PURCHASE discount
  return promotions.find((p) => p.trigger_type === 'PURCHASE') ?? null;
}

export function useEligiblePromotions() {
  const qc = useQueryClient();
  const { entitlements } = useEntitlements();

  const query = useQuery<EligiblePromotionDto[]>({
    queryKey: PROMOTIONS_KEY,
    queryFn: fetchEligiblePromotions,
    staleTime: 2 * 60_000,
    retry: 1,
  });

  const refreshPromotions = useCallback(
    () => qc.invalidateQueries({ queryKey: PROMOTIONS_KEY }),
    [qc],
  );

  const hasActivePremium = useMemo(
    () =>
      isPremiumPlan(entitlements?.plan) &&
      isActiveSubscription(entitlements?.subscription),
    [entitlements?.plan, entitlements?.subscription],
  );

  const promotions = useMemo(
    () => (hasActivePremium ? [] : query.data ?? []),
    [hasActivePremium, query.data],
  );

  return {
    ...query,
    promotions,
    refreshPromotions,
    selectedPromotion: selectPromotionToDisplay(promotions),
  };
}
