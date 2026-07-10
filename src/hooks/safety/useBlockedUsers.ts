import { useInfiniteQuery } from '@tanstack/react-query';

import { fetchBlockedUsers } from '@/api/safety/safetyApi';

export const BLOCKED_USERS_KEY = ['safety', 'blocked-users'] as const;

export function useBlockedUsers() {
  return useInfiniteQuery({
    queryKey: BLOCKED_USERS_KEY,
    queryFn: ({ pageParam }) => fetchBlockedUsers(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? (lastPage.next_cursor ?? undefined) : undefined,
  });
}
