import { apiClient } from '@/api/apiClient';
import type {
    DiscoveryCountsDto,
    DiscoveryFeedResponse,
    DiscoveryPreferencesDto,
    LikeActionVariantDto,
    LikeActionsResponse,
    LikeDirection,
    LikesPageResponse,
    MatchesPageResponse,
    RevealResponse,
    RevisitCount,
    RevisitPassedProfilesResponse,
    RewindResponse,
    SwipeActionResponse,
    UpdateDiscoveryPreferencesPayload,
    UpdateDiscoveryPreferencesResponse
} from '@/types/discovery';

const BASE = '/api/v1/discovery';

// Default LIKE variant used when a call site doesn't (yet) let the user pick
// a specific variant — keeps older call sites (browse mode, like-back, etc.)
// working now that `action_variant_code` is required server-side.
export const DEFAULT_LIKE_VARIANT_CODE = 'HEART';

export async function fetchDiscoveryProfiles(
  cursor?: string,
): Promise<DiscoveryFeedResponse> {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;
  const res = await apiClient.get<DiscoveryFeedResponse>(`${BASE}/profiles`, { params });
  return res.data;
}

// Tolerates both snake_case and camelCase payloads — the backend has shipped
// like-action fields as sortOrder/resetsAt/periodType in some builds.
// Quota fields stay `undefined` when absent so callers can distinguish
// "backend didn't send limits" from an explicit `limit: null` (unlimited)
// and fall back to the entitlements limits_and_costs map.
function normalizeLikeAction(raw: Record<string, unknown>): LikeActionVariantDto {
  const resetsAt = raw.resets_at ?? raw.resetsAt;
  const periodType = raw.period_type ?? raw.periodType;
  return {
    code: (raw.code ?? '') as string,
    name: (raw.name ?? '') as string,
    description: (raw.description ?? null) as string | null,
    icon: (raw.icon ?? null) as string | null,
    credits: (raw.credits ?? 0) as number,
    sort_order: (raw.sort_order ?? raw.sortOrder ?? 0) as number,
    limit: raw.limit === undefined ? undefined : (raw.limit as number | null),
    used: raw.used === undefined ? undefined : (raw.used as number),
    remaining: raw.remaining === undefined ? undefined : (raw.remaining as number | null),
    resets_at: resetsAt === undefined ? undefined : (resetsAt as string | null),
    period_type: periodType === undefined ? undefined : (periodType as LikeActionVariantDto['period_type']),
    blocked: raw.blocked === undefined ? undefined : (raw.blocked as boolean),
  };
}

export async function fetchLikeActions(): Promise<LikeActionsResponse> {
  const res = await apiClient.get<{ actions?: Record<string, unknown>[] }>(`${BASE}/like-actions`);
  return { actions: (res.data?.actions ?? []).map(normalizeLikeAction) };
}

export async function likeProfile(
  targetUserId: string,
  clientActionId: string,
  actionVariantCode: string = DEFAULT_LIKE_VARIANT_CODE,
): Promise<SwipeActionResponse> {
  const res = await apiClient.post<SwipeActionResponse>(`${BASE}/actions/like`, {
    target_user_id: targetUserId,
    client_action_id: clientActionId,
    action_variant_code: actionVariantCode,
  });
  return res.data;
}

export async function passProfile(
  targetUserId: string,
  clientActionId: string,
): Promise<SwipeActionResponse> {
  const res = await apiClient.post<SwipeActionResponse>(`${BASE}/actions/pass`, {
    target_user_id: targetUserId,
    client_action_id: clientActionId,
  });
  return res.data;
}

export async function superLikeProfile(
  targetUserId: string,
  clientActionId: string,
): Promise<SwipeActionResponse> {
  const res = await apiClient.post<SwipeActionResponse>(`${BASE}/actions/superlike`, {
    target_user_id: targetUserId,
    client_action_id: clientActionId,
  });
  return res.data;
}

export async function rewindLastAction(): Promise<RewindResponse> {
  const res = await apiClient.post<RewindResponse>(`${BASE}/actions/rewind`);
  return res.data;
}

export async function revisitPassedProfiles(
  count: RevisitCount = 10,
): Promise<RevisitPassedProfilesResponse> {
  const res = await apiClient.post<RevisitPassedProfilesResponse>(
    `${BASE}/passes/revisit`,
    undefined,
    { params: { count } },
  );
  return res.data;
}

export async function getDiscoveryPreferences(): Promise<DiscoveryPreferencesDto> {
  const res = await apiClient.get<DiscoveryPreferencesDto>(`${BASE}/preferences`);
  return res.data;
}

export async function putDiscoveryPreferences(
  payload: UpdateDiscoveryPreferencesPayload,
): Promise<UpdateDiscoveryPreferencesResponse> {
  const res = await apiClient.put<UpdateDiscoveryPreferencesResponse>(
    `${BASE}/preferences`,
    payload,
  );
  return res.data;
}

export async function deleteDiscoveryPreferences(): Promise<void> {
  await apiClient.delete(`${BASE}/preferences`);
}

export async function fetchMatches(
  page: number = 0,
  size: number = 20,
): Promise<MatchesPageResponse> {
  const res = await apiClient.get<MatchesPageResponse>(`${BASE}/matches`, {
    params: { page: String(page), size: String(size) },
  });
  return res.data;
}

export async function fetchLikes(
  direction: LikeDirection = 'RECEIVED',
  page: number = 0,
  size: number = 20,
): Promise<LikesPageResponse> {
  const res = await apiClient.get<LikesPageResponse>(`${BASE}/likes`, {
    params: { direction, page: String(page), size: String(size) },
  });
  return res.data;
}

export async function fetchDiscoveryCounts(): Promise<DiscoveryCountsDto> {
  const res = await apiClient.get<DiscoveryCountsDto>(`${BASE}/counts`);
  return res.data;
}

function normalizeRevealResponse(raw: Record<string, unknown>): RevealResponse {
  return {
    action_id: (raw.action_id ?? raw.actionId ?? '') as string,
    action_type: (raw.action_type ?? raw.actionType ?? 'LIKE') as RevealResponse['action_type'],
    actor_user_id: (raw.actor_user_id ?? raw.actorUserId ?? '') as string,
    actor_display_name: (raw.actor_display_name ?? raw.actorDisplayName ?? '') as string,
    actor_age: (raw.actor_age ?? raw.actorAge ?? 0) as number,
    actor_primary_photo_url: (raw.actor_primary_photo_url ?? raw.actorPrimaryPhotoUrl ?? null) as string | null,
    idempotent: (raw.idempotent ?? false) as boolean,
    credit_balance: (raw.credit_balance ?? raw.creditBalance ?? 0) as number,
  };
}

export async function revealLike(actionId: string): Promise<RevealResponse> {
  const res = await apiClient.post<unknown>(`${BASE}/actions/${actionId}/reveal`);
  return normalizeRevealResponse(res.data as Record<string, unknown>);
}
