// ---------------------------------------------------------------------------
// Chat / Messaging types — spec-compliant models
// ---------------------------------------------------------------------------

import type { ActivityStatus } from './activity';

// ── Message types ─────────────────────────────────────────────────────────

export type MessageType = 'TEXT' | 'ICEBREAKER' | 'PROMPT_REPLY';

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
  body: string;
  created_at: string;
  edited_at: string | null;
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
  body: string;
  created_at: string;
  edited_at: string | null;
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
