import { useMutation } from '@tanstack/react-query';

import { likeProfile, passProfile, superLikeProfile } from '@/api/discovery/discoveryApi';
import { SwipeActionResponse } from '@/types/discovery';
import { generateUUID } from '@/utils/uuid';

export type SwipeType = 'LIKE' | 'PASS' | 'SUPER_LIKE';

type SwipeParams = {
  type: SwipeType;
  targetUserId: string;
};

export function useSwipeAction() {
  return useMutation<SwipeActionResponse, Error, SwipeParams>({
    mutationFn: async ({ type, targetUserId }: SwipeParams) => {
      const clientActionId = generateUUID();
      if (type === 'LIKE') return likeProfile(targetUserId, clientActionId);
      if (type === 'PASS') return passProfile(targetUserId, clientActionId);
      return superLikeProfile(targetUserId, clientActionId);
    },
  });
}
