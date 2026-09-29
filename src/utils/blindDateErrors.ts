// ─── Blind Date API error mapping ────────────────────────────────────────────
// Per the Blind Date error-handling contract, `error.message` mirrors the code
// for machine errors and is NOT human-readable — never display it directly.
// Every code maps to a localized string under `blindDate.errors.*`; unknown
// codes fall back to a generic message for their HTTP status.

import { themedError } from '@/components/common/ThemedAlert';
import i18n from '@/i18n';
import { extractApiError } from '@/utils/apiError';
import { isInsufficientCreditsError } from '@/utils/entitlements';

/** Normalized (lowercase) error code from the API envelope, or '' if none. */
export function blindDateErrorCode(err: unknown): string {
  return extractApiError(err).code.toLowerCase();
}

// Contract + server-observed codes → key under `blindDate.errors.*`.
const CODE_TO_KEY: Record<string, string> = {
  // Session lifecycle
  session_not_found: 'sessionNotFound',
  participant_not_found: 'participantNotFound',
  round_not_found: 'roundNotFound',
  session_not_open: 'sessionNotOpen',
  session_expired: 'sessionExpired',
  session_full: 'sessionFull',
  join_window_closed: 'joinWindowClosed',
  already_joined: 'alreadyJoined',
  no_open_round: 'noOpenRound',
  round_closed: 'roundClosed',
  participant_not_active: 'participantNotActive',
  blocked: 'blocked',
  creator_disabled_blind_date: 'creatorDisabledBlindDate',
  idempotency_key_in_use: 'idempotencyKeyInUse',
  creator_cannot_join: 'creatorCannotJoin',
  active_session_exists: 'activeSessionExists',
  // Reveal & final decision
  session_not_in_reveal: 'sessionNotInReveal',
  no_final_decision: 'noFinalDecision',
  decision_already_resolved: 'decisionAlreadyResolved',
  decision_already_submitted: 'decisionAlreadySubmitted',
  finalist_not_found: 'finalistNotFound',
  finalist_withdrawn: 'finalistWithdrawn',
  not_a_decision_party: 'notADecisionParty',
  invalid_decision: 'invalidDecision',
  match_conflict: 'tryAgain',
  like_conflict: 'tryAgain',
  // Question set / config
  question_not_found: 'questionNotFound',
  set_question_not_found: 'setQuestionNotFound',
  custom_question_not_found: 'customQuestionNotFound',
  max_questions_reached: 'maxQuestionsReached',
  max_custom_questions_reached: 'maxCustomQuestionsReached',
  question_not_in_set: 'questionNotInSet',
  custom_question_not_in_set: 'questionNotInSet',
  question_unanswered: 'questionUnanswered',
  question_required: 'questionRequired',
  question_too_long: 'questionTooLong',
  answer_required: 'answerRequired',
  answer_too_long: 'answerTooLong',
  invalid_sort_order: 'tryAgain',
  unsupported_language: 'unsupportedLanguage',
  // Access control
  not_in_session: 'notInSession',
  not_participant: 'notParticipant',
  not_session_creator: 'notSessionCreator',
  // Additional codes observed from the server
  answer_locked: 'answerLocked',
  round_still_open: 'roundStillOpen',
  max_rounds_reached: 'maxRoundsReached',
  invalid_question_count: 'invalidQuestionCount',
  participant_not_in_session: 'participantNotInSession',
  participant_not_in_round: 'participantNotInRound',
  // Generic bucket codes
  validation_error: 'validationError',
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  not_found: 'notFound',
  conflict: 'conflict',
  rate_limited: 'rateLimited',
  internal_error: 'internalError',
};

/** Generic bucket for an unrecognized code, chosen by HTTP status. */
function fallbackKeyForStatus(status?: number): string {
  switch (status) {
    case 400:
      return 'validationError';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 409:
      return 'conflict';
    case 429:
      return 'rateLimited';
    default:
      return status != null && status >= 500 ? 'internalError' : 'generic';
  }
}

/**
 * Localized, user-facing message for a Blind Date API error. Never returns the
 * raw `error.message` — per the contract it mirrors the machine code.
 */
export function blindDateErrorMessage(err: unknown): string {
  const { code, status } = extractApiError(err);
  const key = CODE_TO_KEY[code.toLowerCase()] ?? fallbackKeyForStatus(status);
  return i18n.t(`blindDate.errors.${key}`);
}

/**
 * Codes the contract says are safe to retry exactly once:
 *  - match_conflict / like_conflict — lost a concurrent race; the retry
 *    resolves to the committed state (it does not double-charge).
 *  - idempotency_key_in_use — regenerate a fresh UUID before retrying.
 */
const RETRY_ONCE_CODES = new Set([
  'match_conflict',
  'like_conflict',
  'idempotency_key_in_use',
]);

export function isRetryableBlindDateError(err: unknown): boolean {
  return RETRY_ONCE_CODES.has(blindDateErrorCode(err));
}

/**
 * Show the global themed error modal with a localized message for `err`.
 * No-op for insufficient-credits/limit errors — the apiClient interceptor
 * already opened the purchase sheet for those.
 */
export function showBlindDateError(err: unknown, title?: string): void {
  if (isInsufficientCreditsError(err)) return;
  themedError(title ?? i18n.t('blindDate.errors.title'), blindDateErrorMessage(err));
}
