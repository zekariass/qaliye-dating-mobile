import { useCallback, useRef } from 'react';

import { markDelivered, markRead } from '@/api/chat/chatApi';
import { useChatStore } from '@/stores/chat-store';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 500;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useReceipts(matchId: string) {
  const deliveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDelivery = useRef<number>(0);
  const pendingRead = useRef<number>(0);

  const scheduleDeliveryReceipt = useCallback(
    (upToSequence: number) => {
      const state = useChatStore.getState();
      if (upToSequence <= state.lastDeliveredReceiptSent) return;
      if (upToSequence <= state.receiptState.myLastDeliveredSequence) return;

      pendingDelivery.current = Math.max(pendingDelivery.current, upToSequence);

      if (deliveryTimer.current) clearTimeout(deliveryTimer.current);
      deliveryTimer.current = setTimeout(async () => {
        const seq = pendingDelivery.current;
        if (seq <= 0) return;
        pendingDelivery.current = 0;

        console.log('[useReceipts] Sending delivery receipt up to sequence:', seq);
        try {
          await markDelivered(matchId, { up_to_sequence: seq });
          console.log('[useReceipts] Delivery receipt sent successfully');
          useChatStore.setState({ lastDeliveredReceiptSent: seq });
          useChatStore.getState().updateReceiptState({
            myLastDeliveredSequence: seq,
          });
        } catch (err) {
          console.error('[useReceipts] Delivery receipt failed:', err);
          // Will be retried on next merge
        }
      }, DEBOUNCE_MS);
    },
    [matchId],
  );

  const scheduleReadReceipt = useCallback(
    (upToSequence: number) => {
      const state = useChatStore.getState();
      if (upToSequence <= state.lastReadReceiptSent) return;
      if (upToSequence <= state.receiptState.myLastReadSequence) return;

      pendingRead.current = Math.max(pendingRead.current, upToSequence);

      if (readTimer.current) clearTimeout(readTimer.current);
      readTimer.current = setTimeout(async () => {
        const seq = pendingRead.current;
        if (seq <= 0) return;
        pendingRead.current = 0;

        console.log('[useReceipts] Sending read receipt up to sequence:', seq);
        try {
          await markRead(matchId, { up_to_sequence: seq });
          console.log('[useReceipts] Read receipt sent successfully');
          useChatStore.setState({ lastReadReceiptSent: seq });
          useChatStore.getState().updateReceiptState({
            myLastReadSequence: seq,
            myLastDeliveredSequence: seq,
          });
        } catch (err) {
          console.error('[useReceipts] Read receipt failed:', err);
          // Will be retried on next visible check
        }
      }, DEBOUNCE_MS);
    },
    [matchId],
  );

  const cancelTimers = useCallback(() => {
    if (deliveryTimer.current) {
      clearTimeout(deliveryTimer.current);
      deliveryTimer.current = null;
    }
    if (readTimer.current) {
      clearTimeout(readTimer.current);
      readTimer.current = null;
    }
    pendingDelivery.current = 0;
    pendingRead.current = 0;
  }, []);

  return {
    scheduleDeliveryReceipt,
    scheduleReadReceipt,
    cancelTimers,
  };
}
