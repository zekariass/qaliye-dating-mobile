import { useMutation, useQueryClient } from '@tanstack/react-query';

import { acceptSuperMessage, passSuperMessage } from '@/api/discovery/superMessagesApi';
import type { SuperMessageActionResponse } from '@/types/superMessage';
import { SUPER_MESSAGES_QUERY_KEY } from './useSuperMessages';

export function useAcceptSuperMessage() {
  const queryClient = useQueryClient();
  return useMutation<SuperMessageActionResponse, unknown, string>({
    mutationFn: acceptSuperMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPER_MESSAGES_QUERY_KEY });
    },
  });
}

export function usePassSuperMessage() {
  const queryClient = useQueryClient();
  return useMutation<SuperMessageActionResponse, unknown, string>({
    mutationFn: passSuperMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPER_MESSAGES_QUERY_KEY });
    },
  });
}
