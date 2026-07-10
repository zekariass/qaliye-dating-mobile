import { useQuery } from '@tanstack/react-query';

import { fetchPaymentChannels } from '@/api/billing/billingApi';
import type { BillingPlatform, PaymentChannelOptionDto } from '@/types/billing';
import { useBillingPlatform } from './useBillingPlatform';

export const PAYMENT_CHANNELS_KEY = (platform: BillingPlatform) =>
  ['billing', 'payment-channels', platform] as const;

export function usePaymentChannels() {
  const platform = useBillingPlatform();

  const query = useQuery<PaymentChannelOptionDto[]>({
    queryKey: PAYMENT_CHANNELS_KEY(platform),
    queryFn: () => fetchPaymentChannels(platform),
    staleTime: 5 * 60_000,
    retry: 2,
  });

  return {
    ...query,
    channels: Array.isArray(query.data) ? query.data : [],
  };
}
