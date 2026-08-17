import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchEntitlements } from '@/api/billing/billingApi';
import {
    purchaseRevenueCatPackage,
    type PurchasesPackage,
} from '@/services/billing/revenueCatService';
import type { EntitlementResponse } from '@/types/billing';
import { isActiveSubscription, isFreePremiumPlan, isPremiumPlan } from '@/types/billing';
import { ENTITLEMENTS_KEY } from './useEntitlements';

const POLL_ATTEMPTS = 8;
const POLL_DELAY_MS = 3000;

function totalCredits(e: EntitlementResponse): number {
  return e.credits.credit_balance;
}

async function pollForEntitlementChange(
  qc: ReturnType<typeof useQueryClient>,
  isConfirmed: (e: EntitlementResponse) => boolean,
  label: string,
): Promise<boolean> {
  for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt++) {
    await qc.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
    const entitlements = await qc.fetchQuery<EntitlementResponse>({
      queryKey: ENTITLEMENTS_KEY,
      queryFn: fetchEntitlements,
    });

    if (isConfirmed(entitlements)) {
      return true;
    }

    if (__DEV__) {
      console.log(
        `[RC Purchase] ${label} poll attempt ${attempt}/${POLL_ATTEMPTS}`,
        '| plan:', entitlements.plan,
        '| status:', entitlements.subscription?.status ?? 'null',
        '| credits:', totalCredits(entitlements),
      );
    }

    if (attempt < POLL_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
    }
  }

  return false;
}

export type CreditsDelta = {
  credits: number;
};

export type RcPurchaseState =
  | 'idle'
  | 'purchasing'
  | 'processing'
  | 'confirmed'
  | 'pending'
  | 'cancelled'
  | 'error';

export function useRevenueCatPurchase() {
  const qc = useQueryClient();
  const [purchaseState, setPurchaseState] = useState<RcPurchaseState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [creditsDelta, setCreditsDelta] = useState<CreditsDelta | null>(null);

  const mutation = useMutation<void, Error, { pkg: PurchasesPackage; productType: 'SUBSCRIPTION' | 'CONSUMABLE' }>({
    mutationFn: async ({ pkg, productType }) => {
      setPurchaseState('purchasing');
      setErrorMessage(null);

      const beforeEntitlements = qc.getQueryData<EntitlementResponse>(ENTITLEMENTS_KEY);
      const beforeCredits = beforeEntitlements ? totalCredits(beforeEntitlements) : 0;
      const before = beforeEntitlements?.credits;

      const { cancelled } = await purchaseRevenueCatPackage(pkg);

      if (cancelled) {
        setPurchaseState('cancelled');
        return;
      }

      setPurchaseState('processing');

      const isSubscription = productType === 'SUBSCRIPTION';
      const confirmed = await pollForEntitlementChange(
        qc,
        isSubscription
          ? (e) => isPremiumPlan(e.plan) && !isFreePremiumPlan(e.plan) && isActiveSubscription(e.subscription)
          : (e) => totalCredits(e) > beforeCredits,
        isSubscription ? 'subscription' : 'consumable',
      );

      if (confirmed && !isSubscription && before) {
        const afterEntitlements = qc.getQueryData<EntitlementResponse>(ENTITLEMENTS_KEY);
        if (afterEntitlements) {
          setCreditsDelta({
            credits: afterEntitlements.credits.credit_balance - before.credit_balance,
          });
        }
      }

      setPurchaseState(confirmed ? 'confirmed' : 'pending');
    },
    onError: (e) => {
      setErrorMessage(e.message ?? 'Purchase failed');
      setPurchaseState('error');
    },
  });

  const reset = useCallback(() => {
    setPurchaseState('idle');
    setErrorMessage(null);
    setCreditsDelta(null);
    mutation.reset();
  }, [mutation]);

  // Auto-reset terminal states so banners don't persist forever
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    if (purchaseState === 'confirmed' || purchaseState === 'cancelled' || purchaseState === 'error') {
      resetTimerRef.current = setTimeout(() => reset(), 5_000);
    } else if (purchaseState === 'pending') {
      resetTimerRef.current = setTimeout(() => reset(), 15_000);
    }

    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, [purchaseState, reset]);

  return {
    purchase: mutation.mutate,
    purchaseAsync: mutation.mutateAsync,
    purchaseState,
    errorMessage,
    creditsDelta,
    reset,
    isPurchasing: mutation.isPending,
  };
}
