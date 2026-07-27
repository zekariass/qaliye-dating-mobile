import { useMutation, useQueryClient } from '@tanstack/react-query';

import { likeProfile, passProfile, superLikeProfile } from '@/api/discovery/discoveryApi';
import { ENTITLEMENTS_KEY } from '@/hooks/billing/useEntitlements';
import { INBOX_QUERY_KEY } from '@/hooks/messages/useInbox';
import { SwipeActionResponse } from '@/types/discovery';
import { generateUUID } from '@/utils/uuid';

export type SwipeType = 'LIKE' | 'PASS' | 'SUPER_LIKE';

type SwipeParams = {
  type: SwipeType;
  targetUserId: string;
};

export function useSwipeAction() {
  const qc = useQueryClient();
  return useMutation<SwipeActionResponse, Error, SwipeParams>({
    mutationFn: async ({ type, targetUserId }: SwipeParams) => {
      const clientActionId = generateUUID();
      if (type === 'LIKE') return likeProfile(targetUserId, clientActionId);
      if (type === 'PASS') return passProfile(targetUserId, clientActionId);
      return superLikeProfile(targetUserId, clientActionId);
    },
    onSuccess: (data, variables) => {
      if (variables.type === 'LIKE' || variables.type === 'SUPER_LIKE') {
        qc.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
      }
      qc.invalidateQueries({ queryKey: ['profile', 'user', variables.targetUserId] });
      qc.invalidateQueries({ queryKey: ['discovery', 'likes'] });
      if (data.is_match) {
        qc.invalidateQueries({ queryKey: ['discovery', 'matches'] });
        qc.invalidateQueries({ queryKey: [INBOX_QUERY_KEY] });
      }
    },
  });
}
