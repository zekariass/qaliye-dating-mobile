import { useCallback, useState } from 'react';
import { Linking } from 'react-native';

import { getRevenueCatManagementURL } from '@/services/billing/revenueCatService';
import type { SubscriptionProvider } from '@/types/billing';

export type ManageSubscriptionResult = {
  manage: (provider: SubscriptionProvider) => Promise<void>;
  isManaging: boolean;
  error: string | null;
};

export function useManageSubscription(): ManageSubscriptionResult {
  const [isManaging, setIsManaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manage = useCallback(async (provider: SubscriptionProvider) => {
    if (isManaging) return;
    setIsManaging(true);
    setError(null);

    try {
      let url: string | null = null;

      if (provider === 'GOOGLE_PLAY') {
        url = 'https://play.google.com/store/account/subscriptions';
      } else if (provider === 'APPLE_APP_STORE') {
        url = 'https://apps.apple.com/account/subscriptions';
      } else if (provider === 'REVENUECAT') {
        url = await getRevenueCatManagementURL();
        if (!url) {
          setError(
            'Unable to retrieve your subscription management link. Please try again later or contact support.',
          );
          setIsManaging(false);
          return;
        }
      } else {
        setError('Subscription management is not available for this provider.');
        setIsManaging(false);
        return;
      }

      if (!url) {
        setError('Subscription management is not available for this provider.');
        setIsManaging(false);
        return;
      }

      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        setError('Unable to open the subscription management page.');
        setIsManaging(false);
        return;
      }

      await Linking.openURL(url);
    } catch {
      setError('Something went wrong while opening subscription management.');
    } finally {
      setIsManaging(false);
    }
  }, [isManaging]);

  return { manage, isManaging, error };
}
