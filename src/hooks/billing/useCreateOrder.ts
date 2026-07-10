import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { createOrder } from '@/api/billing/billingApi';
import { useBillingStore } from '@/stores/billing-store';
import type { CreateOrderRequest, OrderResponse } from '@/types/billing';
import { generateUUID } from '@/utils/uuid';
import { useBillingPlatform } from './useBillingPlatform';
import { PENDING_ORDERS_KEY } from './useOrders';

export function useCreateOrder() {
  const qc = useQueryClient();
  const inProgressRef = useRef(false);
  const platform = useBillingPlatform();
  const {
    orderIdempotencyKey,
    setOrderIdempotencyKey,
    clearOrderIdempotencyKey,
    setActiveOrder,
  } = useBillingStore();

  const mutation = useMutation<OrderResponse, Error, { paymentOfferId: string; paymentMethodId: string }>({
    mutationFn: async ({ paymentOfferId, paymentMethodId }) => {
      if (inProgressRef.current) {
        throw new Error('Order creation already in progress');
      }
      inProgressRef.current = true;

      let key = orderIdempotencyKey;
      if (!key) {
        key = generateUUID();
        setOrderIdempotencyKey(key);
      }

      const body: CreateOrderRequest = {
        payment_offer_id: paymentOfferId,
        payment_method_id: paymentMethodId,
        idempotency_key: key,
        platform,
      };

      return createOrder(body);
    },
    onSuccess: (order) => {
      setActiveOrder(order);
      clearOrderIdempotencyKey();
      inProgressRef.current = false;
      qc.invalidateQueries({ queryKey: PENDING_ORDERS_KEY });
    },
    onError: () => {
      inProgressRef.current = false;
    },
  });

  const startNewOrder = () => {
    clearOrderIdempotencyKey();
    setOrderIdempotencyKey(generateUUID());
  };

  return { ...mutation, startNewOrder };
}
