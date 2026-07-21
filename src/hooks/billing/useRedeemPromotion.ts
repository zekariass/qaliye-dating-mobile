import { useMutation, useQueryClient } from '@tanstack/react-query';

import { redeemPromotion } from '@/api/billing/billingApi';
import type { RedeemPromotionResponse } from '@/types/billing';
import { ENTITLEMENTS_KEY } from './useEntitlements';
import { PROMOTIONS_KEY } from './useEligiblePromotions';
import { OFFERS_KEY } from './useOffers';
import { useBillingPlatform } from './useBillingPlatform';
import { ORDERS_KEY } from './useOrders';

export function useRedeemPromotion() {
  const qc = useQueryClient();
  const platform = useBillingPlatform();

  return useMutation<RedeemPromotionResponse, Error, string>({
    mutationFn: (campaignKey: string) => redeemPromotion(campaignKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
      qc.invalidateQueries({ queryKey: PROMOTIONS_KEY });
      qc.invalidateQueries({ queryKey: OFFERS_KEY(platform) });
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
    },
  });
}
