import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { verifyManualTransfer } from '@/api/billing/billingApi';
import type { ManualTransferVerifyRequest, ManualTransferVerifyResponse } from '@/types/billing';
import { generateUUID } from '@/utils/uuid';
import { useBillingPlatform } from './useBillingPlatform';
import { ORDERS_KEY, PENDING_ORDERS_KEY } from './useOrders';

export function useManualTransferVerify() {
  const qc = useQueryClient();
  const platform = useBillingPlatform();
  const idempotencyKeyRef = useRef<string | null>(null);

  return useMutation<ManualTransferVerifyResponse, Error, Omit<ManualTransferVerifyRequest, 'platform' | 'idempotency_key'>>({
    mutationFn: async (body) => {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = generateUUID();
      }

      return verifyManualTransfer({
        ...body,
        platform,
        idempotency_key: idempotencyKeyRef.current,
      });
    },
    onSuccess: (response) => {
      idempotencyKeyRef.current = null;
      qc.invalidateQueries({ queryKey: PENDING_ORDERS_KEY });
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
    },
    onError: () => {
      idempotencyKeyRef.current = null;
    },
  });
}
