import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unmatch } from '@/api/matches/matchesApi';
import { INBOX_QUERY_KEY } from '@/hooks/messages/useInbox';

export function useUnmatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unmatch,
    retry: (failureCount, error) => {
      const status = (error as any)?.response?.status;
      if (status === 403 || status === 404) return false;
      return failureCount < 2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovery', 'matches'] });
      queryClient.invalidateQueries({ queryKey: [INBOX_QUERY_KEY] });
    },
  });
}
