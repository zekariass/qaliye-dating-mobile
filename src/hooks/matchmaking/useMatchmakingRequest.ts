import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  cancelMatchmakingRequest,
  createMatchmakingRequest,
  fetchActiveMatchmakingRequest,
  fetchMatchmakingRequest,
  fetchMatchmakingRequests,
} from '@/api/matchmaking/matchmakingApi';
import type {
  CreateMatchmakingRequestPayload,
  MatchmakingRequestDto,
} from '@/types/matchmaking';

export const MM_ACTIVE_REQUEST_QUERY_KEY = ['matchmaking', 'requests', 'active'] as const;
export const MM_REQUESTS_QUERY_KEY = ['matchmaking', 'requests'] as const;

export function mmRequestKey(requestId: string) {
  return ['matchmaking', 'requests', requestId] as const;
}

/** Fetches the user's current OPEN/ON_HOLD request. `null` = no active request. */
export function useActiveMatchmakingRequest() {
  return useQuery<MatchmakingRequestDto | null, Error>({
    queryKey: MM_ACTIVE_REQUEST_QUERY_KEY,
    queryFn: fetchActiveMatchmakingRequest,
    staleTime: 30_000,
    refetchOnMount: 'always',
    refetchInterval: 60_000,
  });
}

/** Fetches a specific request by ID. */
export function useMatchmakingRequest(requestId: string | null | undefined) {
  return useQuery<MatchmakingRequestDto, Error>({
    queryKey: mmRequestKey(requestId ?? ''),
    queryFn: () => fetchMatchmakingRequest(requestId!),
    enabled: !!requestId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/** Paginated request history. */
export function useMatchmakingHistory(page = 0, size = 20) {
  const query = useQuery<MatchmakingRequestDto[], Error>({
    queryKey: [...MM_REQUESTS_QUERY_KEY, { page, size }],
    queryFn: () => fetchMatchmakingRequests(page, size),
    staleTime: 60_000,
  });

  const hasMore = useMemo(
    () => (query.data?.length ?? 0) >= size,
    [query.data, size],
  );

  return { ...query, hasMore };
}

/** Submits a new matchmaking request (idempotent via `charge_idempotency_key`). */
export function useCreateMatchmakingRequest() {
  const queryClient = useQueryClient();
  return useMutation<MatchmakingRequestDto, Error, CreateMatchmakingRequestPayload>({
    mutationFn: createMatchmakingRequest,
    onSuccess: (data) => {
      queryClient.setQueryData<MatchmakingRequestDto | null>(MM_ACTIVE_REQUEST_QUERY_KEY, data);
      queryClient.setQueryData<MatchmakingRequestDto>(mmRequestKey(data.id), data);
      queryClient.invalidateQueries({ queryKey: MM_REQUESTS_QUERY_KEY });
    },
  });
}

/** Cancels an active request. */
export function useCancelMatchmakingRequest() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: cancelMatchmakingRequest,
    onSuccess: () => {
      queryClient.setQueryData<MatchmakingRequestDto | null>(MM_ACTIVE_REQUEST_QUERY_KEY, null);
      queryClient.invalidateQueries({ queryKey: MM_REQUESTS_QUERY_KEY });
    },
  });
}
