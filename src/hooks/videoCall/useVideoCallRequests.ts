import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
    acceptVideoCallRequest,
    cancelVideoCallRequest,
    createVideoCallRequest,
    declineVideoCallRequest,
    endVideoCall,
    fetchVideoCallRequests,
    joinVideoCall,
    remindVideoCallRequest
} from '@/api/videoCall/videoCallApi';
import { updateInboxVideoCallRequest } from '@/hooks/messages/useInbox';
import type {
    CreateVideoCallRequestPayload,
    JoinCallCredentials,
    VideoCallRequest,
} from '@/types/videoCall';

// ── Query keys ────────────────────────────────────────────────────────────────

export function vcRequestsKey(matchId: string) {
  return ['videoCall', 'requests', matchId] as const;
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** All requests (history + current) for a match. */
export function useVideoCallRequests(matchId: string) {
  return useQuery<VideoCallRequest[], Error>({
    queryKey: vcRequestsKey(matchId),
    queryFn: () => fetchVideoCallRequests(matchId),
    staleTime: 15_000,
    refetchInterval: 15_000,
    refetchOnMount: 'always',
    enabled: !!matchId,
  });
}

/**
 * Derives the single live (PENDING or ACCEPTED) request from the list.
 * At most one such request can exist per match.
 */
export function useLiveVideoCallRequest(matchId: string) {
  const query = useVideoCallRequests(matchId);
  const liveRequest =
    query.data?.find((r) => r.status === 'PENDING' || r.status === 'ACCEPTED') ?? null;
  const history =
    query.data?.filter((r) => r.status !== 'PENDING' && r.status !== 'ACCEPTED') ?? [];
  return { ...query, liveRequest, history };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateVideoCallRequest(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation<VideoCallRequest, Error, CreateVideoCallRequestPayload>({
    mutationFn: createVideoCallRequest,
    onSuccess: (request) => {
      // Seed the requests cache so the detail screen finds this request
      // instantly — otherwise it mounts with stale cached data, flashes
      // "Request not found", then swaps in the real state on refetch.
      queryClient.setQueryData<VideoCallRequest[]>(vcRequestsKey(matchId), (old) =>
        !old
          ? [request]
          : old.some((r) => r.id === request.id)
            ? old.map((r) => (r.id === request.id ? request : r))
            : [request, ...old],
      );
      queryClient.invalidateQueries({ queryKey: vcRequestsKey(matchId) });
      // Immediately stamp the inbox badge with the correct call_type so the
      // conversation list shows 📞/📹 correctly without waiting for the next
      // inbox fetch (which may not include call_type on older server versions).
      updateInboxVideoCallRequest(queryClient, matchId, {
        id: request.id,
        status: request.status as 'PENDING' | 'ACCEPTED',
        callType: request.call_type,
        isRequester: true,
        canAccept: false,
        canCancel: request.can_cancel,
        canJoin: request.can_join,
      });
    },
  });
}

export function useAcceptVideoCallRequest(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation<VideoCallRequest, Error, string>({
    mutationFn: acceptVideoCallRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vcRequestsKey(matchId) });
    },
  });
}

export function useDeclineVideoCallRequest(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation<VideoCallRequest, Error, string>({
    mutationFn: declineVideoCallRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vcRequestsKey(matchId) });
    },
  });
}

export function useCancelVideoCallRequest(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation<VideoCallRequest, Error, string>({
    mutationFn: cancelVideoCallRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vcRequestsKey(matchId) });
    },
  });
}

export function useRemindVideoCallRequest(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation<VideoCallRequest, Error, string>({
    mutationFn: remindVideoCallRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vcRequestsKey(matchId) });
    },
  });
}

/**
 * Counts down the server-reported remind cooldown so the Remind button stays
 * disabled — and re-enables automatically — while the caller waits.
 *
 * Pass `request.next_remind_in_seconds` and every VideoCallRequestView the
 * screen receives (create, list poll, remind success) re-arms or clears the
 * countdown — the server value is always authoritative, never hardcoded.
 */
export function useRemindCooldown(serverSeconds?: number | null) {
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (serverSeconds != null) setCooldownSeconds(serverSeconds);
  }, [serverSeconds]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setTimeout(() => {
      setCooldownSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  return { cooldownSeconds, startCooldown: setCooldownSeconds };
}

export function useJoinVideoCall() {
  return useMutation<JoinCallCredentials, Error, string>({
    mutationFn: joinVideoCall,
  });
}

export function useEndVideoCall(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation<VideoCallRequest, Error, string>({
    mutationFn: endVideoCall,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vcRequestsKey(matchId) });
    },
  });
}
