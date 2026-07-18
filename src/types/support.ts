// ---------------------------------------------------------------------------
// Support conversation types — user-facing mobile only
// DO NOT mix with chat.ts types (different contract, no realtime)
// ---------------------------------------------------------------------------

export type SupportAttachmentKind =
  | 'IMAGE'
  | 'DOCUMENT'
  | 'TEXT'
  | 'VOICE'
  | 'OTHER';

export type SupportConversationStatus =
  | 'IDLE'
  | 'WAITING_FOR_STAFF'
  | 'WAITING_STAFF'
  | 'ACTIVE'
  | 'WAITING_USER'
  | 'CLOSED';

// ── Wire-format DTOs (snake_case — as returned by backend) ────────────────

/**
 * Wire-format DTO returned by GET /api/v1/support/conversation.
 *
 * NOTE: `unread_count` is an expected API field that the backend must provide.
 * It must equal the number of public messages where sender_type='STAFF' AND
 * sequence_number > user_last_read_sequence.
 *
 * When present it is the authoritative unread count. The frontend MUST NOT
 * replace it with a purely client-side calculation in production.
 */
export interface SupportConversationDto {
  id: string;
  status: SupportConversationStatus;
  user_last_read_sequence: number;
  next_public_sequence: number;
  last_public_message_at: string | null;
  last_public_message_sender_type: 'USER' | 'STAFF' | null;
  closed_at: string | null;
  created_at: string;
  /**
   * Exact count of unread STAFF messages (sequence_number > user_last_read_sequence).
   * Added as an API integration requirement. See computeUnreadCount() for fallback.
   */
  unread_count?: number;
}

/** A single file attached to a support message. */
export interface SupportAttachment {
  id: string;
  message_id: string;
  file_name: string;
  content_type: string;
  file_size_bytes: number;
  attachment_kind?: SupportAttachmentKind | null;
  duration_ms?: number | null;
  /** Pre-signed URL for direct download/playback (expires in ~5 minutes). */
  signed_url?: string | null;
  /** Legacy field — kept for backward compat. */
  download_url?: string | null;
  download_url_expires_at?: string | null;
  created_at: string;
}

/** Wire-format message DTO. */
export interface SupportMessageDto {
  id: string;
  conversation_id: string;
  sequence_number: number;
  sender_type: 'USER' | 'STAFF';
  sender_display_name: string | null;
  body: string | null;
  created_at: string;
  attachments: SupportAttachment[];
}

/** Paginated message response from GET /api/v1/support/conversation/messages. */
export interface SupportMessagePageDto {
  messages: SupportMessageDto[];
  /** Cursor for the next (older) page. null = no more pages. */
  next_before_sequence: number | null;
}

/** Response from GET /api/v1/support/attachments/{id}/download-url. */
export interface SupportAttachmentDownloadUrlDto {
  download_url: string;
}

// ── Attachment constraints (must match backend) ───────────────────────────

export const SUPPORT_MAX_ATTACHMENTS = 3;
export const SUPPORT_MAX_FILE_SIZE = 26_214_400; // 25 MiB
export const SUPPORT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
] as const;

export const SUPPORT_VOICE_MIME_TYPES = [
  'audio/m4a',
  'audio/mp4',
  'audio/aac',
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
  'audio/x-m4a',
] as const;

/** Max voice recording duration in seconds (5 minutes). */
export const SUPPORT_VOICE_MAX_DURATION_SECONDS =
  Number(process.env.EXPO_PUBLIC_SUPPORT_VOICE_MAX_DURATION_SECONDS) || 300;

/** Max voice file size in bytes (25 MiB). */
export const SUPPORT_VOICE_MAX_FILE_SIZE_BYTES =
  Number(process.env.EXPO_PUBLIC_SUPPORT_VOICE_MAX_FILE_SIZE_BYTES) || 26_214_400;

// ── Staff types (ADMIN/MODERATOR only) ────────────────────────────────────

/** Summary item returned in the staff conversation list. */
export interface StaffConversationSummaryDto {
  id: string;
  user_id: string;
  user_display_name: string | null;
  status: SupportConversationStatus;
  priority: number;
  assigned_staff_user_id: string | null;
  next_public_sequence: number;
  staff_last_read_sequence: number;
  waiting_since: string | null;
  last_public_message_at: string | null;
  last_public_message_sender_type: 'USER' | 'STAFF' | null;
  created_at: string;
}

/** Detailed conversation returned when staff open a single conversation. */
export interface StaffConversationDetailDto {
  id: string;
  user_id: string;
  user_display_name: string | null;
  status: SupportConversationStatus;
  priority: number;
  assigned_staff_user_id: string | null;
  next_public_sequence: number;
  user_last_read_sequence: number;
  staff_last_read_sequence: number;
  my_last_read_sequence: number;
  waiting_since: string | null;
  first_staff_response_at: string | null;
  last_activity_at: string | null;
  last_public_message_at: string | null;
  last_public_message_sender_type: 'USER' | 'STAFF' | null;
  closed_at: string | null;
  closed_by_type: 'USER' | 'STAFF' | null;
  created_at: string;
  updated_at: string;
}

/** Query params for the staff conversation list endpoint. */
export interface StaffConversationListParams {
  status?: SupportConversationStatus;
  assignedToStaffId?: string;
  unassignedOnly?: boolean;
  priority?: number;
  limit?: number;
  offset?: number;
}

/** Internal staff note (not visible to users). */
export interface StaffNoteDto {
  id: string;
  conversation_id: string;
  staff_user_id: string;
  staff_display_name?: string | null;
  body: string;
  created_at: string;
}

// ── Local (UI-only) types ─────────────────────────────────────────────────

/** A file the user has selected to attach before sending. */
export interface SupportFileAttachment {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

/** Send lifecycle for an optimistic (pending) message. */
export type SupportLocalSendStatus = 'SENDING' | 'FAILED';

/**
 * Optimistic message held in local state while the send request is in flight
 * or after a failure. Never stored in React Query server cache.
 */
export interface SupportPendingMessage {
  /** Stable UUID for idempotency — MUST be reused on retry, not regenerated. */
  clientMessageId: string;
  body: string | null;
  files: SupportFileAttachment[];
  /** Duration of each voice attachment in milliseconds, parallel to files[]. null for non-audio files. */
  voiceDurationsMs?: (number | null)[];
  localSendStatus: SupportLocalSendStatus;
  /** User-facing error message when localSendStatus is FAILED. */
  errorMessage?: string;
  createdAt: string;
}
