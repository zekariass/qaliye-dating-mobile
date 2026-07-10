import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import { fetchOffers } from '@/api/billing/billingApi';
import type { BillingPlatform, OfferDto, ProductType } from '@/types/billing';
import { useBillingPlatform } from './useBillingPlatform';

export const OFFERS_KEY = (platform: BillingPlatform) =>
  ['billing', 'offers', platform] as const;

export function useOffers(productType?: ProductType) {
  const platform = useBillingPlatform();
  const qc = useQueryClient();

  const query = useQuery<OfferDto[]>({
    queryKey: OFFERS_KEY(platform),
    queryFn: () => fetchOffers(platform),
    staleTime: 5 * 60_000,
    retry: 2,
    enabled: Platform.OS !== 'web',
  });

  const allOffers = (query.data ?? []).filter((o) => o.has_available_payment_methods);

  const filteredOffers = productType == null
    ? allOffers
    : allOffers.filter((o) => o.product_type === productType);

  const subscriptionOffers = allOffers.filter((o) => o.product_type === 'SUBSCRIPTION');
  const consumableOffers = allOffers.filter((o) => o.product_type === 'CONSUMABLE');

  const invalidateOffers = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['billing', 'offers'] });
  }, [qc]);

  return {
    ...query,
    platform,
    allOffers: filteredOffers,
    subscriptionOffers,
    consumableOffers,
    invalidateOffers,
  };
}
