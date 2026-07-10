import { apiClient } from '@/api/apiClient';

export type ReportType =
  | 'FAKE_PROFILE'
  | 'HARASSMENT'
  | 'HATE_SPEECH'
  | 'INAPPROPRIATE_CONTENT'
  | 'SCAM'
  | 'UNDERAGE'
  | 'VIOLENCE_OR_THREATS'
  | 'PRIVACY_VIOLATION'
  | 'OFF_PLATFORM_SOLICITATION'
  | 'SPAM'
  | 'OTHER';

export interface ReportUserRequest {
  report_type: ReportType;
  description?: string;
}

export interface ReportUserResponse {
  id: string;
  reported_user_id: string;
  report_type: ReportType;
  description?: string;
  status: string;
  created_at: string;
}

export interface BlockUserResponse {
  id: string;
  blocked_user_id: string;
  status: string;
  reason?: string;
  blocked_at: string;
}

export async function reportUser(
  userId: string,
  body: ReportUserRequest,
): Promise<ReportUserResponse> {
  const { data } = await apiClient.post<ReportUserResponse>(
    `/api/v1/users/${userId}/report`,
    body,
  );
  return data;
}

export async function blockUser(
  userId: string,
  reason?: string,
): Promise<BlockUserResponse> {
  const { data } = await apiClient.post<BlockUserResponse>(
    `/api/v1/users/${userId}/block`,
    reason ? { reason } : undefined,
  );
  return data;
}

export async function unblockUser(userId: string): Promise<void> {
  await apiClient.delete(`/api/v1/users/${userId}/block`);
}

export interface BlockedUserAddress {
  id: string;
  country_code: string;
  country_name: string;
  city_name: string;
}

export interface BlockedUserSummary {
  id: string;
  display_name: string;
  address: BlockedUserAddress | null;
  primary_photo_url: string | null;
  primary_photo_id: string | null;
}

export interface BlockedUserItem {
  id: string;
  blocked_at: string;
  reason: string | null;
  blocked_user: BlockedUserSummary;
}

export interface BlockedUsersResponse {
  items: BlockedUserItem[];
  next_cursor: string | null;
  has_more: boolean;
}

export async function fetchBlockedUsers(
  cursor?: string,
  limit = 20,
): Promise<BlockedUsersResponse> {
  const params: Record<string, string | number> = { limit };
  if (cursor) params.cursor = cursor;
  const { data } = await apiClient.get<BlockedUsersResponse>('/api/v1/me/blocks', { params });
  return data;
}
