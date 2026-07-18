import { apiClient } from '@/api/apiClient';
import type {
    StaffConversationDetailDto,
    StaffConversationListParams,
    StaffConversationSummaryDto,
    StaffNoteDto,
    SupportAttachmentDownloadUrlDto,
    SupportMessageDto,
    SupportMessagePageDto,
} from '@/types/support';

const BASE = '/api/v1/staff/support';

// ── Conversation list ──────────────────────────────────────────────────────

export async function getStaffConversations(
  params?: StaffConversationListParams,
): Promise<StaffConversationSummaryDto[]> {
  const queryParams: Record<string, string> = {};
  if (params?.status) queryParams.status = params.status;
  if (params?.assignedToStaffId) queryParams.assignedToStaffId = params.assignedToStaffId;
  if (params?.unassignedOnly != null) queryParams.unassignedOnly = String(params.unassignedOnly);
  if (params?.priority != null) queryParams.priority = String(params.priority);
  if (params?.limit != null) queryParams.limit = String(params.limit);
  if (params?.offset != null) queryParams.offset = String(params.offset);

  const res = await apiClient.get<StaffConversationSummaryDto[]>(
    `${BASE}/conversations`,
    { params: queryParams },
  );
  return res.data;
}

// ── Conversation detail ────────────────────────────────────────────────────

export async function getStaffConversationDetail(
  conversationId: string,
): Promise<StaffConversationDetailDto> {
  const res = await apiClient.get<StaffConversationDetailDto>(
    `${BASE}/conversations/${conversationId}`,
  );
  return res.data;
}

// ── Messages ───────────────────────────────────────────────────────────────

export async function getStaffMessages(
  conversationId: string,
  params?: { before_sequence?: number; limit?: number },
): Promise<SupportMessagePageDto> {
  const queryParams: Record<string, string> = {};
  if (params?.before_sequence != null) queryParams.before_sequence = String(params.before_sequence);
  if (params?.limit != null) queryParams.limit = String(params.limit);

  const res = await apiClient.get<SupportMessagePageDto>(
    `${BASE}/conversations/${conversationId}/messages`,
    { params: queryParams },
  );
  return res.data;
}

// ── Send message ───────────────────────────────────────────────────────────

export async function sendStaffMessage(
  conversationId: string,
  formData: FormData,
): Promise<SupportMessageDto> {
  const res = await apiClient.post<SupportMessageDto>(
    `${BASE}/conversations/${conversationId}/messages`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data;
}

// ── Read cursor ────────────────────────────────────────────────────────────

export async function markStaffConversationRead(
  conversationId: string,
  lastReadSequence: number,
): Promise<void> {
  await apiClient.post(`${BASE}/conversations/${conversationId}/read`, {
    last_read_sequence: lastReadSequence,
  });
}

// ── Close ──────────────────────────────────────────────────────────────────

export async function closeStaffConversation(conversationId: string): Promise<void> {
  await apiClient.post(`${BASE}/conversations/${conversationId}/close`);
}

// ── Reopen ─────────────────────────────────────────────────────────────────

export async function reopenStaffConversation(conversationId: string): Promise<void> {
  await apiClient.post(`${BASE}/conversations/${conversationId}/reopen`);
}

// ── Assignment ─────────────────────────────────────────────────────────────

export async function setStaffAssignment(
  conversationId: string,
  assignedStaffUserId: string | null,
): Promise<void> {
  await apiClient.patch(`${BASE}/conversations/${conversationId}/assignment`, {
    assigned_staff_user_id: assignedStaffUserId,
  });
}

// ── Priority ───────────────────────────────────────────────────────────────

export async function setStaffPriority(
  conversationId: string,
  priority: number,
): Promise<void> {
  await apiClient.patch(`${BASE}/conversations/${conversationId}/priority`, {
    priority,
  });
}

// ── Notes ──────────────────────────────────────────────────────────────────

export async function getStaffNotes(
  conversationId: string,
  params?: { limit?: number; offset?: number },
): Promise<StaffNoteDto[]> {
  const queryParams: Record<string, string> = {};
  if (params?.limit != null) queryParams.limit = String(params.limit);
  if (params?.offset != null) queryParams.offset = String(params.offset);

  const res = await apiClient.get<StaffNoteDto[]>(
    `${BASE}/conversations/${conversationId}/notes`,
    { params: queryParams },
  );
  return res.data;
}

export async function createStaffNote(
  conversationId: string,
  body: { client_note_id: string; body: string },
): Promise<StaffNoteDto> {
  const res = await apiClient.post<StaffNoteDto>(
    `${BASE}/conversations/${conversationId}/notes`,
    body,
  );
  return res.data;
}

// ── Attachment signed URL ──────────────────────────────────────────────────

export async function getStaffAttachmentDownloadUrl(
  conversationId: string,
  attachmentId: string,
): Promise<SupportAttachmentDownloadUrlDto> {
  const res = await apiClient.get<SupportAttachmentDownloadUrlDto>(
    `${BASE}/conversations/${conversationId}/attachments/${attachmentId}/download-url`,
  );
  return res.data;
}
