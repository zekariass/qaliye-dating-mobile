import { apiClient } from '@/api/apiClient';
import type {
    DiscoveryFeedResponse,
    DiscoveryPreferencesDto,
    LikeDirection,
    LikesPageResponse,
    LocationFilter,
    MatchesPageResponse,
    RevisitCount,
    RevisitPassedProfilesResponse,
    RewindResponse,
    SwipeActionResponse,
    UpdateDiscoveryPreferencesPayload,
    UpdateDiscoveryPreferencesResponse,
} from '@/types/discovery';

const BASE = '/api/v1/discovery';

export async function fetchDiscoveryProfiles(
  locationFilter: LocationFilter = 'ANYWHERE',
  cursor?: string,
): Promise<DiscoveryFeedResponse> {
  const params: Record<string, string> = { locationFilter };
  if (cursor) params.cursor = cursor;
  const res = await apiClient.get<DiscoveryFeedResponse>(`${BASE}/profiles`, { params });
  return res.data;
}

export async function likeProfile(
  targetUserId: string,
  clientActionId: string,
): Promise<SwipeActionResponse> {
  const res = await apiClient.post<SwipeActionResponse>(`${BASE}/actions/like`, {
    target_user_id: targetUserId,
    client_action_id: clientActionId,
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
