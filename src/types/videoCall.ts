/**
 * Video Call Request types.
 *
 * Lifecycle: PENDING → ACCEPTED → COMPLETED
 *                     ├── DECLINED
 *                     ├── CANCELLED
 *                     └── EXPIRED
 *
 * Mirrors the backend `VideoCallRequestView` (caller-relative).
 */

export type CallType = 'VIDEO' | 'AUDIO';

export type VideoCallRequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'COMPLETED';

/** Terminal states — no further action possible, a new request can be created. */
export const TERMINAL_STATUSES: VideoCallRequestStatus[] = [
  'DECLINED',
  'CANCELLED',
  'EXPIRED',
  'COMPLETED',
];

export interface VideoCallRequest {
  id: string;
  match_id: string;
  status: VideoCallRequestStatus;
  /** Fixed at creation — never changes for the life of the request. */
  call_type: CallType;
  /** True if the authenticated user sent this request. */
  is_requester: boolean;
  /** Backend-computed permission flags — always use these, never hardcode. */
  can_accept: boolean;
  can_cancel: boolean;
  can_join: boolean;
  /** Whether the respective participant has joined the Agora channel. */
  requester_joined: boolean;
  responder_joined: boolean;
  /** PENDING auto-expiry (~48h from creation). */
  request_expires_at: string | null;
  /** Server-configured remind cooldown: null = remind not applicable (not
   *  PENDING or I'm the responder), 0 = allowed now, >0 = seconds to wait. */
  next_remind_in_seconds: number | null;
  /** Accept/decline timestamp. */
  responded_at: string | null;
  created_at: string;
  ended_at: string | null;
}

// ── API response shapes ────────────────────────────────────────────────────

export interface VideoCallRequestsListResponse {
  requests: VideoCallRequest[];
  total?: number;
  page?: number;
  size?: number;
}

/** Agora credentials returned by POST /video-call-requests/{id}/join. */
export interface JoinCallCredentials {
  channel_name: string;
  token: string;
  uid: number;
  expires_at: string;
}

export interface CreateVideoCallRequestPayload {
  match_id: string;
  /** Optional — backend defaults to 'VIDEO'. */
  call_type?: CallType;
}
