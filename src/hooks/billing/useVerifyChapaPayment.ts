import { useMutation, useQueryClient } from '@tanstack/react-query';

import { verifyChapaPayment } from '@/api/billing/billingApi';
import type { OrderResponse } from '@/types/billing';
import { ENTITLEMENTS_KEY } from './useEntitlements';
import { ORDERS_KEY, PENDING_ORDERS_KEY } from './useOrders';
import { ORDER_KEY } from './useOrderStatus';

export function useVerifyChapaPayment(orderId: string | null) {
  const qc = useQueryClient();

  return useMutation<OrderResponse, Error, void>({
    mutationFn: () => {
      if (!orderId) throw new Error('No order ID');
      return verifyChapaPayment(orderId);
    },
    onSuccess: (updatedOrder) => {
      if (orderId) {
        qc.setQueryData(ORDER_KEY(orderId), updatedOrder);
      }
      qc.invalidateQueries({ queryKey: PENDING_ORDERS_KEY });
      qc.invalidateQueries({ queryKey: ORDERS_KEY });
      if (updatedOrder.status === 'VERIFIED' || updatedOrder.status === 'FULFILLED') {
        qc.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
      }
    },
  });
}
