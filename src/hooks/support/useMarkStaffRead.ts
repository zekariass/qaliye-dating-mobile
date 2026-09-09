import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { markStaffConversationRead } from '@/api/support/staffSupportApi';
import type { StaffConversationDetailDto, StaffConversationSummaryDto } from '@/types/support';
import { staffSupportKeys } from './useStaffSupportKeys';

export function useMarkStaffRead(conversationId: string) {
  const queryClient = useQueryClient();
  const lastSentRef = useRef<number>(0);

  const mutation = useMutation({
    mutationFn: (sequence: number) => markStaffConversationRead(conversationId, sequence),
    onSuccess: (_data, sequence) => {
      // Update the detail cache: advance read cursor and clear personal unread count.
      queryClient.setQueryData<StaffConversationDetailDto>(
        staffSupportKeys.detail(conversationId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            my_last_read_sequence: Math.max(old.my_last_read_sequence, sequence),
            unread_count: 0,
          };
        },
      );

      // Update every list cache that contains this conversation so the badge
      // clears immediately without waiting for the next poll.
      queryClient.setQueriesData<StaffConversationSummaryDto[]>(
        { queryKey: staffSupportKeys.lists() },
        (old) => {
          if (!old) return old;
          return old.map((c) =>
            c.id === conversationId ? { ...c, unread_count: 0 } : c,
          );
        },
      );
    },
  });

  const markRead = (sequence: number) => {
    if (sequence <= 0) return;
    if (sequence <= lastSentRef.current) return;
    lastSentRef.current = sequence;
    mutation.mutate(sequence);
  };

  return { markRead };
}
