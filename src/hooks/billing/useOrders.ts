import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchOrders } from '@/api/billing/billingApi';
import type { OrderListItem, OrderListResponse } from '@/types/billing';

const PENDING_STATUSES = 'CREATED,AWAITING_PAYMENT,VERIFICATION_PENDING,MANUAL_REVIEW,RECEIPT_SUBMITTED';

export const ORDERS_KEY = ['billing', 'orders'] as const;
export const PENDING_ORDERS_KEY = ['billing', 'orders', 'pending'] as const;

export function usePendingOrders(enabled = true) {
  const query = useQuery<OrderListResponse>({
    queryKey: PENDING_ORDERS_KEY,
    queryFn: () =>
      fetchOrders({ statuses: PENDING_STATUSES, page: 1, page_size: 20 }),
    staleTime: 30_000,
    retry: 2,
    enabled,
  });

  const orders = query.data?.orders ?? [];
  const pendingCount = orders.filter(
    (o) =>
      o.status === 'CREATED' ||
      o.status === 'AWAITING_PAYMENT' ||
      o.status === 'VERIFICATION_PENDING' ||
      o.status === 'MANUAL_REVIEW' ||
      o.status === 'ADMIN_REVIEW' ||
      o.status === 'REVIEW_REQUIRED',
  ).length;
  const requiresActionCount = orders.filter((o) => o.status === 'AWAITING_PAYMENT').length;

  return {
    ...query,
    orders,
    pendingCount,
    requiresActionCount,
  };
}

export function useOrdersHistory(enabled = true) {
  return useInfiniteQuery<OrderListResponse>({
    queryKey: ORDERS_KEY,
    queryFn: ({ pageParam }) =>
      fetchOrders({ page: pageParam as number, page_size: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page >= lastPage.total_pages) return undefined;
      return lastPage.page + 1;
    },
    staleTime: 60_000,
    retry: 2,
    enabled,
  });
}

export function useOrders(enabled = true) {
  const pending = usePendingOrders(enabled);
  const history = useOrdersHistory(enabled);

  return {
    pendingOrders: pending.orders,
    pendingCount: pending.pendingCount,
    requiresActionCount: pending.requiresActionCount,
    isPendingLoading: pending.isLoading,
    refreshPending: pending.refetch,
    historyPages: history.data?.pages ?? [],
    historyOrders:
      history.data?.pages.flatMap((page) => page.orders) ?? ([] as OrderListItem[]),
    fetchNextHistoryPage: history.fetchNextPage,
    hasNextHistoryPage: history.hasNextPage,
    isHistoryLoading: history.isLoading,
    isHistoryFetchingNext: history.isFetchingNextPage,
    refreshHistory: history.refetch,
  };
}
