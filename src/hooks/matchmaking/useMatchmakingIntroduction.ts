import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    fetchIntroduction,
    fetchIntroductions,
    submitIntroductionDecision,
} from '@/api/matchmaking/matchmakingApi';
import type {
    IntroductionDecisionPayload,
    IntroductionSummary,
    MatchmakingIntroductionDto,
    MatchmakingIntroductionViewDto,
} from '@/types/matchmaking';
import { MM_ACTIVE_REQUEST_QUERY_KEY, MM_REQUESTS_QUERY_KEY } from './useMatchmakingRequest';

export const MM_INTRODUCTIONS_QUERY_KEY = ['matchmaking', 'introductions'] as const;

export function mmIntroductionKey(introductionId: string) {
  return ['matchmaking', 'introductions', introductionId] as const;
}

/**
 * Caller's introduction history (REQUESTER or CANDIDATE), newest first.
 * Paginated via page/size — returns [] when empty.
 */
export function useMatchmakingIntroductions(page = 0, size = 20) {
  const query = useQuery<IntroductionSummary[], Error>({
    queryKey: [...MM_INTRODUCTIONS_QUERY_KEY, 'list', { page, size }],
    queryFn: () => fetchIntroductions(page, size),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const data = query.data ?? [];
  return { ...query, data, hasMore: data.length >= size };
}

/** Fetches the caller-relative introduction view. Refetches every 30s to pick up the partner's decision. */
export function useIntroduction(introductionId: string | null | undefined) {
  return useQuery<MatchmakingIntroductionViewDto, Error>({
    queryKey: mmIntroductionKey(introductionId ?? ''),
    queryFn: () => fetchIntroduction(introductionId!),
    enabled: !!introductionId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

/**
 * Submits the caller's decision on an introduction.
 * Decision is final — the server rejects duplicate attempts with 409.
 * NOTE: the response is the raw Introduction row (requester/candidate fields),
 * NOT the caller-relative view — so we invalidate rather than setQueryData.
 */
export function useIntroductionDecision(introductionId: string) {
  const queryClient = useQueryClient();
  return useMutation<MatchmakingIntroductionDto, Error, IntroductionDecisionPayload>({
    mutationFn: (payload) => submitIntroductionDecision(introductionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MM_INTRODUCTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MM_ACTIVE_REQUEST_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MM_REQUESTS_QUERY_KEY });
    },
  });
}
