import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { fetchLikes } from '@/api/discovery/discoveryApi';
import type { LikeDirection, LikeItemDto, LikesPageResponse } from '@/types/discovery';
import { smartMergeFirstPage } from '@/utils/smartQueryMerge';

export function useLikes(direction: LikeDirection) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['discovery', 'likes', direction],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return fetchLikes(direction, pageParam);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: LikesPageResponse) =>
      lastPage.has_next ? lastPage.page + 1 : undefined,
    // Never auto-refetch in the background — focus-fetch below handles
    // freshness while preserving stable item references (no photo blink).
    staleTime: Infinity,
  });

  // On every screen focus: fetch page 0 and merge only new / changed items.
  // Unchanged items keep their JS reference → FlatList rows don't re-render.
  useFocusEffect(
    useCallback(() => {
      smartMergeFirstPage<LikeItemDto, LikesPageResponse>({
        queryClient,
        queryKey: ['discovery', 'likes', direction],
        fetchFirstPage: () => fetchLikes(direction, 0),
        getId: (item) => item.action_id,
      });
    }, [queryClient, direction]),
  );

  const items = useMemo<LikeItemDto[]>(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  const totalElements = useMemo(
    () => query.data?.pages[0]?.total_elements ?? 0,
    [query.data],
  );

  return { ...query, items, totalElements };
}
