import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchOrder, verifyChapaPayment } from '@/api/billing/billingApi';
import type { OrderResponse } from '@/types/billing';
import { ORDER_TERMINAL_STATUSES, POLLING_ORDER_STATUSES } from '@/types/billing';
import { ENTITLEMENTS_KEY } from './useEntitlements';

const POLL_INTERVAL_MS = 5_000;
const POLL_DURATION_MS = 120_000;

export const ORDER_KEY = (orderId: string) =>
  ['billing', 'order', orderId] as const;

export function useOrderStatus(orderId: string | null) {
  const qc = useQueryClient();
  const pollingUntilRef = useRef<number>(0);
  const [isPolling, setIsPolling] = useState(false);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (!isPolling) return;
    const timeout = setTimeout(() => setIsPolling(false), POLL_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [isPolling]);

  const query = useQuery<OrderResponse>({
    queryKey: ORDER_KEY(orderId ?? ''),
    queryFn: () => fetchOrder(orderId!),
    enabled: !!orderId,
    staleTime: 0,
    refetchInterval: (q) => {
      if (!q.state.data) return false;
      const status = q.state.data.status;
      if (!POLLING_ORDER_STATUSES.includes(status)) return false;
      return Date.now() < pollingUntilRef.current ? POLL_INTERVAL_MS : false;
    },
  });

  const order = query.data ?? null;

  const startPolling = useCallback((durationMs = POLL_DURATION_MS) => {
    pollingUntilRef.current = Date.now() + durationMs;
    setIsPolling(true);
  }, []);

  useEffect(() => {
    if (order && !autoStartedRef.current && POLLING_ORDER_STATUSES.includes(order.status)) {
      autoStartedRef.current = true;
      startPolling();
      query.refetch().catch(() => {});
    }
  }, [order, startPolling, query]);

  useEffect(() => {
    if (order && !POLLING_ORDER_STATUSES.includes(order.status) && isPolling) {
      pollingUntilRef.current = 0;
      setIsPolling(false);
    }
  }, [order?.status, isPolling]);

  const isTerminal = order ? ORDER_TERMINAL_STATUSES.includes(order.status) : false;

  const isChapaOrder = !!(order?.provider_checkout_url || order?.method_code === 'chapa' || order?.payment_method === 'CHAPA');

  const refresh = useCallback(async () => {
    let result;
    if (order && POLLING_ORDER_STATUSES.includes(order.status)) {
      result = await query.refetch();
      startPolling();
    } else {
      result = await query.refetch();
    }
    const status = result.data?.status;
    if (status === 'VERIFIED' || status === 'FULFILLED') {
      qc.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
    }
  }, [order?.status, startPolling, query, qc]);

  const verifyChapa = useCallback(async () => {
    if (!orderId) return;
    try {
      const updated = await verifyChapaPayment(orderId);
      qc.setQueryData(ORDER_KEY(orderId), updated);
      if (updated.status === 'VERIFIED' || updated.status === 'FULFILLED') {
        qc.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
      }
      if (POLLING_ORDER_STATUSES.includes(updated.status)) {
        startPolling();
      }
    } catch {
      // verify failed — fall back to GET refresh
      await query.refetch();
    }
  }, [orderId, qc, startPolling, query]);

  return { ...query, order, isTerminal, isPolling, isChapaOrder, refresh, verifyChapa };
}
