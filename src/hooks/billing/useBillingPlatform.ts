import { Platform } from 'react-native';

import type { BillingPlatform } from '@/types/billing';

export function useBillingPlatform(): BillingPlatform {
  if (Platform.OS === 'ios') return 'IOS';
  if (Platform.OS === 'android') return 'ANDROID';
  return 'WEB';
}
