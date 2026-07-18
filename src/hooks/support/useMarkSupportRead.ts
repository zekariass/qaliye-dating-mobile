import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { markSupportConversationRead } from '@/api/support/supportApi';
import type { SupportConversationDto } from '@/types/support';
import { supportKeys } from './useSupportConversation';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMarkSupportRead() {
  const queryClient = useQueryClient();

  /** Tracks the highest sequence number we have already sent to the backend. */
  const lastSentRef = useRef<number>(0);

  const mutation = useMutation({
    mutationFn: markSupportConversationRead,
    onSuccess: (_data, sequence) => {
      // Optimistically update the cached conversation to reflect the read cursor
      queryClient.setQueryData<SupportConversationDto>(
        supportKeys.conversation(),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            user_last_read_sequence: Math.max(old.user_last_read_sequence, sequence),
            unread_count: 0,
          };
        },
      );
    },
  });

  /**
   * Mark messages read up to `sequence`. Skips if the sequence is not
   * greater than what we have already sent.
   */
  const markRead = (sequence: number) => {
    if (sequence <= 0) return;
    if (sequence <= lastSentRef.current) return;
    lastSentRef.current = sequence;
    mutation.mutate(sequence);
  };

  return { markRead };
}
