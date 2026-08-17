import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { sendMessage, sendMessageWithAttachments } from '@/api/chat/chatApi';
import { ENTITLEMENTS_KEY } from '@/hooks/billing/useEntitlements';
import { useChatStore } from '@/stores/chat-store';
import type { ChatFileAttachment, ChatMessage } from '@/types/chat';
import { getLimitExceededDetails, isInsufficientCreditsError, isLimitExceededError } from '@/utils/entitlements';
import { generateUUID } from '@/utils/uuid';

export type ChatQuotaError = {
  code: string;
  message: string;
  actionType?: string;
};

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
  const queryClient = useQueryClient();

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
          body: serverMsg.body ?? '',
          createdAt: serverMsg.created_at,
          editedAt: serverMsg.edited_at,
          localSendStatus: 'SENT',
          attachments: serverMsg.attachments?.map((dto) => ({
            id: dto.id,
            messageId: dto.message_id,
            attachmentType: dto.attachment_type,
            fileName: dto.file_name,
            contentType: dto.content_type,
            fileSizeBytes: dto.file_size_bytes,
            durationMs: dto.duration_ms,
            downloadUrl: dto.download_url,
            createdAt: dto.created_at,
          })),
        };

        useChatStore.getState().reconcileMessage(clientMessageId, reconciled);
        queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
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
    [matchId, currentUserId, queryClient],
  );

  // ── Send with attachments (multipart) ─────────────────────────────────────

  const sendWithAttachments = useCallback(
    async (
      body: string,
      files: ChatFileAttachment[],
      existingClientMessageId?: string,
      voiceDurationsMs?: (number | null)[],
    ): Promise<ChatQuotaError | null> => {
      const hasBody = body.trim().length > 0;
      const hasFiles = files.length > 0;
      if (!hasBody && !hasFiles) return null;

      if (Date.now() < rateLimitedUntil.current) return null;

      const clientMessageId = existingClientMessageId ?? generateUUID();
      const now = new Date().toISOString();

      if (!existingClientMessageId) {
        const optimistic: ChatMessage = {
          clientMessageId,
          matchId,
          senderUserId: currentUserId,
          isMine: true,
          messageType: 'TEXT',
          body: body.trim(),
          createdAt: now,
          editedAt: null,
          localSendStatus: 'SENDING',
          pendingFiles: files,
          pendingVoiceDurations: voiceDurationsMs,
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
        const formData = new FormData();
        formData.append('request', {
          string: JSON.stringify({
            clientMessageId,
            messageType: 'TEXT',
            body: hasBody ? body.trim() : null,
          }),
          type: 'application/json',
        } as unknown as Blob);

        for (const file of files) {
          formData.append('files', {
            uri: file.uri,
            name: file.name,
            type: file.type,
          } as unknown as Blob);
        }

        // Infer action code from file MIME types so the InsufficientCreditsModal
        // can show the right icon and message. Voice wins when any audio file is present.
        const actionCode = files.some((f) => f.type.startsWith('audio/'))
          ? 'VOICE_MESSAGE'
          : 'IMAGE_MESSAGE';

        const { data: serverMsg } = await sendMessageWithAttachments(
          matchId,
          formData,
          voiceDurationsMs,
          actionCode,
        );

        const reconciled: ChatMessage = {
          id: serverMsg.id,
          clientMessageId: serverMsg.client_message_id,
          matchId: serverMsg.match_id,
          sequenceNumber: serverMsg.sequence_number,
          senderUserId: serverMsg.sender_user_id,
          isMine: true,
          messageType: serverMsg.message_type,
          body: serverMsg.body ?? '',
          createdAt: serverMsg.created_at,
          editedAt: serverMsg.edited_at,
          localSendStatus: 'SENT',
          attachments: serverMsg.attachments?.map((dto) => ({
            id: dto.id,
            messageId: dto.message_id,
            attachmentType: dto.attachment_type,
            fileName: dto.file_name,
            contentType: dto.content_type,
            fileSizeBytes: dto.file_size_bytes,
            durationMs: dto.duration_ms,
            downloadUrl: dto.download_url,
            createdAt: dto.created_at,
          })),
        };

        useChatStore.getState().reconcileMessage(clientMessageId, reconciled);
        queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
        return null;
      } catch (error: any) {
        const responseStatus = error?.response?.status;
        const errorCode =
          error?.response?.data?.error?.code ?? error?.response?.data?.code ?? error?.response?.data?.error ?? 'NETWORK_ERROR';
        const errorMessage =
          error?.response?.data?.error?.message ?? error?.response?.data?.message ?? '';

        if (isInsufficientCreditsError(error)) {
          useChatStore.getState().removeOptimisticMessage(clientMessageId);
          return null;
        }

        if (isLimitExceededError(error)) {
          useChatStore.getState().removeOptimisticMessage(clientMessageId);
          const details = getLimitExceededDetails(error);
          return { code: 'LIMIT_EXCEEDED', message: errorMessage, actionType: details?.details.action_type };
        }

        if (responseStatus === 429) {
          const retryAfter = parseInt(
            error?.response?.headers?.['retry-after'] ?? '30',
            10,
          );
          rateLimitedUntil.current = Date.now() + retryAfter * 1000;
        }

        useChatStore.getState().markMessageFailed(clientMessageId, errorCode);
        return null;
      }
    },
    [matchId, currentUserId, queryClient],
  );

  const retry = useCallback(
    (clientMessageId: string) => {
      const msg = useChatStore
        .getState()
        .messages.find((m) => m.clientMessageId === clientMessageId);
      if (!msg || msg.localSendStatus !== 'FAILED') return;
      if (msg.pendingFiles && msg.pendingFiles.length > 0) {
        sendWithAttachments(msg.body, msg.pendingFiles, clientMessageId, msg.pendingVoiceDurations);
      } else {
        send(msg.body, clientMessageId);
      }
    },
    [send, sendWithAttachments],
  );

  return { send, sendWithAttachments, retry };
}
