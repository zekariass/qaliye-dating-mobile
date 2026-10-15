import type {
    ModerationDecision,
    ModerationQueueResponse
} from '@/types/admin';

import { apiClient } from '../apiClient';

// ─── Moderation Queue ──────────────────────────────────────────────────────────

export async function fetchModerationPhotos(
  status: string = 'MANUAL_REVIEW',
): Promise<ModerationQueueResponse> {
  const res = await apiClient.get<ModerationQueueResponse>(
    '/api/v1/admin/moderation/photos',
    { params: { status } },
  );
  return res.data;
}

export async function moderatePhoto(
  photoId: string,
  decision: ModerationDecision,
): Promise<void> {
  await apiClient.patch<void>(
    `/api/v1/admin/moderation/photos/${photoId}`,
    { status: decision },
  );
}
