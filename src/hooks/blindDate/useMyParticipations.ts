import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchMyParticipations, type BlindDatePage } from '@/api/blindDate/blindDateApi';
import type { BlindDateParticipationDto } from '@/types/blindDate';

export const BLIND_DATE_PARTICIPATIONS_KEY = ['blindDate', 'participations'] as const;

const PAGE_SIZE = 20;

export function useMyParticipations(opts?: { enabled?: boolean }) {
  const query = useInfiniteQuery({
    queryKey: BLIND_DATE_PARTICIPATIONS_KEY,
    queryFn: ({ pageParam }) => fetchMyParticipations(pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage: BlindDatePage<BlindDateParticipationDto>) =>
      lastPage.has_next ? lastPage.page + 1 : undefined,
    staleTime: 30_000,
    enabled: opts?.enabled ?? true,
  });

  const items = useMemo<BlindDateParticipationDto[]>(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  return { ...query, items };
}
