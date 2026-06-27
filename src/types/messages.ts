// ---------------------------------------------------------------------------
// Message / Conversation types
// ---------------------------------------------------------------------------

export type ConversationType = 'direct' | 'group';

export type PresenceStatus = 'online' | 'offline';

/**
 * A single conversation item shown in the Messages list.
 * Field names mirror what a future REST API would return so the mock
 * and real layers are structurally identical.
 */
export interface ConversationItem {
  /** Stable unique ID — used as FlatList key */
  id: string;

  type: ConversationType;

  /** For direct conversations: the other participant's display name */
  displayName: string;

  /** URI for the avatar image; null → show placeholder */
  avatarUrl: string | null;

  /** Whether this is a group conversation (duplicates type for convenience) */
  isGroup: boolean;

  /** Verified profile badge */
  isVerified: boolean;

  /** Online / offline presence */
  presence: PresenceStatus;

  /** Preview of the most recent message */
  lastMessage: string;

  /**
   * ISO 8601 timestamp of the last message.
   * The UI layer derives the display string from this.
   */
  lastMessageAt: string;

  /** Number of unread messages; 0 → no badge */
  unreadCount: number;

  /** If true, show muted-notification icon instead of unread badge */
  isMuted: boolean;

  /**
   * Optional: the target user ID used for navigation to the chat screen.
   * For group conversations this maps to the conversation/group ID.
   */
  targetId: string;
}

// ---------------------------------------------------------------------------
// View-model used by the UI (derived from ConversationItem)
// ---------------------------------------------------------------------------
export interface ConversationViewModel extends ConversationItem {
  /** Human-readable relative timestamp e.g. "2m ago", "Yesterday", "May 20" */
  timestampLabel: string;
  /** Whether the timestamp is considered "recent" (affects colour) */
  isRecentTimestamp: boolean;
}
