import { useMutation, useQueryClient } from '@tanstack/react-query';

import { closeSupportConversation } from '@/api/support/supportApi';
import { extractApiError } from '@/utils/apiError';
import { supportKeys } from './useSupportConversation';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCloseSupportConversation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: closeSupportConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.conversation() });
    },
    onError: (err) => {
      const apiErr = extractApiError(err);
      // 422 means already closed — conversation state is stale; refresh it.
      if (apiErr.status === 422) {
        queryClient.invalidateQueries({ queryKey: supportKeys.conversation() });
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
