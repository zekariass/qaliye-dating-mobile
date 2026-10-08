import { useMutation, useQueryClient } from '@tanstack/react-query';

import { sendSuperMessage } from '@/api/discovery/superMessagesApi';
import { ENTITLEMENTS_KEY } from '@/hooks/billing/useEntitlements';
import { DISCOVERY_COUNTS_KEY } from '@/hooks/discovery/useDiscoveryCounts';
import { INBOX_QUERY_KEY } from '@/hooks/messages/useInbox';
import type { SuperMessageDto } from '@/types/superMessage';
import { generateUUID } from '@/utils/uuid';
import { SUPER_MESSAGES_QUERY_KEY } from './useSuperMessages';

export function useSendSuperMessage() {
  const queryClient = useQueryClient();

  return useMutation<
    SuperMessageDto,
    unknown,
    { targetUserId: string; message: string }
  >({
    mutationFn: ({ targetUserId, message }) =>
      sendSuperMessage({
        targetUserId,
        message,
        idempotencyKey: generateUUID(),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SUPER_MESSAGES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
      // The send records a LIKE action server-side — refresh sent-like state
      queryClient.invalidateQueries({ queryKey: ['discovery', 'likes'] });
      queryClient.invalidateQueries({ queryKey: DISCOVERY_COUNTS_KEY });
      // Instant match (receiver already liked us) — refresh match lists
      if (data.match_id) {
        queryClient.invalidateQueries({ queryKey: ['discovery', 'matches'] });
        queryClient.invalidateQueries({ queryKey: [INBOX_QUERY_KEY] });
      }
    },
  });
}
