import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { sendSupportMessage } from '@/api/support/supportApi';
import type { SupportFileAttachment, SupportPendingMessage } from '@/types/support';
import { extractApiError } from '@/utils/apiError';
import { generateUUID } from '@/utils/uuid';
import { supportKeys } from './useSupportConversation';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSendSupportMessage() {
  const queryClient = useQueryClient();

  const [pendingMessages, setPendingMessages] = useState<SupportPendingMessage[]>([]);

  /** Prevents duplicate concurrent sends. */
  const isSendingRef = useRef(false);

  const mutation = useMutation({
    mutationFn: async ({
      body,
      files,
      voiceDurationsMs,
      clientMessageId,
    }: {
      body: string | null;
      files: SupportFileAttachment[];
      voiceDurationsMs?: (number | null)[];
      clientMessageId: string;
    }) => {
      const formData = new FormData();
      formData.append('clientMessageId', clientMessageId);
      if (body && body.trim().length > 0) {
        formData.append('body', body.trim());
      }
      for (const file of files) {
        formData.append('files', {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as unknown as Blob);
      }
      if (voiceDurationsMs && voiceDurationsMs.length > 0) {
        const durationsJson = JSON.stringify(
          voiceDurationsMs.map((d) => (d != null && d > 0 ? d : null)),
        );
        formData.append('durations', durationsJson);
      }
      return sendSupportMessage(formData);
    },
    onSuccess: (_data, variables) => {
      setPendingMessages((prev) =>
        prev.filter((m) => m.clientMessageId !== variables.clientMessageId),
      );
      queryClient.invalidateQueries({ queryKey: supportKeys.messages() });
      queryClient.invalidateQueries({ queryKey: supportKeys.conversation() });
      isSendingRef.current = false;
    },
    onError: (err, variables) => {
      const detail = extractApiError(err);
      setPendingMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === variables.clientMessageId
            ? { ...m, localSendStatus: 'FAILED' as const, errorMessage: detail.message }
            : m,
        ),
      );
      isSendingRef.current = false;
    },
  });

  /**
   * Send a message. Pass an existing `retryId` to retry a failed send using
   * the same UUID (idempotency). Omit it to start a fresh send.
   */
  const send = useCallback(
    async (
      body: string | null,
      files: SupportFileAttachment[],
      retryId?: string,
      voiceDurationsMs?: (number | null)[],
    ) => {
      if (isSendingRef.current) return;

      const hasBody = body !== null && body.trim().length > 0;
      const hasFiles = files.length > 0;
      if (!hasBody && !hasFiles) return;

      isSendingRef.current = true;

      const clientMessageId = retryId ?? generateUUID();

      const pending: SupportPendingMessage = {
        clientMessageId,
        body: hasBody ? body!.trim() : null,
        files,
        voiceDurationsMs,
        localSendStatus: 'SENDING',
        createdAt: new Date().toISOString(),
      };

      setPendingMessages((prev) => {
        const exists = prev.find((m) => m.clientMessageId === clientMessageId);
        if (exists) {
          return prev.map((m) =>
            m.clientMessageId === clientMessageId
              ? { ...m, localSendStatus: 'SENDING' as const }
              : m,
          );
        }
        return [...prev, pending];
      });

      try {
        await mutation.mutateAsync({ body, files, voiceDurationsMs, clientMessageId });
      } catch (err: unknown) {
        // 409 = backend already received this message (idempotency replay).
        // Reconcile by refreshing — message is already stored.
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 409) {
          setPendingMessages((prev) =>
            prev.filter((m) => m.clientMessageId !== clientMessageId),
          );
          queryClient.invalidateQueries({ queryKey: supportKeys.messages() });
          queryClient.invalidateQueries({ queryKey: supportKeys.conversation() });
          isSendingRef.current = false;
        }
        // Other errors: pending message stays as FAILED (handled by onError)
      }
    },
    [mutation, queryClient],
  );

  const retry = useCallback(
    (pm: SupportPendingMessage) => {
      send(pm.body, pm.files, pm.clientMessageId, pm.voiceDurationsMs);
    },
    [send],
  );

  const dismissFailed = useCallback((clientMessageId: string) => {
    setPendingMessages((prev) =>
      prev.filter((m) => m.clientMessageId !== clientMessageId),
    );
    isSendingRef.current = false;
  }, []);

  return {
    send,
    retry,
    dismissFailed,
    pendingMessages,
    isSending: mutation.isPending,
  };
}
