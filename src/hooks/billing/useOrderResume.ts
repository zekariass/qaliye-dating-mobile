import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { fetchOrder } from '@/api/billing/billingApi';
import type { OrderListItem } from '@/types/billing';

export function useOrderResume() {
  const router = useRouter();

  const resume = useCallback(
    async (order: OrderListItem) => {
      const detail = await fetchOrder(order.id);
      if (detail.provider_checkout_url) {
        router.push({
          pathname: '/(app)/order-status',
          params: { orderId: detail.id, checkoutUrl: detail.provider_checkout_url },
        } as any);
      } else {
        const inProgress =
          detail.status === 'VERIFICATION_PENDING' ||
          detail.status === 'MANUAL_REVIEW' ||
          detail.status === 'ADMIN_REVIEW' ||
          detail.status === 'REVIEW_REQUIRED';
        router.push({
          pathname: '/(app)/manual-payment',
          params: { orderId: detail.id, initialStep: inProgress ? 'status' : 'form' },
        } as any);
      }
    },
    [router],
  );

  const viewDetail = useCallback(
    (order: OrderListItem) => {
      router.push({
        pathname: '/(app)/order-status',
        params: { orderId: order.id },
      } as any);
    },
    [router],
  );

  const retry = useCallback(
    (order: OrderListItem) => {
      const pathname =
        order.product_type === 'SUBSCRIPTION' ? '/(app)/premium' : '/(app)/credits-shop';
      router.push({
        pathname: pathname as any,
        params: order.product_type === 'CONSUMABLE' ? { focus: order.product_code } : {},
      } as any);
    },
    [router],
  );

  return {
    resume,
    viewDetail,
    retry,
  };
}
