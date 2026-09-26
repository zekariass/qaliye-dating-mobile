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

  const items = useMemo<BlindDateSessionSummaryDto[]>(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  return { ...query, items };
}
