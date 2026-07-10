import { useQueryClient, useMutation } from '@tanstack/react-query';

import { unblockUser, BlockedUsersResponse } from '@/api/safety/safetyApi';
import { BLOCKED_USERS_KEY } from './useBlockedUsers';

export function useUnblockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => unblockUser(userId),
    onMutate: async (userId: string) => {
      await queryClient.cancelQueries({ queryKey: BLOCKED_USERS_KEY });

      const previous = queryClient.getQueryData(BLOCKED_USERS_KEY);

      queryClient.setQueryData(BLOCKED_USERS_KEY, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: BlockedUsersResponse) => ({
            ...page,
            items: page.items.filter((item) => item.blocked_user.id !== userId),
          })),
        };
      });

      return { previous };
    },
    onError: (_err: unknown, _userId: string, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(BLOCKED_USERS_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: BLOCKED_USERS_KEY });
    },
  });
}
