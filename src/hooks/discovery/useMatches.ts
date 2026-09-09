import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { fetchMatches } from '@/api/discovery/discoveryApi';
import type { MatchItemDto, MatchesPageResponse } from '@/types/discovery';
import { smartMergeFirstPage } from '@/utils/smartQueryMerge';

const MATCHES_QK = ['discovery', 'matches'] as const;

export function useMatches() {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: MATCHES_QK,
    queryFn: ({ pageParam }: { pageParam: number }) => fetchMatches(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage: MatchesPageResponse) =>
      lastPage.has_next ? lastPage.page + 1 : undefined,
    // Never auto-refetch in the background — focus-fetch below handles
    // freshness while preserving stable item references (no photo blink).
    staleTime: Infinity,
  });

  // On every screen focus: fetch page 0 and merge only new / changed items.
  // Unchanged items keep their JS reference → FlatList rows don't re-render.
  useFocusEffect(
    useCallback(() => {
      smartMergeFirstPage<MatchItemDto, MatchesPageResponse>({
        queryClient,
        queryKey: MATCHES_QK,
        fetchFirstPage: () => fetchMatches(0),
        getId: (item) => item.match_id,
      });
    }, [queryClient]),
  );

  const items = useMemo<MatchItemDto[]>(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  const totalElements = useMemo(
    () => query.data?.pages[0]?.total_elements ?? 0,
    [query.data],
  );

  return { ...query, items, totalElements };
}
