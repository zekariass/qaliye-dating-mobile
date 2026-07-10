import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Platform } from 'react-native';

import { fetchEntitlements } from '@/api/billing/billingApi';
import {
    restoreRevenueCatPurchases,
} from '@/services/billing/revenueCatService';
import type { EntitlementResponse } from '@/types/billing';
import { isActiveSubscription, isPremiumPlan } from '@/types/billing';
import { ENTITLEMENTS_KEY } from './useEntitlements';

export type RestoreState = 'idle' | 'restoring' | 'done' | 'error';
export type RestoreResult = 'success' | 'no_purchase' | 'error' | null;

export function useRevenueCatRestore() {
  const qc = useQueryClient();
  const [restoreState, setRestoreState] = useState<RestoreState>('idle');
  const [restoreResult, setRestoreResult] = useState<RestoreResult>(null);

  const mutation = useMutation<void, Error>({
    mutationFn: async () => {
      if (Platform.OS === 'web') return;
      setRestoreState('restoring');
      setRestoreResult(null);
      await restoreRevenueCatPurchases();
      await qc.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
      const entitlements = await qc.fetchQuery<EntitlementResponse>({
        queryKey: ENTITLEMENTS_KEY,
        queryFn: fetchEntitlements,
      });
      if (isPremiumPlan(entitlements.plan) && isActiveSubscription(entitlements.subscription)) {
        setRestoreResult('success');
      } else {
        setRestoreResult('no_purchase');
      }
      setRestoreState('done');
    },
    onError: () => {
      setRestoreState('error');
      setRestoreResult('error');
    },
  });

  return {
    restore: mutation.mutate,
    restoreState,
    restoreResult,
    isRestoring: mutation.isPending,
  };
}
