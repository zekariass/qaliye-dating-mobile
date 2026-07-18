import { apiClient } from '@/api/apiClient';
import type {
  SupportAttachmentDownloadUrlDto,
  SupportConversationDto,
  SupportMessageDto,
  SupportMessagePageDto,
} from '@/types/support';

const BASE = '/api/v1/support';

// ── Conversation ───────────────────────────────────────────────────────────

export async function getSupportConversation(): Promise<SupportConversationDto> {
  const res = await apiClient.get<SupportConversationDto>(`${BASE}/conversation`);
  return res.data;
}

// ── Messages ───────────────────────────────────────────────────────────────

export async function getSupportMessages(params?: {
  before_sequence?: number;
  limit?: number;
}): Promise<SupportMessagePageDto> {
  const queryParams: Record<string, string> = {};
  if (params?.before_sequence != null) {
    queryParams.before_sequence = String(params.before_sequence);
  }
  if (params?.limit != null) {
    queryParams.limit = String(params.limit);
  }
  const res = await apiClient.get<SupportMessagePageDto>(
    `${BASE}/conversation/messages`,
    { params: queryParams },
  );
  return res.data;
}

/**
 * Send a support message with optional file attachments.
 * The caller must build the FormData with the following fields:
 *   - clientMessageId (string, UUID — for idempotency)
 *   - body (string, optional if files present)
 *   - files (repeated file entries, optional if body present)
 */
export async function sendSupportMessage(formData: FormData): Promise<SupportMessageDto> {
  const res = await apiClient.post<SupportMessageDto>(
    `${BASE}/conversation/messages`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data;
}

// ── Read cursor ────────────────────────────────────────────────────────────

export async function markSupportConversationRead(
  lastReadSequence: number,
): Promise<void> {
  await apiClient.post(`${BASE}/conversation/read`, {
    last_read_sequence: lastReadSequence,
  });
}

// ── Close ──────────────────────────────────────────────────────────────────

export async function closeSupportConversation(): Promise<void> {
  await apiClient.post(`${BASE}/conversation/close`);
}

// ── Attachment signed URL ──────────────────────────────────────────────────

/**
 * Fetch a short-lived signed download URL for an attachment.
 * TTL is ~300s (5 minutes). Do NOT cache or log this URL.
 */
export async function getSupportAttachmentDownloadUrl(
  attachmentId: string,
): Promise<SupportAttachmentDownloadUrlDto> {
  const res = await apiClient.get<SupportAttachmentDownloadUrlDto>(
    `${BASE}/attachments/${attachmentId}/download-url`,
  );
  return res.data;
}
