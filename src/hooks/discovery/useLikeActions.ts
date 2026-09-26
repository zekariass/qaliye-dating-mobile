import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { DEFAULT_LIKE_VARIANT_CODE, fetchLikeActions } from '@/api/discovery/discoveryApi';
import type { LikeActionVariantDto } from '@/types/discovery';

export const LIKE_ACTIONS_KEY = ['discovery', 'like-actions'] as const;

/**
 * Fetches the active, plan-priced LIKE action variants (HEART, ROSE, …) from
 * the backend, including per-variant limit/usage fields (limit, remaining,
 * blocked). Called once during app bootstrap (see `app/(app)/_layout.tsx`) so
 * the swipe screen can render immediately from cache; components can also call
 * this hook directly to read the cached list reactively.
 *
 * Refreshes on mount and whenever the app returns to the foreground — usage
 * can change across periods, and `useSwipeAction` also invalidates this query
 * after every successful like.
 */
export function useLikeActions() {
  const query = useQuery<LikeActionVariantDto[]>({
    queryKey: LIKE_ACTIONS_KEY,
    queryFn: async () => {
      const res = await fetchLikeActions();
      return [...(res.actions ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    },
    staleTime: 10 * 60_000,
    refetchOnMount: 'always',
    retry: 1,
  });
  const { refetch } = query;

  // Refresh when the app comes back to the foreground — `used`/`remaining`/
  // `blocked` may have rolled over to a new period while backgrounded.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  return {
    ...query,
    variants: query.data ?? [],
  };
}

export { DEFAULT_LIKE_VARIANT_CODE };
