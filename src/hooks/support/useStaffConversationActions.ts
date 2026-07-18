import { useMutation, useQueryClient } from '@tanstack/react-query';

import { closeStaffConversation, reopenStaffConversation } from '@/api/support/staffSupportApi';
import { extractApiError } from '@/utils/apiError';
import { staffSupportKeys } from './useStaffSupportKeys';

export function useCloseStaffConversation(conversationId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => closeStaffConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffSupportKeys.detail(conversationId) });
      queryClient.invalidateQueries({ queryKey: staffSupportKeys.lists() });
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      if (apiErr.status === 422) {
        queryClient.invalidateQueries({ queryKey: staffSupportKeys.detail(conversationId) });
      }
    },
  });

  return {
    close: mutation.mutate,
    isClosing: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}

export function useReopenStaffConversation(conversationId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => reopenStaffConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffSupportKeys.detail(conversationId) });
      queryClient.invalidateQueries({ queryKey: staffSupportKeys.lists() });
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      if (apiErr.status === 422) {
        queryClient.invalidateQueries({ queryKey: staffSupportKeys.detail(conversationId) });
      }
    },
  });

  return {
    reopen: mutation.mutate,
    isReopening: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}
