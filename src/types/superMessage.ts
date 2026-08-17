// ---------------------------------------------------------------------------
// Super Message types — POST /api/v1/discovery/super-messages
// ---------------------------------------------------------------------------

export type SuperMessageStatus = 'SENT' | 'VIEWED' | 'ACCEPTED' | 'PASSED' | 'BLOCKED' | 'EXPIRED';

export type SuperMessageDirection = 'sent' | 'received';

/** Brief profile info embedded in every super message response */
export interface UserProfileBrief {
  id: string;
  display_name: string | null;
  photo_url: string | null;
}

/** Wire-format DTO (snake_case — as returned by the backend) */
export interface SuperMessageDto {
  id: string;
  sender_id: string;
  receiver_id: string;
  /** Sender's profile info — always present in API responses */
  sender: UserProfileBrief;
  /** Receiver's profile info — always present in API responses */
  receiver: UserProfileBrief;
  message: string;
  action_type: 'SUPER_MESSAGE';
  credit_cost: number;
  status: SuperMessageStatus;
  viewed_at: string | null;
  responded_at: string | null;
  match_id: string | null;
  discovery_action_id: string;
  created_at: string;
}

/** Response from accept / pass endpoints */
export interface SuperMessageActionResponse {
  message_id: string;
  status: 'ACCEPTED' | 'PASSED';
  responded_at: string | null;
  matched: boolean;
  match_id: string | null;
  matched_at: string | null;
}

export interface SendSuperMessageRequest {
  targetUserId: string;
  message: string;
  idempotencyKey: string;
  /** Display name of the target — used optimistically in UI only */
  targetDisplayName?: string;
  /** Primary photo URL of the target — used optimistically in UI only */
  targetPhotoUrl?: string | null;
}
