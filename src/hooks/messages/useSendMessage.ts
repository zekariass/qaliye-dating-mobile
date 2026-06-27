import { useCallback, useRef } from 'react';

import { sendMessage } from '@/api/chat/chatApi';
import { useChatStore } from '@/stores/chat-store';
import type { ChatMessage } from '@/types/chat';
import { generateUUID } from '@/utils/uuid';

// ---------------------------------------------------------------------------
// Error codes that must NOT be auto-retried
// ---------------------------------------------------------------------------

const NON_RETRYABLE_CODES = new Set([
  'UNAUTHORIZED',
  'ACCOUNT_NOT_ACTIVE',
  'MATCH_ACCESS_DENIED',
  'USER_BLOCKED',
  'MATCH_NOT_FOUND',
  'MATCH_NOT_ACTIVE',
  'IDEMPOTENCY_CONFLICT',
  'INVALID_MESSAGE',
  'INVALID_RECEIPT_SEQUENCE',
  'RATE_LIMITED',
]);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSendMessage(matchId: string, currentUserId: string) {
  const rateLimitedUntil = useRef<number>(0);

  const send = useCallback(
    async (body: string, existingClientMessageId?: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      if (trimmed.length > 2000) return;

      if (Date.now() < rateLimitedUntil.current) {
        return;
      }

      const clientMessageId = existingClientMessageId ?? generateUUID();
      const now = new Date().toISOString();

      if (!existingClientMessageId) {
        const optimistic: ChatMessage = {
          clientMessageId,
          matchId,
          senderUserId: currentUserId,
          isMine: true,
          messageType: 'TEXT',
          body: trimmed,
          createdAt: now,
          editedAt: null,
          localSendStatus: 'SENDING',
        };
        useChatStore.getState().addOptimisticMessage(optimistic);
      } else {
        const state = useChatStore.getState();
        const idx = state.messages.findIndex(
          (m) => m.clientMessageId === clientMessageId,
        );
        if (idx >= 0) {
          const updated = [...state.messages];
          updated[idx] = { ...updated[idx], localSendStatus: 'SENDING', errorCode: undefined };
          useChatStore.setState({ messages: updated });
        }
      }

      try {
        const { data: serverMsg } = await sendMessage(matchId, {
          client_message_id: clientMessageId,
          message_type: 'TEXT',
          body: trimmed,
        });

        const reconciled: ChatMessage = {
          id: serverMsg.id,
          clientMessageId: serverMsg.client_message_id,
          matchId: serverMsg.match_id,
          sequenceNumber: serverMsg.sequence_number,
          senderUserId: serverMsg.sender_user_id,
          isMine: true,
          messageType: serverMsg.message_type,
          body: serverMsg.body,
          createdAt: serverMsg.created_at,
          editedAt: serverMsg.edited_at,
          localSendStatus: 'SENT',
        };

        useChatStore.getState().reconcileMessage(clientMessageId, reconciled);
      } catch (error: any) {
        const responseStatus = error?.response?.status;
        const errorCode =
          error?.response?.data?.code ?? error?.response?.data?.error ?? 'NETWORK_ERROR';

        if (responseStatus === 429) {
          const retryAfter = parseInt(
            error?.response?.headers?.['retry-after'] ?? '30',
            10,
          );
          rateLimitedUntil.current = Date.now() + retryAfter * 1000;
        }

        useChatStore.getState().markMessageFailed(clientMessageId, errorCode);
      }
    },
    [matchId, currentUserId],
  );

  const retry = useCallback(
    (clientMessageId: string) => {
      const msg = useChatStore
        .getState()
        .messages.find((m) => m.clientMessageId === clientMessageId);
      if (!msg || msg.localSendStatus !== 'FAILED') return;
      send(msg.body, clientMessageId);
    },
    [send],
  );

  return { send, retry };
}
