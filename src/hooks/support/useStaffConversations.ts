import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getStaffConversations } from '@/api/support/staffSupportApi';
import type { StaffConversationListParams, StaffConversationSummaryDto } from '@/types/support';
import { staffSupportKeys } from './useStaffSupportKeys';

export function useStaffConversations(
  params?: StaffConversationListParams,
  options?: { refetchInterval?: number | false },
) {
  const queryClient = useQueryClient();

  const query = useQuery<StaffConversationSummaryDto[], Error>({
    queryKey: staffSupportKeys.list(params),
    queryFn: () => getStaffConversations(params),
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? false,
    retry: 2,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: staffSupportKeys.lists() });
  }, [queryClient]);

  return {
    conversations: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    invalidate,
  };
}
