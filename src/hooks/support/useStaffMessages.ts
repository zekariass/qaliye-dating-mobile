import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { getStaffMessages } from '@/api/support/staffSupportApi';
import type { SupportMessageDto } from '@/types/support';
import { staffSupportKeys } from './useStaffSupportKeys';

const PAGE_LIMIT = 50;

export function useStaffMessages(
  conversationId: string | null,
  options?: { refetchInterval?: number | false },
) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: staffSupportKeys.messages(conversationId ?? ''),
    queryFn: async ({ pageParam }) => {
      const params: { before_sequence?: number; limit: number } = { limit: PAGE_LIMIT };
      if (pageParam != null) {
        params.before_sequence = pageParam as number;
      }
      return getStaffMessages(conversationId!, params);
    },
    enabled: !!conversationId,
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.next_before_sequence ?? undefined,
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? false,
  });

  const allMessages: SupportMessageDto[] = useMemo(() => {
    if (!query.data) return [];
    const seen = new Set<string>();
    const result: SupportMessageDto[] = [];
    for (const page of query.data.pages) {
      for (const msg of page.messages) {
        if (!seen.has(msg.id)) {
          seen.add(msg.id);
          result.push(msg);
        }
      }
    }
    return result;
  }, [query.data]);

  const invalidate = useCallback(() => {
    if (conversationId) {
      queryClient.invalidateQueries({ queryKey: staffSupportKeys.messages(conversationId) });
    }
  }, [queryClient, conversationId]);

  return {
    messages: allMessages,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    invalidate,
  };
}
