import { useMutation, useQueryClient } from '@tanstack/react-query';

import { verifyManualPayment } from '@/api/billing/billingApi';
import type { OrderResponse, VerifyPaymentRequest } from '@/types/billing';
import { ORDERS_KEY, PENDING_ORDERS_KEY } from './useOrders';
import { ORDER_KEY } from './useOrderStatus';

export function useVerifyPayment(orderId: string) {
  const qc = useQueryClient();

  return useMutation<OrderResponse, Error, VerifyPaymentRequest>({
    mutationFn: (body) => verifyManualPayment(orderId, body),
    onSuccess: (updatedOrder) => {
      qc.setQueryData(ORDER_KEY(orderId), updatedOrder);
      qc.invalidateQueries({ queryKey: PENDING_ORDERS_KEY });
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
    },
  });
}
