// ---------------------------------------------------------------------------
// Chat / Messaging types — spec-compliant models
// ---------------------------------------------------------------------------

import type { ActivityStatus } from './activity';

// ── Message types ─────────────────────────────────────────────────────────

export type MessageType = 'TEXT' | 'ICEBREAKER' | 'PROMPT_REPLY';

// ── Attachment types ───────────────────────────────────────────────────────

export type ChatAttachmentType = 'IMAGE' | 'VOICE';

/** Wire-format attachment DTO (snake_case — as returned by backend) */
export interface ChatAttachmentDto {
  id: string;
  message_id: string;
  attachment_type: ChatAttachmentType;
  file_name: string;
  content_type: string;
  file_size_bytes: number;
  duration_ms: number | null;
  download_url: string | null;
  created_at: string;
}

/** Domain model for a chat attachment (camelCase, used in UI) */
export interface ChatAttachment {
  id: string;
  messageId: string;
  attachmentType: ChatAttachmentType;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  durationMs: number | null;
  downloadUrl: string | null;
  createdAt: string;
}

/** Response from POST /api/v1/chat/attachments/{attachmentId}/signed-url */
export interface ChatAttachmentSignedUrlDto extends ChatAttachmentDto {}

/** A file the user has selected to attach before sending (local, pre-upload) */
export interface ChatFileAttachment {
  uri: string;
  name: string;
  type: string;
  size?: number;
  /** Duration in ms for voice files, null for images */
  durationMs?: number | null;
}

/** Server-authoritative delivery status (derived from receipt state) */
export type ServerDeliveryStatus = 'SENT' | 'DELIVERED' | 'READ';

/** Frontend-only send lifecycle (never sent to backend) */
export type LocalSendStatus = 'PENDING' | 'SENDING' | 'FAILED' | 'SENT';

export interface ChatMessage {
  id?: string;
  clientMessageId: string;
  matchId: string;
  sequenceNumber?: number;
  senderUserId: string;
  isMine: boolean;
  messageType: MessageType;
  body: string;
  createdAt: string;
  editedAt: string | null;
  deliveryStatus?: ServerDeliveryStatus;
  localSendStatus?: LocalSendStatus;
  errorCode?: string;
  attachments?: ChatAttachment[];
  /** Local file references for optimistic pending messages with attachments */
  pendingFiles?: ChatFileAttachment[];
  /** Duration of each voice file in the pending message, parallel to pendingFiles */
  pendingVoiceDurations?: (number | null)[];
}

// ── Receipt state ─────────────────────────────────────────────────────────

export interface ReceiptState {
  myLastDeliveredSequence: number;
  myLastReadSequence: number;
  participantLastDeliveredSequence: number;
  participantLastReadSequence: number;
}

// ── Chat thread ───────────────────────────────────────────────────────────

export type ThreadStatus = 'ACTIVE' | 'ENDED';

export interface ChatParticipant {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  activityStatus?: ActivityStatus;
}

export interface ChatThread {
  matchId: string;
  status: ThreadStatus;
  participant: ChatParticipant;
  receiptState: ReceiptState;
}

// ── Inbox item ────────────────────────────────────────────────────────────

export interface InboxLastMessage {
  id: string;
  sequenceNumber: number;
  senderUserId: string;
  messageType: MessageType;
  preview: string;
  createdAt: string;
}

export interface InboxItem {
  matchId: string;
  status: 'ACTIVE';
  participant: ChatParticipant;
  lastMessage: InboxLastMessage | null;
  unreadCount: number;
  mutedUntil: string | null;
  matchedAt: string;
  lastMessageAt: string | null;
}

// ── API DTOs (wire format — snake_case) ───────────────────────────────────

export interface InboxItemDto {
  match_id: string;
  status: 'ACTIVE';
  participant: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
    activity_status?: ActivityStatus;
  };
  last_message: {
    id: string;
    sequence_number: number;
    sender_user_id: string;
    message_type: MessageType;
    preview: string;
    created_at: string;
  } | null;
  unread_count: number;
  muted_until: string | null;
  matched_at: string;
  last_message_at: string | null;
}

export interface InboxResponse {
  items: InboxItemDto[];
  next_cursor: string | null;
}

export interface ChatThreadDto {
  match_id: string;
  status: 'ACTIVE' | 'ENDED';
  participant: {
    user_id: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
    activity_status?: ActivityStatus;
  };
  receipt_state: {
    my_last_delivered_sequence: number;
    my_last_read_sequence: number;
    participant_last_delivered_sequence: number;
    participant_last_read_sequence: number;
  };
}

export interface MessageDto {
  id: string;
  client_message_id: string;
  match_id: string;
  sequence_number: number;
  sender_user_id: string;
  message_type: MessageType;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  delivery_status?: ServerDeliveryStatus;
  attachments?: ChatAttachmentDto[];
}

export interface MessagesResponse {
  items: MessageDto[];
  has_more_before: boolean;
  has_more_after: boolean;
  participant_activity_status?: ActivityStatus;
}

export interface SendMessageRequest {
  client_message_id: string;
  message_type: MessageType;
  body: string;
}

/** Request JSON part for multipart attachment send */
export interface SendMessageWithAttachmentsRequest {
  clientMessageId: string;
  messageType: MessageType;
  body: string | null;
}

export interface ReceiptRequest {
  up_to_sequence: number;
}

export interface MuteSettingsRequest {
  muted_until: string | null;
}

// ── Realtime event payloads ───────────────────────────────────────────────

export interface RealtimeEvent<T = unknown> {
  eventId: string;
  eventType: string;
  version: number;
  occurredAt: string;
  matchId: string;
  data: T;
}

export interface MessageCreatedData {
  id: string;
  client_message_id: string;
  match_id: string;
  sequence_number: number;
  sender_user_id: string;
  message_type: MessageType;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  attachments?: {
    id: string;
    attachment_type: ChatAttachmentType;
    file_name: string;
    content_type: string;
    file_size_bytes: number;
    duration_ms: number | null;
    created_at: string;
  }[];
}

export interface ReceiptUpdatedData {
  delivered_sequence: number;
  read_sequence: number;
  user_id: string;
  updated_at: string;
}

export interface MatchEndedData {
  reason: string;
}

// ── View-model types (UI-only, never stored) ──────────────────────────────

export interface ChatMessageViewModel extends ChatMessage {
  timeLabel: string;
  showAvatar: boolean;
  showTimestamp: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

export type ChatListItem =
  | { kind: 'message'; data: ChatMessageViewModel }
  | { kind: 'date_separator'; id: string; label: string }
  | { kind: 'typing_indicator'; id: string };

// ── Attachment validation constants (must match backend) ───────────────────

export const CHAT_MAX_IMAGE_ATTACHMENTS = 5;
export const CHAT_MAX_VOICE_ATTACHMENTS = 1;
export const CHAT_MAX_TOTAL_ATTACHMENTS = 5;

export const CHAT_MAX_IMAGE_FILE_SIZE = 26_214_400; // 25 MiB
export const CHAT_MAX_VOICE_FILE_SIZE = 26_214_400; // 25 MiB

export const CHAT_VOICE_MAX_DURATION_SECONDS =
  Number(process.env.EXPO_PUBLIC_CHAT_VOICE_MAX_DURATION_SECONDS) || 300;

export const CHAT_ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/tiff',
] as const;

export const CHAT_ALLOWED_VOICE_MIME_TYPES = [
  'audio/m4a',
  'audio/mp4',
  'audio/aac',
  'audio/mpeg',
  'audio/x-m4a',
  'audio/mp3',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/flac',
  'audio/3gpp',
  'audio/amr',
] as const;
