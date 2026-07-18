import { useMutation, useQueryClient } from '@tanstack/react-query';

import { setStaffAssignment } from '@/api/support/staffSupportApi';
import type { StaffConversationDetailDto } from '@/types/support';
import { staffSupportKeys } from './useStaffSupportKeys';

export function useStaffAssignment(conversationId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (assignedStaffUserId: string | null) =>
      setStaffAssignment(conversationId, assignedStaffUserId),
    onMutate: async (assignedStaffUserId) => {
      await queryClient.cancelQueries({ queryKey: staffSupportKeys.detail(conversationId) });
      const previous = queryClient.getQueryData<StaffConversationDetailDto>(
        staffSupportKeys.detail(conversationId),
      );
      if (previous) {
        queryClient.setQueryData<StaffConversationDetailDto>(
          staffSupportKeys.detail(conversationId),
          { ...previous, assigned_staff_user_id: assignedStaffUserId },
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
    assign: mutation.mutate,
    isAssigning: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}
