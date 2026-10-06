import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchDiscoverSessions, type BlindDatePage } from '@/api/blindDate/blindDateApi';
import type { BlindDateSessionSummaryDto } from '@/types/blindDate';

export const BLIND_DATE_DISCOVER_KEY = ['blindDate', 'discover'] as const;

const PAGE_SIZE = 20;

export function useDiscoverSessions() {
  const query = useInfiniteQuery({
    queryKey: BLIND_DATE_DISCOVER_KEY,
    queryFn: ({ pageParam }) => fetchDiscoverSessions(pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage: BlindDatePage<BlindDateSessionSummaryDto>) =>
      lastPage.has_next ? lastPage.page + 1 : undefined,
    staleTime: 30_000,
  });

  const items = useMemo<BlindDateSessionSummaryDto[]>(() => {
    const flat = query.data?.pages.flatMap((page) => page.items) ?? [];
    // Offset pagination on a mutable feed (sessions fill, expire, get created)
    // can return the same session on two pages — deduplicate by id.
    const seen = new Set<string>();
    return flat.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [query.data]);

  return { ...query, items };
}
