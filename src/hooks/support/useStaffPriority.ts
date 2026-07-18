import { useMutation, useQueryClient } from '@tanstack/react-query';

import { setStaffPriority } from '@/api/support/staffSupportApi';
import type { StaffConversationDetailDto } from '@/types/support';
import { staffSupportKeys } from './useStaffSupportKeys';

export function useStaffPriority(conversationId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (priority: number) => setStaffPriority(conversationId, priority),
    onMutate: async (priority) => {
      await queryClient.cancelQueries({ queryKey: staffSupportKeys.detail(conversationId) });
      const previous = queryClient.getQueryData<StaffConversationDetailDto>(
        staffSupportKeys.detail(conversationId),
      );
      if (previous) {
        queryClient.setQueryData<StaffConversationDetailDto>(
          staffSupportKeys.detail(conversationId),
          { ...previous, priority },
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(staffSupportKeys.detail(conversationId), ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: staffSupportKeys.detail(conversationId) });
      queryClient.invalidateQueries({ queryKey: staffSupportKeys.lists() });
    },
  });

  return {
    setPriority: mutation.mutate,
    isSettingPriority: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}
