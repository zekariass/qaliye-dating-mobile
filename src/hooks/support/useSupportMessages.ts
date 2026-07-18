import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { getSupportMessages } from '@/api/support/supportApi';
import type { SupportMessageDto } from '@/types/support';
import { supportKeys } from './useSupportConversation';

const PAGE_LIMIT = 25;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSupportMessages(options?: { refetchInterval?: number | false }) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: supportKeys.messages(),
    queryFn: async ({ pageParam }) => {
      const params: { before_sequence?: number; limit: number } = { limit: PAGE_LIMIT };
      if (pageParam != null) {
        params.before_sequence = pageParam as number;
      }
      return getSupportMessages(params);
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.next_before_sequence ?? undefined,
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? false,
  });

  // Flatten all pages, deduplicate by id, preserve newest-first order.
  // Pages are ordered newest-first: page[0] = latest, page[1] = older, etc.
  // Within each page, messages are also newest-first.
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
    queryClient.invalidateQueries({ queryKey: supportKeys.messages() });
  }, [queryClient]);

  return {
    /** Messages in newest-first order (suitable for inverted FlatList). */
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
