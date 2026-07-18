import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getStaffConversationDetail } from '@/api/support/staffSupportApi';
import { staffSupportKeys } from './useStaffSupportKeys';

export function useStaffConversationDetail(
  conversationId: string | null,
  options?: { refetchInterval?: number | false },
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: staffSupportKeys.detail(conversationId ?? ''),
    queryFn: () => getStaffConversationDetail(conversationId!),
    enabled: !!conversationId,
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? false,
    retry: 2,
  });

  const invalidate = useCallback(() => {
    if (conversationId) {
      queryClient.invalidateQueries({ queryKey: staffSupportKeys.detail(conversationId) });
    }
  }, [queryClient, conversationId]);

  return {
    conversation: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    invalidate,
  };
}
