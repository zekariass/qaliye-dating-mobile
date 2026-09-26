// ─── Blind Date API types ─────────────────────────────────────────────────────
// Mirrors docs/blind-date/bind-date-backend-api.md

export type BlindDateSessionStatus =
  | 'OPEN'
  | 'REVEAL'
  | 'CLOSED'
  | 'EXPIRED'
  | 'COMPLETED'
  | 'CANCELLED';

export type BlindDateRoundStatus = 'OPEN' | 'CLOSED';

export type BlindDateParticipantStatus =
  | 'ACTIVE'
  | 'ADVANCED'
  | 'ELIMINATED'
  | 'FINALIST'
  | 'REVEALED'
  | 'WITHDRAWN';

export type BlindDateSelectionDecision = 'ADVANCE' | 'ELIMINATE' | 'SELECT_FINALIST';

export type BlindDateFinalDecisionValue = 'PENDING' | 'INTERESTED' | 'NOT_INTERESTED';

export type BlindDateFinalOutcome = 'MATCHED' | 'NO_MATCH' | 'ALREADY_MATCHED' | 'EXPIRED';

/**
 * Present on session payloads once a final-decision row exists (status
 * `REVEAL` or later); `null` otherwise. `my_decision` is the caller's own
 * decision — `null` when the caller is neither creator nor finalist. The other
 * party's choice is intentionally never exposed until `outcome` resolves.
 */
export type BlindDateFinalDecisionDto = {
  my_decision: BlindDateFinalDecisionValue | null;
  other_party_decided: boolean;
  outcome: BlindDateFinalOutcome | null;
  match_id: string | null;
  revealed_at: string | null;
  decision_deadline_at: string | null;
};

// ─── Configuration ────────────────────────────────────────────────────────────

export type BlindDateSupportedLanguage = {
  code: string;
  name: string;
};

export type BlindDateLimits = {
  /**
   * All caps are optional: older backends may omit them, in which case the
   * client applies no cap and relies on server-side validation errors.
   */
  max_participants?: number;
  max_rounds?: number;
  max_round_questions?: number;
  max_questions?: number;
  max_custom_questions?: number;
};

export type BlindDateConfigurationDto = {
  enabled: boolean;
  language_code: string;
  supported_languages: BlindDateSupportedLanguage[];
  limits: BlindDateLimits;
};

/** PATCH /configuration — all fields optional. */
export type BlindDateConfigurationPatch = {
  languageCode?: string;
  enabled?: boolean;
};

// ─── Catalog ──────────────────────────────────────────────────────────────────

export type BlindDateCatalogCategoryDto = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  sort_order: number;
  /** Optional question count — not in the documented payload yet. */
  question_count?: number | null;
};

export type BlindDateCatalogQuestionDto = {
  id: string;
  category_id: string;
  code: string;
  question: string;
  sort_order: number;
};

// ─── Question set ─────────────────────────────────────────────────────────────

/** A platform question the caller picked into their set, with their answer. */
export type BlindDateSetQuestionDto = {
  /** The set row id — used for answer/delete/reorder calls. */
  id: string;
  /** The catalog question id — used to detect "already in set". */
  question_id: string;
  question: string;
  /** Caller's own answer; null = unanswered. */
  answer: string | null;
  sort_order: number;
  category_id: string | null;
  category_code: string | null;
};

export type BlindDateCustomQuestionDto = {
  id: string;
  question: string;
  answer: string | null;
  sort_order: number;
};

/** GET /question-set — the caller's permanent, reusable question pool. */
export type BlindDateQuestionSetDto = {
  questions: BlindDateSetQuestionDto[];
  custom_questions: BlindDateCustomQuestionDto[];
};

// ─── Sessions ─────────────────────────────────────────────────────────────────

export type BlindDateRoundDto = {
  id: string;
  session_id: string;
  round_number: number;
  status: BlindDateRoundStatus;
  started_at: string | null;
  completed_at: string | null;
};

export type BlindDateCreatorPhoto = {
  id: string;
  signed_url: string;
  expires_at: string;
};

/**
 * Safe anonymous creator metadata included on every session payload (see
 * bind-date-backend-api.md §2.4 and home-screen spec §20). Never carries
 * user id, name or username. Any field may be `null` if the creator hasn't
 * filled it in, and `primary_photo` is `null` if there's no approved photo —
 * `primary_photo.signed_url` is short-lived and must always be rendered
 * blurred, never at full identity-revealing clarity.
 */
export type BlindDateCreatorPreview = {
  gender?: string | null;
  age?: number | null;
  religion?: string | null;
  relationship_intention?: string | null;
  /** Only surfaced in the UI when the creator and viewer share a country. */
  city?: string | null;
  country?: string | null;
  primary_photo?: BlindDateCreatorPhoto | null;
};

/**
 * Session summary as returned by GET /sessions/discover.
 *
 * `creator` is present on every session payload per the backend doc, but is
 * typed nullable defensively. `title`/`description`/`topics` remain optional
 * presentation fields not yet in the documented payload.
 */
export type BlindDateSessionSummaryDto = {
  id: string;
  creator_user_id: string;
  status: BlindDateSessionStatus;
  language_code: string;
  expires_at: string | null;
  created_at: string;
  participant_count: number;
  creator?: BlindDateCreatorPreview | null;
  /** Present once the session reaches REVEAL; `null` before that. */
  final_decision?: BlindDateFinalDecisionDto | null;
  // Optional / forward-compatible fields (not yet in the documented payload)
  title?: string | null;
  description?: string | null;
  topics?: string[] | null;
  current_round_number?: number;
};

/** Full session detail — response shape of POST /sessions and GET /sessions/{id}. */
export type BlindDateSessionDto = BlindDateSessionSummaryDto & {
  rounds: BlindDateRoundDto[];
  current_round_number: number;
};

export type BlindDateSessionQuestionDto = {
  id: string;
  round_id: string;
  question: string;
  sort_order: number;
  /**
   * The caller's saved answer for this question, or `null` if not yet
   * answered. Always `null` for the session creator. Used to resume the
   * answering flow — optional for forward compatibility with older backends.
   */
  my_answer?: string | null;
};

// ─── Participation ────────────────────────────────────────────────────────────

export type BlindDateJoinResponseDto = {
  participant_id: string;
  session_id: string;
  status: BlindDateParticipantStatus;
  current_round_id: string;
};

/**
 * One row of "My Participations" — the caller's participation joined with the
 * session it belongs to.
 *
 * The documented `GET /participations` payload is session-shaped (same as
 * `GET /sessions/mine`): a session row carrying `role`, `participant_id`,
 * `participant_status`, `current_round_id` and `current_round_number`. The API
 * layer normalizes it into this shape: `status` is the *participant* status
 * (never the session status) and `session` always carries the session fields
 * (synthesized from the flat row when no embedded `session` object exists).
 */
export type BlindDateParticipationDto = {
  participant_id: string;
  session_id: string;
  status: BlindDateParticipantStatus;
  current_round_id: string | null;
  current_round_number?: number | null;
  joined_at: string;
  advanced_at?: string | null;
  finalist_at?: string | null;
  eliminated_at?: string | null;
  /** Defensive: whether the caller already submitted current-round answers. */
  answers_submitted?: boolean | null;
  /** Defensive: unanswered question count for the current round. */
  pending_question_count?: number | null;
  session?: BlindDateSessionSummaryDto | null;
};

// ─── Creator "My Sessions" ────────────────────────────────────────────────────

/**
 * One row of "My Sessions" (`GET /sessions/mine`) — covers sessions the caller
 * created AND sessions they joined. `role` discriminates the two: only
 * 'CREATOR' rows may call the creator-only roster endpoint
 * (`GET /sessions/{id}/participants` — 403 `not_session_creator` otherwise).
 */
export type BlindDateMySessionDto = BlindDateSessionDto & {
  /** Caller's role on this session row. */
  role?: 'CREATOR' | 'PARTICIPANT';
  /** Caller's participant id — present when role === 'PARTICIPANT'. */
  participant_id?: string | null;
  /** Caller's participant status — present when role === 'PARTICIPANT'. */
  participant_status?: BlindDateParticipantStatus | null;
  /** Caller's current round id — present when role === 'PARTICIPANT'. */
  current_round_id?: string | null;
  /** Participants awaiting a selection decision in the current round. */
  awaiting_review_count?: number | null;
  /** Final outcome once the session is COMPLETED. */
  outcome?: BlindDateFinalOutcome | null;
};

// ─── Creator roster ───────────────────────────────────────────────────────────

/** One participant's answer to a round question (creator view — anonymous). */
export type BlindDateRosterAnswerDto = {
  session_question_id: string;
  question: string;
  answer: string;
  submitted_at: string | null;
};

/**
 * One row of GET /sessions/{id}/participants — creator only. `user_id` is
 * intentionally absent: the game stays blind until reveal. `answers` holds the
 * participant's answers to the current open round (empty when none is open).
 */
export type BlindDateRosterParticipantDto = {
  participant_id: string;
  status: BlindDateParticipantStatus;
  current_round_id: string | null;
  joined_at: string;
  /**
   * The creator's recorded selection for the open round. ADVANCE only marks
   * the participant — `status` stays ACTIVE until the round closes — so this
   * field is what the UI uses to show "marked to advance" feedback.
   */
  decision?: BlindDateSelectionDecision | null;
  answers: BlindDateRosterAnswerDto[];
};

// ─── Results (creator) ────────────────────────────────────────────────────────

/**
 * The revealed finalist's public profile, as embedded in the results payload.
 * Only present once the session has reached the reveal stage — the same
 * fields as `BlindDateCreatorPreview` plus `display_name`.
 */
export type BlindDateWinnerProfileDto = {
  display_name?: string | null;
  age?: number | null;
  gender?: string | null;
  religion?: string | null;
  relationship_intention?: string | null;
  city?: string | null;
  country?: string | null;
  primary_photo?: BlindDateCreatorPhoto | null;
};

/** One session round with the winner's answers to it. */
export type BlindDateWinnerRoundDto = {
  round_id: string;
  round_number: number;
  answers: BlindDateRosterAnswerDto[];
};

/**
 * The session's winning participant. `user_id` is only exposed because the
 * reveal already happened — both sides may see each other at that point.
 */
export type BlindDateSessionWinnerDto = {
  participant_id: string;
  user_id?: string | null;
  status: BlindDateParticipantStatus;
  profile?: BlindDateWinnerProfileDto | null;
  /** Every session round, ordered by round_number, with the winner's answers. */
  rounds: BlindDateWinnerRoundDto[];
};

/**
 * Response of GET /sessions/{id}/results — creator only. `winner` is `null`
 * when the session ended before a finalist was selected.
 */
export type BlindDateSessionResultsDto = {
  session_id: string;
  status: BlindDateSessionStatus;
  created_at: string;
  participant_count: number;
  round_count: number;
  outcome: BlindDateFinalOutcome | null;
  match_id: string | null;
  winner: BlindDateSessionWinnerDto | null;
};

// ─── Requests ─────────────────────────────────────────────────────────────────

export type CreateBlindDateSessionPayload = {
  idempotencyKey: string;
  questionIds?: string[];
  customQuestionIds?: string[];
  languageCode?: string;
  expiresAt?: string | null;
};

export type BlindDateFinalDecisionResponseDto = {
  session_id: string;
  creator_decision: BlindDateFinalDecisionValue;
  participant_decision: BlindDateFinalDecisionValue;
  outcome: BlindDateFinalOutcome | null;
  match_id: string | null;
};
