import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    closeBlindDateSession,
    closeCurrentRound,
    createNextRound,
    fetchBlindDateSession,
    fetchSessionParticipants,
    submitRoundSelection,
} from '@/api/blindDate/blindDateApi';
import { BLIND_DATE_MY_SESSIONS_KEY } from '@/hooks/blindDate/useMyBlindDateSessions';
import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import i18n from '@/i18n';
import type {
    BlindDateRosterParticipantDto,
    BlindDateSelectionDecision,
} from '@/types/blindDate';
import { extractApiError } from '@/utils/apiError';
import { blindDateErrorCode, blindDateErrorMessage } from '@/utils/blindDateErrors';

export const BLIND_DATE_SESSION_KEY = (id: string) => ['blindDate', 'session', id] as const;
export const BLIND_DATE_ROSTER_KEY = (id: string) => ['blindDate', 'roster', id] as const;

/** Never retry the creator-only roster on a 403 — it means the wrong
 *  endpoint was called for this caller, not a transient failure. */
function rosterRetry(failureCount: number, err: unknown): boolean {
  const { code, status } = extractApiError(err);
  if (status === 403 || code.toLowerCase() === 'not_session_creator') return false;
  return failureCount < 2;
}

/** Session detail + participant roster for the creator manage screen. */
export function useSessionManage(sessionId: string | null) {
  const sessionQuery = useQuery({
    queryKey: BLIND_DATE_SESSION_KEY(sessionId ?? ''),
    queryFn: () => fetchBlindDateSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 10_000,
  });

  const me = useCurrentProfile();
  const session = sessionQuery.data ?? null;

  // `GET /sessions/{id}/participants` is creator-only. `/sessions/mine` rows
  // carry a `role` field, but a deep link may arrive without it — the
  // definitive check is `creator_user_id` on the session detail vs the
  // signed-in user's id. `null` = not yet determined (wait before calling).
  const isCreator: boolean | null =
    session == null
      ? null
      : me.data?.user_id != null
        ? session.creator_user_id === me.data.user_id
        : null;

  const rosterQuery = useQuery<BlindDateRosterParticipantDto[]>({
    queryKey: BLIND_DATE_ROSTER_KEY(sessionId ?? ''),
    queryFn: () => fetchSessionParticipants(sessionId!),
    // Only call the roster endpoint once the caller is known to be the
    // creator — a joined (PARTICIPANT) session must never hit it. If the
    // profile lookup itself fails we can't prove ownership; fail open once
    // so creators aren't stranded — the 403 retry guard prevents loops.
    enabled:
      !!sessionId &&
      !!session &&
      (isCreator === true || (isCreator === null && me.isError)),
    retry: rosterRetry,
    staleTime: 10_000,
  });

  return {
    session,
    participants: rosterQuery.data ?? [],
    /** true only once the caller is confirmed to own the session. */
    isCreator,
    isLoading: sessionQuery.isLoading || (isCreator !== false && rosterQuery.isLoading),
    isError: sessionQuery.isError || (isCreator === true && rosterQuery.isError),
    refetch: () => {
      void sessionQuery.refetch();
      if (isCreator === true) void rosterQuery.refetch();
    },
    isRefetching: sessionQuery.isRefetching || rosterQuery.isRefetching,
  };
}

/** Creator actions on a session: selections, round lifecycle, close. */
export function useSessionManageMutations(sessionId: string | null) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    if (!sessionId) return;
    void queryClient.invalidateQueries({ queryKey: BLIND_DATE_SESSION_KEY(sessionId) });
    void queryClient.invalidateQueries({ queryKey: BLIND_DATE_ROSTER_KEY(sessionId) });
    void queryClient.invalidateQueries({ queryKey: BLIND_DATE_MY_SESSIONS_KEY });
  };

  const select = useMutation({
    mutationFn: ({
      participantId,
      decision,
    }: {
      participantId: string;
      decision: BlindDateSelectionDecision;
    }) => submitRoundSelection(sessionId!, participantId, decision),
    onSuccess: invalidate,
  });

  const closeRound = useMutation({
    mutationFn: () => closeCurrentRound(sessionId!),
    onSuccess: invalidate,
  });

  const nextRound = useMutation({
    mutationFn: (picked: { questionIds: string[]; customQuestionIds: string[] }) =>
      createNextRound(sessionId!, picked.questionIds, picked.customQuestionIds),
    onSuccess: invalidate,
  });

  const closeSession = useMutation({
    mutationFn: () => closeBlindDateSession(sessionId!),
    onSuccess: invalidate,
  });

  /** Map documented error codes to localized, user-facing copy. */
  const friendlyError = (err: unknown, maxRoundQuestions?: number): string => {
    const code = blindDateErrorCode(err);
    // Stale roster — the participant left mid-action; resync before showing.
    if (
      code === 'participant_not_in_session' ||
      code === 'participant_not_in_round' ||
      code === 'participant_not_active'
    ) {
      void invalidate();
    }
    if (code === 'invalid_question_count' && maxRoundQuestions != null) {
      return i18n.t('blindDate.create.errors.invalidQuestionCount', {
        max: maxRoundQuestions,
      });
    }
    return blindDateErrorMessage(err);
  };

  return { select, closeRound, nextRound, closeSession, invalidate, friendlyError };
}
