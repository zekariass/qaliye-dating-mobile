// ─── Personal Matchmaking (Shimgilina) API types ─────────────────────────────
// Wire format is snake_case per the backend's global SNAKE_CASE strategy.
// See docs/matchmaking/backend-api-doc.md.

export type HasChildrenPreference = 'any' | 'yes' | 'no';
export type WantsChildrenPreference = 'any' | 'yes' | 'no' | 'not_sure' | 'open_to_discussion';

// Compatibility dimensions
export type MarriageTimeline = 'NOW' | 'ONE_TO_TWO_YEARS' | 'THREE_TO_FIVE_YEARS' | 'NOT_SURE';
export type LongDistanceRelationship = 'YES' | 'NO';
export type FamilyInvolvement = 'YES' | 'NO';
export type ReligionImportant = 'YES' | 'NO';
export type WillingToRelocate = 'YES' | 'NO';

export type MatchmakingRequestStatus =
  | 'OPEN'
  | 'ON_HOLD'
  | 'MATCHED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type IntroductionDecision = 'INTERESTED' | 'NOT_INTERESTED';
export type IntroductionDecisionPending = 'PENDING' | IntroductionDecision;

export type IntroductionStatus =
  | 'PROPOSED'
  | 'MATCHED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED';

/** `GET /api/v1/matchmaking/preferences` response. */
export type MatchmakingPreferencesDto = {
  id: string;
  user_id: string;
  version: number;
  /** Server-derived from the caller's profile — never client-editable. */
  gender: 'MALE' | 'FEMALE' | null;
  min_age: number | null;
  max_age: number | null;
  min_height_cm: number | null;
  max_height_cm: number | null;
  /** ISO 3166-1 alpha-2 codes; [] = any country. */
  specific_country_codes: string[];
  has_children_preference: HasChildrenPreference;
  wants_children_preference: WantsChildrenPreference;
  religion_preferences: string[];
  education_levels: string[];
  marital_statuses: string[];
  smoking_preferences: string[];
  drinking_preferences: string[];
  language_preference_ids: string[];
  ethnicity_preference_ids: string[];
  /** Admin-managed internal notes — read-only for clients. */
  matchmaker_notes: string | null;
  user_notes: string | null;
  // Compatibility dimensions
  marriage_timeline: string | null;
  long_distance_relationship: string | null;
  family_involvement: string | null;
  religion_important: string | null;
  willing_to_relocate: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * `PUT /api/v1/matchmaking/preferences` body.
 * Replace semantics: omitted/null scalar = inactive constraint, [] = any.
 */
export type MatchmakingPreferencesPayload = {
  min_age?: number | null;
  max_age?: number | null;
  min_height_cm?: number | null;
  max_height_cm?: number | null;
  specific_country_codes?: string[];
  has_children_preference?: HasChildrenPreference;
  wants_children_preference?: WantsChildrenPreference;
  religion_preferences?: string[];
  education_levels?: string[];
  marital_statuses?: string[];
  smoking_preferences?: string[];
  drinking_preferences?: string[];
  language_preference_ids?: string[];
  ethnicity_preference_ids?: string[];
  user_notes?: string | null;
  // Compatibility dimensions
  marriage_timeline?: string | null;
  long_distance_relationship?: string | null;
  family_involvement?: string | null;
  religion_important?: string | null;
  willing_to_relocate?: string | null;
};

/**
 * `GET /api/v1/matchmaking/requests*` response.
 *
 * `active_introduction_id` is populated when `status = ON_HOLD` and a
 * matchmaker-created introduction is awaiting decisions (PROPOSED).
 */
export type MatchmakingRequestDto = {
  id: string;
  user_id: string;
  matchmaking_preferences_id: string;
  status: MatchmakingRequestStatus;
  request_charge_idempotency_key: string | null;
  contact_phone: string | null;
  created_at: string;
  expires_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
  active_introduction_id: string | null;
};

/** `POST /api/v1/matchmaking/requests` body. */
export type CreateMatchmakingRequestPayload = {
  /** Generate once per user intent; reuse on retries to avoid double-charge. */
  charge_idempotency_key: string;
};

/**
 * Partner profile embedded in `IntroductionView.partner` — the OTHER
 * participant. Same shape as the other-user-profile payload.
 * Photo URLs are signed (~1h TTL) — refetch the introduction if expired.
 */
export type IntroductionPartnerDto = {
  user_id: string;
  display_name: string;
  age: number | null;
  gender: string;
  bio: string | null;
  height_cm: number | null;
  residency_type: string | null;
  address: import('./profile').ProfileAddressDto | null;
  ethnicities: import('./catalog').EthnicityOption[];
  nationality: string | null;
  religion: string | null;
  education_level: string | null;
  occupation: string | null;
  relationship_intention: string | null;
  marital_status: string | null;
  has_children: boolean | null;
  wants_children: boolean | null;
  activity_level: string | null;
  interests: string[];
  languages: import('./catalog').LanguageOption[];
  is_verified: boolean;
  primary_photo_url: string | null;
  photos: import('./profile').ProfilePhotoDto[];
  activity_status?: import('./activity').ActivityStatus;
};

/**
 * Parsed match dimension from `match_details` JSON string.
 */
export type MatchDetail = {
  dimension: string;
  matched: boolean;
  label: string;
};

/**
 * Raw `Introduction` row — returned by `POST …/decision`.
 */
export type MatchmakingIntroductionDto = {
  id: string;
  requester_request_id: string;
  candidate_request_id: string;
  requester_decision: IntroductionDecisionPending;
  candidate_decision: IntroductionDecisionPending;
  status: IntroductionStatus;
  forward_percentage: number;
  reverse_percentage: number;
  overall_percentage: number;
  match_details: string | null;
  reason: string | null;
  requester_decided_at: string | null;
  candidate_decided_at: string | null;
  decision_expires_at: string | null;
  match_id: string | null;
  proposed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * `GET /api/v1/matchmaking/introductions/{introductionId}` → `IntroductionView`.
 * Caller-relative view: `your_*` = the caller's side, `partner_*` = other side.
 */
export type MatchmakingIntroductionViewDto = {
  id: string;
  requester_request_id: string;
  candidate_request_id: string;
  /** Which side the caller is on. */
  role: 'REQUESTER' | 'CANDIDATE';
  /** The caller's own request. */
  your_request_id: string;
  your_decision: IntroductionDecisionPending;
  partner_decision: IntroductionDecisionPending;
  status: IntroductionStatus;
  forward_percentage: number;
  reverse_percentage: number;
  overall_percentage: number;
  /** JSON string `[{dimension, matched, label}]` — parse before use. */
  match_details: string | null;
  /** Matchmaker's note on why the pair was chosen. */
  reason: string | null;
  decision_expires_at: string | null;
  requester_decided_at: string | null;
  candidate_decided_at: string | null;
  match_id: string | null;
  proposed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  /** The other participant's profile — always present on an introduction. */
  partner: IntroductionPartnerDto | null;
};

/** `POST /api/v1/matchmaking/introductions/{id}/decision` body. */
export type IntroductionDecisionPayload = {
  decision: IntroductionDecision;
};

/**
 * `GET /api/v1/matchmaking/introductions` row — lightweight summary of one
 * introduction where the caller is REQUESTER or CANDIDATE.
 *
 * `partner_decision` is masked to 'PENDING' while `your_decision === 'PENDING'`
 * — do not render it as "they haven't answered"; it is intentionally hidden.
 * Fetch GET /introductions/{id} for the full decision screen.
 */
export type IntroductionSummary = {
  id: string;
  your_request_id: string;
  role: 'REQUESTER' | 'CANDIDATE';
  your_decision: IntroductionDecisionPending;
  partner_decision: IntroductionDecisionPending;
  status: IntroductionStatus;
  overall_percentage: number;
  decision_expires_at: string | null;
  match_id: string | null;
  proposed_at: string | null;
  created_at: string;
  partner: {
    display_name: string;
    age: number | null;
    primary_photo_url: string | null;
  } | null;
};
