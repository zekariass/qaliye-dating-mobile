import { useQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { fetchPaymentOptions } from '@/api/billing/billingApi';
import type { BillingPlatform, PaymentChannel, PaymentOptionsResponse } from '@/types/billing';
import { useBillingPlatform } from './useBillingPlatform';

export const PAYMENT_OPTIONS_KEY = (platform: BillingPlatform, channel?: PaymentChannel) =>
  ['billing', 'payment-options', platform, channel ?? 'all'] as const;

export function usePaymentOptions(channel?: PaymentChannel) {
  const platform = useBillingPlatform();

  const query = useQuery<PaymentOptionsResponse>({
    queryKey: PAYMENT_OPTIONS_KEY(platform, channel),
    queryFn: () => fetchPaymentOptions(platform, channel),
    staleTime: 30_000,
    retry: 2,
    enabled: Platform.OS !== 'web',
  });

  const paymentMethods = query.data?.payment_methods ?? [];
  const resolvedMarketCountryCode = query.data?.resolved_market_country_code ?? null;
  const billingCountryCode = query.data?.billing_country_code ?? null;

  return {
    ...query,
    platform,
    paymentMethods,
    resolvedMarketCountryCode,
    billingCountryCode,
  };
}
