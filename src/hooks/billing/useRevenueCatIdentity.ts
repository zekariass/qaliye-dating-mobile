import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import {
  configureRevenueCat,
  identifyRevenueCatUser,
  logOutRevenueCat,
} from '@/services/billing/revenueCatService';
import { useCurrentUserId } from '@/hooks/auth/useCurrentUserId';

export function useRevenueCatIdentity() {
  const userId = useCurrentUserId();
  const identifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    configureRevenueCat();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (userId && identifiedRef.current !== userId) {
      identifiedRef.current = userId;
      identifyRevenueCatUser(userId);
    }
    if (!userId && identifiedRef.current) {
      identifiedRef.current = null;
      logOutRevenueCat();
    }
  }, [userId]);
}
