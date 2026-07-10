import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { activateBoost } from '@/api/billing/billingApi';
import { useBillingStore } from '@/stores/billing-store';
import type { BoostActivationResponse } from '@/types/billing';
import { generateUUID } from '@/utils/uuid';
import { ENTITLEMENTS_KEY } from './useEntitlements';

export type BoostActivationError = {
  code: 'BOOST_ALREADY_ACTIVE' | 'INSUFFICIENT_BOOST_CREDITS' | 'UNKNOWN';
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
        const err = e as { response?: { status: number; data?: { code?: string } } };
        if (err.response?.status === 409) {
          throw { code: 'BOOST_ALREADY_ACTIVE', message: 'A boost is already active' } as BoostActivationError;
        }
        if (err.response?.status === 402) {
          throw { code: 'INSUFFICIENT_BOOST_CREDITS', message: 'No boost credits available' } as BoostActivationError;
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
