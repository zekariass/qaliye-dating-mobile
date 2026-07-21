import * as Linking from 'expo-linking';
import * as StoreReview from 'expo-store-review';
import { useCallback } from 'react';

export function useRateUs() {
  const rateUs = useCallback(async () => {
    try {
      const url = StoreReview.storeUrl();
      if (url) {
        await Linking.openURL(url);
      }
    } catch {
      // Non-fatal — silently ignore
    }
  }, []);

  return { rateUs };
}
