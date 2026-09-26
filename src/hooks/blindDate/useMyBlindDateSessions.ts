import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchMySessions, type BlindDatePage } from '@/api/blindDate/blindDateApi';
import type { BlindDateMySessionDto } from '@/types/blindDate';

export const BLIND_DATE_MY_SESSIONS_KEY = ['blindDate', 'mySessions'] as const;

const PAGE_SIZE = 20;

export function useMyBlindDateSessions(opts?: { enabled?: boolean }) {
  const query = useInfiniteQuery({
    queryKey: BLIND_DATE_MY_SESSIONS_KEY,
    queryFn: ({ pageParam }) => fetchMySessions(pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage: BlindDatePage<BlindDateMySessionDto>) =>
      lastPage.has_next ? lastPage.page + 1 : undefined,
    staleTime: 30_000,
    enabled: opts?.enabled ?? true,
  });

  const items = useMemo<BlindDateMySessionDto[]>(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  // Only sessions the caller CREATED count toward the "one active session"
  // limit — `/sessions/mine` also returns joined (role=PARTICIPANT) rows,
  // which must never block creating your own session.
  const activeSession = useMemo(
    () =>
      items.find(
        (s) => s.role !== 'PARTICIPANT' && (s.status === 'OPEN' || s.status === 'REVEAL'),
      ) ?? null,
    [items],
  );

  return { ...query, items, activeSession };
}
