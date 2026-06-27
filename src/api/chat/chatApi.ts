import { apiClient } from '@/api/apiClient';
import type {
  ChatThreadDto,
  InboxResponse,
  MessageDto,
  MessagesResponse,
  MuteSettingsRequest,
  ReceiptRequest,
  SendMessageRequest,
} from '@/types/chat';

const BASE = '/api/v1/chat';

// ── Inbox ─────────────────────────────────────────────────────────────────

export type InboxFilter = 'ALL' | 'UNREAD';

export async function fetchInbox(
  filter: InboxFilter = 'ALL',
  limit: number = 25,
  cursor?: string,
): Promise<InboxResponse> {
  const params: Record<string, string> = { filter, limit: String(limit) };
  if (cursor) params.cursor = cursor;
  const res = await apiClient.get<InboxResponse>(`${BASE}/matches`, { params });
  return res.data;
}

// ── Chat thread metadata ──────────────────────────────────────────────────

export async function fetchChatThread(matchId: string): Promise<ChatThreadDto> {
  const res = await apiClient.get<ChatThreadDto>(`${BASE}/matches/${matchId}`);
  return res.data;
}

// ── Messages ──────────────────────────────────────────────────────────────

export async function fetchMessages(
  matchId: string,
  opts?: {
    beforeSequence?: number;
    afterSequence?: number;
    limit?: number;
  },
): Promise<MessagesResponse> {
  const params: Record<string, string> = {};
  if (opts?.beforeSequence != null) params.beforeSequence = String(opts.beforeSequence);
  if (opts?.afterSequence != null) params.afterSequence = String(opts.afterSequence);
  if (opts?.limit != null) params.limit = String(opts.limit);
  const res = await apiClient.get<MessagesResponse>(
    `${BASE}/matches/${matchId}/messages`,
    { params },
  );
  return res.data;
}

// ── Send message ──────────────────────────────────────────────────────────

export async function sendMessage(
  matchId: string,
  payload: SendMessageRequest,
): Promise<{ data: MessageDto; status: number }> {
  const res = await apiClient.post<MessageDto>(
    `${BASE}/matches/${matchId}/messages`,
    payload,
  );
  return { data: res.data, status: res.status };
}

// ── Receipts ──────────────────────────────────────────────────────────────

export async function markDelivered(
  matchId: string,
  payload: ReceiptRequest,
): Promise<void> {
  await apiClient.post(`${BASE}/matches/${matchId}/receipts/delivered`, payload);
}

export async function markRead(
  matchId: string,
  payload: ReceiptRequest,
): Promise<void> {
  await apiClient.post(`${BASE}/matches/${matchId}/receipts/read`, payload);
}

// ── Mute settings ─────────────────────────────────────────────────────────

export async function updateMuteSettings(
  matchId: string,
  payload: MuteSettingsRequest,
): Promise<void> {
  await apiClient.patch(`${BASE}/matches/${matchId}/notification-settings`, payload);
}
