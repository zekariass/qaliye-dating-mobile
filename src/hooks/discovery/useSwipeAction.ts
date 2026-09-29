import { useMutation, useQueryClient } from '@tanstack/react-query';

import { DEFAULT_LIKE_VARIANT_CODE, likeProfile, passProfile, superLikeProfile } from '@/api/discovery/discoveryApi';
import { ENTITLEMENTS_KEY } from '@/hooks/billing/useEntitlements';
import { DISCOVERY_COUNTS_KEY } from '@/hooks/discovery/useDiscoveryCounts';
import { LIKE_ACTIONS_KEY } from '@/hooks/discovery/useLikeActions';
import { INBOX_QUERY_KEY } from '@/hooks/messages/useInbox';
import { type DiscoveryCountsDto, type LikeActionVariantDto, SwipeActionResponse } from '@/types/discovery';
import { defaultLikeVariant } from '@/utils/likeVariants';
import { generateUUID } from '@/utils/uuid';

export type SwipeType = 'LIKE' | 'PASS' | 'SUPER_LIKE';

type SwipeParams = {
  type: SwipeType;
  targetUserId: string;
  // LIKE-only — the configurable LIKE variant code (e.g. HEART, ROSE). Falls
  // back to the variant flagged `is_default` when omitted so existing call
  // sites keep working.
  actionVariantCode?: string;
};

export function useSwipeAction() {
  const qc = useQueryClient();
  return useMutation<SwipeActionResponse, Error, SwipeParams>({
    mutationFn: async ({ type, targetUserId, actionVariantCode }: SwipeParams) => {
      const clientActionId = generateUUID();
      if (type === 'LIKE') {
        const variants = qc.getQueryData<LikeActionVariantDto[]>(LIKE_ACTIONS_KEY);
        const code = actionVariantCode ?? defaultLikeVariant(variants)?.code ?? DEFAULT_LIKE_VARIANT_CODE;
        return likeProfile(targetUserId, clientActionId, code);
      }
      if (type === 'PASS') return passProfile(targetUserId, clientActionId);
      return superLikeProfile(targetUserId, clientActionId);
    },
    onSuccess: (data, variables) => {
      if (variables.type === 'LIKE' || variables.type === 'SUPER_LIKE') {
        qc.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
        // Refresh variant limit/usage fields (used/remaining/blocked)
        if (variables.type === 'LIKE') {
          qc.invalidateQueries({ queryKey: LIKE_ACTIONS_KEY });
        }
        // Optimistically increment sentLikesCount — no extra poll needed
        qc.setQueryData<DiscoveryCountsDto>(DISCOVERY_COUNTS_KEY, (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            sent_likes_count: prev.sent_likes_count + 1,
            // If it's a match, also increment matches_count
            ...(data.is_match ? { matches_count: prev.matches_count + 1 } : {}),
          };
        });
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
