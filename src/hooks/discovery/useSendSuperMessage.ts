import { useMutation, useQueryClient } from '@tanstack/react-query';

import { sendSuperMessage } from '@/api/discovery/superMessagesApi';
import { ENTITLEMENTS_KEY } from '@/hooks/billing/useEntitlements';
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPER_MESSAGES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
    },
  });
}
