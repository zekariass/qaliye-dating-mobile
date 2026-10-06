import { useQuery } from '@tanstack/react-query';

import { fetchBlindDateSession, fetchSessionResults } from '@/api/blindDate/blindDateApi';
import { BLIND_DATE_SESSION_KEY } from '@/hooks/blindDate/useSessionManage';
import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import type { BlindDateSessionResultsDto } from '@/types/blindDate';
import { extractApiError } from '@/utils/apiError';

export const BLIND_DATE_RESULTS_KEY = (id: string) => ['blindDate', 'results', id] as const;

/** The results endpoint is creator-only — a 403 means the wrong caller hit
 *  it, not a transient failure. */
function resultsRetry(failureCount: number, err: unknown): boolean {
  const { code, status } = extractApiError(err);
  if (status === 403 || code.toLowerCase() === 'not_session_creator') return false;
  return failureCount < 2;
}

/**
 * Session detail + results payload for the creator results screen. The
 * session query powers the outcome header even if the results endpoint
 * isn't deployed yet, so the screen degrades gracefully.
 */
export function useSessionResults(sessionId: string | null) {
  const sessionQuery = useQuery({
    queryKey: BLIND_DATE_SESSION_KEY(sessionId ?? ''),
    queryFn: () => fetchBlindDateSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 10_000,
  });

  const me = useCurrentProfile();
  const session = sessionQuery.data ?? null;

  // Same ownership check as useSessionManage — the definitive check is
  // `creator_user_id` on the session detail vs the signed-in user's id.
  const isCreator: boolean | null =
    session == null
      ? null
      : me.data?.user_id != null
        ? session.creator_user_id === me.data.user_id
        : null;

  const resultsQuery = useQuery<BlindDateSessionResultsDto>({
    queryKey: BLIND_DATE_RESULTS_KEY(sessionId ?? ''),
    queryFn: () => fetchSessionResults(sessionId!),
    enabled:
      !!sessionId &&
      !!session &&
      (isCreator === true || (isCreator === null && me.isError)),
    retry: resultsRetry,
    staleTime: 30_000,
  });

  return {
    session,
    /** null until loaded — also null when the endpoint errors (check
     *  `resultsError`/`resultsFailed` to distinguish from "no winner"). */
    results: resultsQuery.data ?? null,
    /** true only once the caller is confirmed to own the session. */
    isCreator,
    isLoading: sessionQuery.isLoading || (isCreator !== false && resultsQuery.isLoading),
    isError: sessionQuery.isError,
    /** The results call failed independently of the session detail. */
    resultsFailed: isCreator === true && resultsQuery.isError,
    refetch: () => {
      void sessionQuery.refetch();
      if (isCreator === true) void resultsQuery.refetch();
    },
    refetchResults: () => void resultsQuery.refetch(),
    isRefetching: sessionQuery.isRefetching || resultsQuery.isRefetching,
  };
}

/**
 * The revealed winner's primary photo for a session the caller created —
 * used by the My Blind Dates card to swap the blurred own-photo thumb for
 * the winner's real photo once the session matched. Pass `null` to skip
 * the fetch entirely. Returns null until loaded, on error, or when there
 * is no winner — callers fall back to the blurred thumb in every case.
 * Shares the results screen's query key, so a visited session is instant.
 */
export function useWinnerPhotoUrl(sessionId: string | null): string | null {
  const query = useQuery<BlindDateSessionResultsDto>({
    queryKey: BLIND_DATE_RESULTS_KEY(sessionId ?? ''),
    queryFn: () => fetchSessionResults(sessionId!),
    enabled: !!sessionId,
    retry: resultsRetry,
    staleTime: 60_000,
  });
  return query.data?.winner?.profile?.primary_photo?.signed_url ?? null;
}
