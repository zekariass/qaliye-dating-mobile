import { Platform } from 'react-native';

import type { BillingPlatform } from '@/types/billing';

export function useBillingPlatform(): BillingPlatform {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return 'MOBILE';
  return 'WEB';
}
