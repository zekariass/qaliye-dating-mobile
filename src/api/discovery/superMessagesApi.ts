import { apiClient } from '@/api/apiClient';
import type {
    SuperMessageActionResponse,
    SuperMessageDirection,
    SuperMessageDto,
} from '@/types/superMessage';

const BASE = '/api/v1/discovery/super-messages';

export async function sendSuperMessage(payload: {
  targetUserId: string;
  message: string;
  idempotencyKey: string;
}): Promise<SuperMessageDto> {
  const res = await apiClient.post<SuperMessageDto>(BASE, {
    target_user_id: payload.targetUserId,
    message: payload.message,
    idempotency_key: payload.idempotencyKey,
  });
  return res.data;
}

export async function getSuperMessage(messageId: string): Promise<SuperMessageDto> {
  const res = await apiClient.get<SuperMessageDto>(`${BASE}/${messageId}`);
  return res.data;
}

export async function listSuperMessages(
  direction: SuperMessageDirection = 'sent',
  limit: number = 20,
  offset: number = 0,
): Promise<SuperMessageDto[]> {
  const res = await apiClient.get<SuperMessageDto[]>(BASE, {
    params: { direction, limit: String(limit), offset: String(offset) },
  });
  return res.data;
}

export async function acceptSuperMessage(messageId: string): Promise<SuperMessageActionResponse> {
  const res = await apiClient.post<SuperMessageActionResponse>(`${BASE}/${messageId}/accept`);
  return res.data;
}

export async function passSuperMessage(messageId: string): Promise<SuperMessageActionResponse> {
  const res = await apiClient.post<SuperMessageActionResponse>(`${BASE}/${messageId}/pass`);
  return res.data;
}
