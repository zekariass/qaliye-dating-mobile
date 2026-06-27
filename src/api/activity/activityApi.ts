import { apiClient } from '@/api/apiClient';
import type {
  ActivityVisibilityResponse,
  BatchStatusRequest,
  BatchStatusResponse,
  HeartbeatResponse,
} from '@/types/activity';

export async function postHeartbeat(): Promise<HeartbeatResponse> {
  const res = await apiClient.post<HeartbeatResponse>('/api/v1/activity/heartbeat');
  return res.data;
}

export async function batchFetchStatuses(userIds: string[]): Promise<BatchStatusResponse> {
  const payload: BatchStatusRequest = { user_ids: userIds.slice(0, 50) };
  const res = await apiClient.post<BatchStatusResponse>('/api/v1/activity/statuses', payload);
  return res.data;
}

export async function updateActivityVisibility(
  showActivityStatus: boolean,
): Promise<ActivityVisibilityResponse> {
  const res = await apiClient.patch<ActivityVisibilityResponse>(
    '/api/v1/users/me/activity-visibility',
    { show_activity_status: showActivityStatus },
  );
  return res.data;
}
