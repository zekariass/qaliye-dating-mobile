import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { activateBoost } from '@/api/billing/billingApi';
import { useBillingStore } from '@/stores/billing-store';
import type { BoostActivationResponse } from '@/types/billing';
import { generateUUID } from '@/utils/uuid';
import { ENTITLEMENTS_KEY } from './useEntitlements';

export type BoostActivationError = {
  code: 'BOOST_ALREADY_ACTIVE' | 'INSUFFICIENT_CREDITS' | 'INSUFFICIENT_BOOST_CREDITS' | 'UNKNOWN';
  message: string;
};

export function useActivateBoost() {
  const qc = useQueryClient();
  const inProgressRef = useRef(false);
  const {
    boostIdempotencyKey,
    setBoostIdempotencyKey,
    clearBoostIdempotencyKey,
  } = useBillingStore();

  const mutation = useMutation<BoostActivationResponse, BoostActivationError>({
    mutationFn: async () => {
      if (inProgressRef.current) {
        throw { code: 'UNKNOWN', message: 'Activation already in progress' };
      }
      inProgressRef.current = true;

      let key = boostIdempotencyKey;
      if (!key) {
        key = generateUUID();
        setBoostIdempotencyKey(key);
      }

      try {
        return await activateBoost({ idempotency_key: key });
      } catch (e: unknown) {
        if ((e as any)?.isInsufficientCredits === true) {
          throw e;
        }
        const err = e as { response?: { status: number; data?: { error?: { code?: string; message?: string } } } };
        // 402 Payment Required — insufficient credits
        if (err.response?.status === 402) {
          const code = err.response?.data?.error?.code ?? '';
          if (code.toLowerCase() === 'insufficient_credits') {
            throw {
              code: 'INSUFFICIENT_CREDITS',
              message: err.response?.data?.error?.message ?? "You don't have enough credits for this action.",
            } as BoostActivationError;
          }
        }
        if (err.response?.status === 409) {
          throw { code: 'BOOST_ALREADY_ACTIVE', message: 'A boost is already active' } as BoostActivationError;
        }
        throw { code: 'UNKNOWN', message: 'Could not activate boost' } as BoostActivationError;
      }
    },
    onSuccess: () => {
      inProgressRef.current = false;
      clearBoostIdempotencyKey();
      qc.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
    },
    onError: () => {
      inProgressRef.current = false;
    },
  });

  return mutation;
}
