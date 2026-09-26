import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import {
    fetchBlindDateSession,
    fetchRoundQuestions,
    submitFinalDecision,
    submitParticipantAnswers,
    withdrawParticipation,
} from '@/api/blindDate/blindDateApi';
import { useJoinSession } from '@/hooks/blindDate/useJoinSession';
import { useMyParticipations } from '@/hooks/blindDate/useMyParticipations';
import type {
    BlindDateFinalDecisionValue,
    BlindDateParticipationDto,
    BlindDateSessionDto,
    BlindDateSessionQuestionDto,
} from '@/types/blindDate';
import { extractApiError } from '@/utils/apiError';

// ─── Step model ───────────────────────────────────────────────────────────────

export type ParticipantStep =
  | 'JOIN_CONFIRM'       // user hasn't joined yet — confirmation + question preview
  | 'ROUND_INTRO'        // joined/advanced; ready to start answering this round
  | 'ANSWERING'          // actively answering questions one at a time
  | 'ROUND_COMPLETE'     // answers just submitted — celebration before leaving
  | 'WAITING'            // answers submitted; waiting for creator
  | 'ADVANCED'           // creator advanced the participant (celebration)
  | 'ELIMINATED'         // creator did not advance / participant withdrew / session ended
  | 'FINALIST'           // selected as finalist — celebration before reveal
  | 'REVEAL_INTRO'       // ready to reveal; blurred profile + "Reveal" CTA
  | 'REVEAL_COUNTDOWN'   // 3→2→1 animation (driven by revealPhase)
  | 'REVEAL_PROFILE'     // real profile shown after countdown
  | 'FINAL_DECISION'     // choosing INTERESTED / NOT_INTERESTED
  | 'WAITING_DECISION'   // decision submitted; waiting for the other side
  | 'MATCH'              // mutual INTERESTED
  | 'NO_MATCH';          // NO_MATCH / EXPIRED

type RevealPhase = 'intro' | 'countdown' | 'profile' | 'decide';

// ─── Step derivation ──────────────────────────────────────────────────────────

function deriveStep(args: {
  participantId: string | null;
  participation: BlindDateParticipationDto | null;
  session: BlindDateSessionDto | null;
  questions: BlindDateSessionQuestionDto[];
  submittedIds: Set<string>;
  startedAnswering: boolean;
  hasDrafts: boolean;
  justSubmitted: boolean;
  seenFinalist: boolean;
  celebratedRound: number | null;
}): ParticipantStep {
  const {
    participantId, participation, session, questions,
    submittedIds, startedAnswering, hasDrafts,
    justSubmitted, seenFinalist, celebratedRound,
  } = args;

  if (!participantId) return 'JOIN_CONFIRM';

  const fd = session?.final_decision ?? null;
  const pStatus = participation?.status;

  // Terminal participant states
  if (pStatus === 'ELIMINATED' || pStatus === 'WITHDRAWN') return 'ELIMINATED';

  // Reveal / finalist stage
  const inReveal =
    pStatus === 'FINALIST' ||
    pStatus === 'REVEALED' ||
    session?.status === 'REVEAL';

  if (inReveal) {
    if (fd?.outcome === 'MATCHED' || fd?.outcome === 'ALREADY_MATCHED') return 'MATCH';
    if (fd?.outcome === 'NO_MATCH' || fd?.outcome === 'EXPIRED') return 'NO_MATCH';
    if (fd && fd.my_decision !== 'PENDING' && fd.my_decision != null) {
      return 'WAITING_DECISION';
    }
    // Pending decision — finalist celebration shows once before the reveal.
    if (pStatus === 'FINALIST' && !seenFinalist) return 'FINALIST';
    return 'REVEAL_INTRO';
  }

  // Session ended while participant was still in the running
  if (session && session.status !== 'OPEN') return 'ELIMINATED';

  // Advanced but their round is closed and the next one isn't open yet —
  // nothing to answer, regardless of what the questions query returns.
  const myRound = session?.rounds?.find((r) => r.id === participation?.current_round_id);
  if (pStatus === 'ADVANCED' && myRound && myRound.status !== 'OPEN') return 'WAITING';

  // Normal round states
  if (justSubmitted) return 'ROUND_COMPLETE';

  const allSubmitted =
    questions.length > 0 &&
    questions.every((q) => q.my_answer != null || submittedIds.has(q.id));
  if (allSubmitted || participation?.answers_submitted === true) return 'WAITING';

  if (submittedIds.size > 0 || startedAnswering || hasDrafts) return 'ANSWERING';

  // "Advanced" celebration fires once per newly unlocked round.
  const round = participation?.current_round_number ?? session?.current_round_number ?? 1;
  if (pStatus === 'ADVANCED' && celebratedRound !== round) return 'ADVANCED';

  // Skip the intro screen entirely — the merged answering screen shows the
  // round theme inline, so there is no separate ROUND_INTRO step.
  return 'ANSWERING';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useParticipantFlow(
  sessionId: string | null,
  participantId: string | null,
) {
  const queryClient = useQueryClient();

  const { items: participations } = useMyParticipations({
    enabled: !!participantId || !!sessionId,
  });
  const participation = useMemo(
    () =>
      participations.find((p) => p.participant_id === participantId) ??
      // Fallback: resolve the caller's participant row by session — covers
      // navigation paths that only carry sessionId (e.g. "My Sessions" rows
      // with role PARTICIPANT or redirects from the creator manage screen).
      participations.find((p) => p.session_id === sessionId) ??
      null,
    [participations, participantId, sessionId],
  );

  // The effective participant id: explicit param wins, otherwise the row
  // resolved from the participations list.
  const effectiveParticipantId = participantId ?? participation?.participant_id ?? null;

  const { data: session, refetch: refetchSession } = useQuery({
    queryKey: ['blindDate', 'session', sessionId],
    queryFn: () => fetchBlindDateSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  // Pre-join there is no participation row — fall back to the session's current
  // round so JOIN_CONFIRM can preview Round 1 questions.
  const sessionRoundId = useMemo(() => {
    const rounds = session?.rounds ?? [];
    const current = session?.current_round_number ?? 1;
    return rounds.find((r) => r.round_number === current)?.id ?? rounds[0]?.id ?? null;
  }, [session]);

  const currentRoundId = participation?.current_round_id ?? sessionRoundId;
  const { data: roundQuestions, isLoading: questionsLoading } = useQuery({
    queryKey: ['blindDate', 'roundQuestions', currentRoundId],
    queryFn: () => fetchRoundQuestions(currentRoundId!),
    enabled: !!currentRoundId,
    staleTime: 15_000,
  });

  // ── Local answer state ─────────────────────────────────────────────────────

  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [startedAnswering, setStartedAnswering] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  // True while re-opening already-submitted answers for edits — overrides the
  // derived WAITING step so the answering UI is reachable after submission.
  const [editingAnswers, setEditingAnswers] = useState(false);

  // ── Celebration / reveal sub-state ─────────────────────────────────────────

  const [revealPhase, setRevealPhase] = useState<RevealPhase>('intro');
  const [seenFinalist, setSeenFinalist] = useState(false);
  const [celebratedRound, setCelebratedRound] = useState<number | null>(null);

  // ── Join ───────────────────────────────────────────────────────────────────

  const joinMutation = useJoinSession();
  const [joinError, setJoinError] = useState<string | null>(null);

  const joinSession = useCallback(async () => {
    if (!sessionId) return null;
    setJoinError(null);
    try {
      const result = await joinMutation.mutateAsync({ sessionId });
      void queryClient.invalidateQueries({ queryKey: ['blindDate', 'participations'] });
      return result;
    } catch (err) {
      const { code, message } = extractApiError(err);
      const friendly: Record<string, string> = {
        already_joined: 'You already joined this session.',
        session_full: 'This session is full.',
        session_expired: 'This session has expired.',
        session_not_open: 'This session is no longer open.',
        creator_cannot_join: 'You cannot join your own session.',
        join_window_closed: 'Joining is only allowed during Round 1.',
        no_open_round: 'Round 1 is not open right now.',
        session_not_found: 'This Blind Date no longer exists.',
      };
      setJoinError(friendly[code.toLowerCase()] ?? message);
      throw err;
    }
  }, [sessionId, joinMutation, queryClient]);

  // ── Answer submission (auto-save per question — upsert endpoint) ───────────

  const autoSaveAnswer = useCallback(
    async (questionId: string, answerOverride?: string): Promise<boolean> => {
      if (!effectiveParticipantId) return false;
      const answer = (answerOverride ?? answerDrafts[questionId] ?? '').trim();
      if (!answer) {
        setAnswerError('Please write an answer before continuing.');
        return false;
      }
      if (answer.length > 2000) {
        setAnswerError('Answer is too long (max 2000 characters).');
        return false;
      }
      if (answerLocked) {
        setAnswerError('The host has made their decision — your answers are now locked.');
        return false;
      }

      if (answerOverride != null) {
        setAnswerDrafts((prev) => ({ ...prev, [questionId]: answer }));
      }
      setSavingQuestionId(questionId);
      setAnswerError(null);
      try {
        await submitParticipantAnswers(effectiveParticipantId, { [questionId]: answer });
        setSubmittedIds((prev) => new Set([...prev, questionId]));
        return true;
      } catch (err) {
        const { code, message } = extractApiError(err);
        const c = code.toLowerCase();
        if (c === 'answer_locked') {
          setAnswerLocked(true);
          setAnswerError('The host has made their decision — your answers are now locked.');
          void refetchSession();
          void queryClient.invalidateQueries({ queryKey: ['blindDate', 'participations'] });
        } else if (c === 'answer_too_long') {
          setAnswerError('Answer is too long (max 2000 characters).');
        } else if (c === 'round_closed') {
          setAnswerError('This round has ended.');
          void refetchSession();
          void queryClient.invalidateQueries({ queryKey: ['blindDate', 'participations'] });
        } else if (c === 'participant_not_active' || c === 'participant_not_found') {
          setAnswerError('Your participation has ended.');
          void refetchSession();
          void queryClient.invalidateQueries({ queryKey: ['blindDate', 'participations'] });
        } else {
          setAnswerError(message);
        }
        return false;
      } finally {
        setSavingQuestionId(null);
      }
    },
    [effectiveParticipantId, answerDrafts, answerLocked, refetchSession, queryClient],
  );

  /** Flush any dirty drafts on the last question, then mark the round complete. */
  const finalizeAnswers = useCallback(async (): Promise<boolean> => {
    if (!effectiveParticipantId) return false;
    const questions = roundQuestions ?? [];
    const dirty: Record<string, string> = {};
    for (const q of questions) {
      const a = (answerDrafts[q.id] ?? '').trim();
      if (a && !submittedIds.has(q.id)) dirty[q.id] = a;
    }
    try {
      if (Object.keys(dirty).length > 0) {
        await submitParticipantAnswers(effectiveParticipantId, dirty);
        setSubmittedIds((prev) => new Set([...prev, ...Object.keys(dirty)]));
      }
      // Only celebrate the first submission — saving edits returns quietly to
      // WAITING rather than replaying the "Round Complete" confetti screen.
      if (!editingAnswers) setJustSubmitted(true);
      setEditingAnswers(false);
      return true;
    } catch (err) {
      const { code, message } = extractApiError(err);
      if (code.toLowerCase() === 'answer_locked') {
        // Creator already decided — stop the flow; the refetched participation
        // status moves the step to ADVANCED/ELIMINATED/WAITING via deriveStep.
        setAnswerLocked(true);
        void refetchSession();
        void queryClient.invalidateQueries({ queryKey: ['blindDate', 'participations'] });
        return true;
      }
      if (code.toLowerCase() === 'round_closed') {
        setAnswerError('This round has ended.');
        void refetchSession();
        void queryClient.invalidateQueries({ queryKey: ['blindDate', 'participations'] });
        return false;
      }
      setAnswerError(message);
      return false;
    }
  }, [effectiveParticipantId, roundQuestions, answerDrafts, submittedIds, editingAnswers, refetchSession, queryClient]);

  // ── Final decision ─────────────────────────────────────────────────────────

  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const submitDecision = useCallback(
    async (decision: Exclude<BlindDateFinalDecisionValue, 'PENDING'>) => {
      if (!sessionId) return null;
      setDeciding(true);
      setDecisionError(null);
      try {
        const res = await submitFinalDecision(sessionId, decision);
        void queryClient.invalidateQueries({ queryKey: ['blindDate', 'session', sessionId] });
        void queryClient.invalidateQueries({ queryKey: ['blindDate', 'participations'] });
        void refetchSession();
        return res;
      } catch (err) {
        const { message } = extractApiError(err);
        setDecisionError(message);
        throw err;
      } finally {
        setDeciding(false);
      }
    },
    [sessionId, queryClient, refetchSession],
  );

  // ── Withdraw ───────────────────────────────────────────────────────────────

  const [withdrawing, setWithdrawing] = useState(false);

  const withdraw = useCallback(async () => {
    if (!effectiveParticipantId) return;
    setWithdrawing(true);
    try {
      await withdrawParticipation(effectiveParticipantId);
      void queryClient.invalidateQueries({ queryKey: ['blindDate', 'participations'] });
      void queryClient.invalidateQueries({ queryKey: ['blindDate', 'session', sessionId] });
    } finally {
      setWithdrawing(false);
    }
  }, [effectiveParticipantId, queryClient, sessionId]);

  // ── Navigation helpers ─────────────────────────────────────────────────────

  const setDraft = useCallback((questionId: string, text: string) => {
    setAnswerDrafts((prev) => ({ ...prev, [questionId]: text }));
    setAnswerError(null);
  }, []);

  const beginAnswering = useCallback(() => {
    setAnswerError(null);
    // Resume at the first unanswered question — never restart at index 0.
    const first = (roundQuestions ?? []).findIndex(
      (q) => q.my_answer == null && !submittedIds.has(q.id),
    );
    setCurrentQuestionIndex(first === -1 ? 0 : first);
    setStartedAnswering(true);
  }, [roundQuestions, submittedIds]);

  /** Re-open already-submitted answers for editing while the round is still
   *  open — answers are upserted, so changes are safe until the host locks. */
  const beginEditingAnswers = useCallback(() => {
    setAnswerError(null);
    setCurrentQuestionIndex(0);
    setStartedAnswering(true);
    setEditingAnswers(true);
  }, []);

  const advanceQuestion = useCallback(() => {
    setAnswerError(null);
    setCurrentQuestionIndex((i) => i + 1);
  }, []);

  const goBackQuestion = useCallback(() => {
    setAnswerError(null);
    setCurrentQuestionIndex((i) => Math.max(0, i - 1));
  }, []);

  const markAdvancedSeen = useCallback(() => {
    const round =
      participation?.current_round_number ?? session?.current_round_number ?? 1;
    setCelebratedRound(round);
  }, [participation?.current_round_number, session?.current_round_number]);

  const markFinalistSeen = useCallback(() => setSeenFinalist(true), []);

  // Seed drafts/submitted ids from server `my_answer` when a round's questions
  // load (or the round changes) — this is what makes resume work across
  // devices and reinstalls. Local unsaved edits win over server values.
  // (Render-time state adjustment, per React docs — no effect needed.)
  const [seededRoundId, setSeededRoundId] = useState<string | null>(null);
  if (roundQuestions && currentRoundId && currentRoundId !== seededRoundId) {
    setSeededRoundId(currentRoundId);
    const serverDrafts: Record<string, string> = {};
    const serverSubmitted = new Set<string>();
    let firstUnanswered = -1;
    roundQuestions.forEach((q, i) => {
      if (q.my_answer != null) {
        serverDrafts[q.id] = q.my_answer;
        serverSubmitted.add(q.id);
      } else if (firstUnanswered === -1) {
        firstUnanswered = i;
      }
    });
    setAnswerDrafts((prev) => ({ ...serverDrafts, ...prev }));
    setSubmittedIds((prev) => new Set([...serverSubmitted, ...prev]));
    setCurrentQuestionIndex(firstUnanswered === -1 ? 0 : firstUnanswered);
  }

  // Clear the post-submit celebration once the round outcome changes —
  // otherwise returning to the screen would replay ROUND_COMPLETE forever.
  // (Render-time state adjustment, per React docs — no effect needed.)
  const [prevPStatus, setPrevPStatus] = useState(participation?.status);
  if (participation?.status !== prevPStatus) {
    setPrevPStatus(participation?.status);
    const s = participation?.status;
    if (
      justSubmitted &&
      (s === 'ADVANCED' || s === 'FINALIST' || s === 'ELIMINATED' || s === 'REVEALED' || s === 'WITHDRAWN')
    ) {
      setJustSubmitted(false);
    }
    // Any status move ends an edit session — e.g. the host locked answers
    // mid-edit and the participant transitioned to ELIMINATED/ADVANCED.
    if (s !== 'ACTIVE') {
      setEditingAnswers(false);
    }
  }

  const acknowledgeRoundComplete = useCallback(() => setJustSubmitted(false), []);

  const startReveal = useCallback(() => setRevealPhase('countdown'), []);
  const finishCountdown = useCallback(() => setRevealPhase('profile'), []);
  const beginDecision = useCallback(() => setRevealPhase('decide'), []);

  // ── Derived step ───────────────────────────────────────────────────────────

  const questions = roundQuestions ?? [];
  const step = deriveStep({
    participantId: effectiveParticipantId,
    participation,
    session: session ?? null,
    questions,
    submittedIds,
    startedAnswering,
    hasDrafts: Object.keys(answerDrafts).length > 0,
    justSubmitted,
    seenFinalist,
    celebratedRound,
  });

  // Reveal sub-phases refine REVEAL_INTRO into countdown/profile/decision steps.
  // Editing already-submitted answers re-opens the answering UI over WAITING.
  const effectiveStep: ParticipantStep =
    editingAnswers && step === 'WAITING'
      ? 'ANSWERING'
      : step === 'REVEAL_INTRO'
      ? revealPhase === 'countdown'
        ? 'REVEAL_COUNTDOWN'
        : revealPhase === 'profile'
          ? 'REVEAL_PROFILE'
          : revealPhase === 'decide'
            ? 'FINAL_DECISION'
            : 'REVEAL_INTRO'
      : step;

  return {
    // Data
    session,
    participation,
    /** Resolved participant id (route param or participation lookup). */
    participantId: effectiveParticipantId,
    questions,
    currentQuestion: questions[currentQuestionIndex] ?? null,
    currentQuestionIndex,
    totalQuestions: questions.length,
    questionsLoading,

    // Step
    step: effectiveStep,
    revealPhase,

    // Answer state
    answerDrafts,
    submittedIds,
    savingQuestionId,
    answerError,
    answerLocked,
    setDraft,
    beginAnswering,
    beginEditingAnswers,
    editingAnswers,
    advanceQuestion,
    goBackQuestion,
    autoSaveAnswer,
    finalizeAnswers,

    // Join
    joinSession,
    joinMutation,
    joinError,

    // Reveal / finalist
    markFinalistSeen,
    startReveal,
    finishCountdown,
    beginDecision,

    // Final decision
    submitDecision,
    deciding,
    decisionError,

    // Withdraw
    withdraw,
    withdrawing,

    // Misc
    markAdvancedSeen,
    acknowledgeRoundComplete,
    refetchSession,
  };
}
