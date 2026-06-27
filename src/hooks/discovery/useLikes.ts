import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchLikes } from '@/api/discovery/discoveryApi';
import type { LikeDirection, LikeItemDto, LikesPageResponse } from '@/types/discovery';

export function useLikes(direction: LikeDirection) {
  const query = useInfiniteQuery({
    queryKey: ['discovery', 'likes', direction],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const data = await fetchLikes(direction, pageParam);
      console.log(`[useLikes] Fetched ${direction} likes (page ${data.page}):`, data);
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: LikesPageResponse) =>
      lastPage.has_next ? lastPage.page + 1 : undefined,
  });

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
