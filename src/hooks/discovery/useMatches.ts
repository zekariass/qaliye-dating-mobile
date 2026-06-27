import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchMatches } from '@/api/discovery/discoveryApi';
import type { MatchItemDto, MatchesPageResponse } from '@/types/discovery';

export function useMatches() {
  const query = useInfiniteQuery({
    queryKey: ['discovery', 'matches'],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const data = await fetchMatches(pageParam);
      console.log(`[useMatches] Fetched matches (page ${data.page}):`, data);
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: MatchesPageResponse) =>
      lastPage.has_next ? lastPage.page + 1 : undefined,
  });

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
