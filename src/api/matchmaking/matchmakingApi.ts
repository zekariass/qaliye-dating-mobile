import { apiClient } from '@/api/apiClient';
import type {
    CreateMatchmakingRequestPayload,
    IntroductionDecisionPayload,
    IntroductionSummary,
    MatchmakingIntroductionDto,
    MatchmakingIntroductionViewDto,
    MatchmakingPreferencesDto,
    MatchmakingPreferencesPayload,
    MatchmakingRequestDto,
} from '@/types/matchmaking';
import { extractApiError } from '@/utils/apiError';

const BASE = '/api/v1/matchmaking';

function is404(err: unknown): boolean {
  return extractApiError(err).status === 404;
}

// ─── Preferences ─────────────────────────────────────────────────────────────

/** Returns `null` when the user has never set preferences (404). */
export async function fetchMatchmakingPreferences(): Promise<MatchmakingPreferencesDto | null> {
  try {
    const res = await apiClient.get<MatchmakingPreferencesDto>(`${BASE}/preferences`);
    return res.data;
  } catch (err) {
    if (is404(err)) return null;
    throw err;
  }
}

export async function updateMatchmakingPreferences(
  payload: MatchmakingPreferencesPayload,
): Promise<MatchmakingPreferencesDto> {
  const res = await apiClient.put<MatchmakingPreferencesDto>(`${BASE}/preferences`, payload);
  return res.data;
}

// ─── Requests ─────────────────────────────────────────────────────────────────

/** Returns `null` when there is no OPEN/ON_HOLD request (404 = normal empty state). */
export async function fetchActiveMatchmakingRequest(): Promise<MatchmakingRequestDto | null> {
  try {
    const res = await apiClient.get<MatchmakingRequestDto>(`${BASE}/requests/active`);
    return res.data;
  } catch (err) {
    if (is404(err)) return null;
    throw err;
  }
}

export async function fetchMatchmakingRequests(page = 0, size = 20): Promise<MatchmakingRequestDto[]> {
  const res = await apiClient.get<MatchmakingRequestDto[]>(`${BASE}/requests`, {
    params: { page, size },
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function fetchMatchmakingRequest(requestId: string): Promise<MatchmakingRequestDto> {
  const res = await apiClient.get<MatchmakingRequestDto>(`${BASE}/requests/${requestId}`);
  return res.data;
}

/**
 * Creates a matchmaking request.
 * Idempotent on `charge_idempotency_key` — pass the same key on retries.
 * Throws 402 `insufficient_credits` if not enough credits.
 * Throws 422 if preferences not saved.
 * Throws 409 if an active request already exists.
 */
export async function createMatchmakingRequest(
  payload: CreateMatchmakingRequestPayload,
): Promise<MatchmakingRequestDto> {
  const res = await apiClient.post<MatchmakingRequestDto>(`${BASE}/requests`, payload);
  return res.data;
}

/**
 * Cancels an OPEN/ON_HOLD request.
 * Cascades: active introduction cancelled, other party's request returns to OPEN.
 */
export async function cancelMatchmakingRequest(requestId: string): Promise<void> {
  await apiClient.delete(`${BASE}/requests/${requestId}`);
}

// ─── Introductions ────────────────────────────────────────────────────────────

/**
 * Caller's introduction history — REQUESTER or CANDIDATE side, newest first
 * (`proposed_at DESC`). Bare array, `[]` when empty.
 * `partner_decision` is masked to PENDING while `your_decision === 'PENDING'`.
 */
export async function fetchIntroductions(
  page = 0,
  size = 20,
): Promise<IntroductionSummary[]> {
  const res = await apiClient.get<IntroductionSummary[]>(`${BASE}/introductions`, {
    params: { page, size },
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function fetchIntroduction(
  introductionId: string,
): Promise<MatchmakingIntroductionViewDto> {
  const res = await apiClient.get<MatchmakingIntroductionViewDto>(
    `${BASE}/introductions/${introductionId}`,
  );
  return res.data;
}

/** Decision is final — cannot be changed. Throws 409 if already submitted. */
export async function submitIntroductionDecision(
  introductionId: string,
  payload: IntroductionDecisionPayload,
): Promise<MatchmakingIntroductionDto> {
  const res = await apiClient.post<MatchmakingIntroductionDto>(
    `${BASE}/introductions/${introductionId}/decision`,
    payload,
  );
  return res.data;
}
