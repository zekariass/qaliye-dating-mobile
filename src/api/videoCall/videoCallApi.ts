import { apiClient } from '@/api/apiClient';
import { useMeStore } from '@/stores/me-store';
import type {
    CreateVideoCallRequestPayload,
    JoinCallCredentials,
    VideoCallRequest,
    VideoCallRequestsListResponse,
    VideoCallRequestStatus,
} from '@/types/videoCall';

const MATCHES = '/api/v1/matches';
const BASE = '/api/v1/video-call-requests';

// ── Normalisation ───────────────────────────────────────────────────────────

/** Coerces boolean-ish values ("true"/1/true) without misfiring on "false". */
function toBool(v: unknown, fallback = false): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === 1) return true;
  if (v === 'false' || v === 0) return false;
  return fallback;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v ? v : null;
}

/**
 * Maps a raw `VideoCallRequestView` to our client model.
 * Tolerates snake_case / camelCase serialisation and derives `is_requester`
 * from `requester_id` + the current user id when the flag itself is absent.
 */
function normalizeRequest(raw: Record<string, unknown>): VideoCallRequest {
  const meId = useMeStore.getState().data?.user_id;
  const requesterId = str(
    raw.requester_id ?? raw.requesterId ?? raw.requester_user_id ??
    raw.from_user_id ?? raw.initiator_id ?? raw.created_by,
  );

  const rawIsRequester = raw.is_requester ?? raw.isRequester;
  let isRequester: boolean;
  if (rawIsRequester !== undefined && rawIsRequester !== null) {
    isRequester = toBool(rawIsRequester);
  } else if (requesterId && meId) {
    isRequester = requesterId === meId;
  } else {
    isRequester = false;
  }

  return {
    id: str(raw.id) ?? '',
    match_id: str(raw.match_id ?? raw.matchId) ?? '',
    status: (raw.status ?? 'PENDING') as VideoCallRequestStatus,
    call_type: str(raw.call_type ?? raw.callType) === 'AUDIO' ? 'AUDIO' : 'VIDEO',
    is_requester: isRequester,
    can_accept: toBool(raw.can_accept ?? raw.canAccept),
    can_cancel: toBool(raw.can_cancel ?? raw.canCancel),
    can_join: toBool(raw.can_join ?? raw.canJoin),
    requester_joined: toBool(raw.requester_joined ?? raw.requesterJoined),
    responder_joined: toBool(raw.responder_joined ?? raw.responderJoined),
    request_expires_at: str(raw.request_expires_at ?? raw.requestExpiresAt ?? raw.expires_at),
    call_deadline_at: str(raw.call_deadline_at ?? raw.callDeadlineAt),
    next_remind_in_seconds: (() => {
      const v = raw.next_remind_in_seconds ?? raw.nextRemindInSeconds;
      const n = typeof v === 'number' ? v : Number.parseInt(String(v ?? ''), 10);
      return Number.isFinite(n) && n >= 0 ? n : null;
    })(),
    responded_at: str(raw.responded_at ?? raw.respondedAt),
    created_at: str(raw.created_at ?? raw.createdAt) ?? '',
    ended_at: str(raw.ended_at ?? raw.endedAt),
  };
}

/** Extracts a request object from a response that may or may not be wrapped in `{ request }`. */
function unwrapRequest(data: unknown): VideoCallRequest {
  const obj = (data ?? {}) as Record<string, unknown>;
  const inner = (obj.request ?? obj.data ?? obj) as Record<string, unknown>;
  return normalizeRequest(inner);
}

// ── Endpoints ───────────────────────────────────────────────────────────────

/** GET /api/v1/matches/{matchId}/video-call-requests — full history + current, newest first. */
export async function fetchVideoCallRequests(
  matchId: string,
  page = 0,
  size = 20,
): Promise<VideoCallRequest[]> {
  const res = await apiClient.get<VideoCallRequestsListResponse | VideoCallRequest[]>(
    `${MATCHES}/${matchId}/video-call-requests`,
    { params: { page, size } },
  );
  const data = res.data as unknown;
  const list: Record<string, unknown>[] = Array.isArray(data)
    ? (data as Record<string, unknown>[])
    : (((data as Record<string, unknown>)?.requests ??
        (data as Record<string, unknown>)?.items ??
        (data as Record<string, unknown>)?.content ??
        []) as Record<string, unknown>[]);
  return list.map(normalizeRequest);
}

/** POST /api/v1/video-call-requests — idempotent; returns existing live request if one exists. */
export async function createVideoCallRequest(
  payload: CreateVideoCallRequestPayload,
): Promise<VideoCallRequest> {
  const res = await apiClient.post(BASE, payload);
  return unwrapRequest(res.data);
}

/** POST /api/v1/video-call-requests/{id}/accept — responder only. */
export async function acceptVideoCallRequest(requestId: string): Promise<VideoCallRequest> {
  const res = await apiClient.post(`${BASE}/${requestId}/accept`);
  return unwrapRequest(res.data);
}

/** POST /api/v1/video-call-requests/{id}/decline — responder only. */
export async function declineVideoCallRequest(requestId: string): Promise<VideoCallRequest> {
  const res = await apiClient.post(`${BASE}/${requestId}/decline`);
  return unwrapRequest(res.data);
}

/** POST /api/v1/video-call-requests/{id}/cancel — requester only. */
export async function cancelVideoCallRequest(requestId: string): Promise<VideoCallRequest> {
  const res = await apiClient.post(`${BASE}/${requestId}/cancel`);
  return unwrapRequest(res.data);
}

/**
 * POST /api/v1/video-call-requests/{id}/remind — requester only, PENDING only.
 * Re-sends the call-requested push to the responder. Cooldown-guarded:
 * 429 if reminded too recently, 409 if the request is no longer pending.
 */
export async function remindVideoCallRequest(requestId: string): Promise<VideoCallRequest> {
  const res = await apiClient.post(`${BASE}/${requestId}/remind`);
  return unwrapRequest(res.data);
}

/**
 * POST /api/v1/video-call-requests/{id}/join
 * Mints Agora credentials. The requester is charged on their first successful join;
 * the responder never pays. Returns `{ channel_name, token, uid, expires_at }`.
 */
export async function joinVideoCall(requestId: string): Promise<JoinCallCredentials> {
  const res = await apiClient.post<JoinCallCredentials>(`${BASE}/${requestId}/join`);
  return res.data;
}

/** POST /api/v1/video-call-requests/{id}/end — either participant; idempotent. */
export async function endVideoCall(requestId: string): Promise<VideoCallRequest> {
  const res = await apiClient.post(`${BASE}/${requestId}/end`);
  return unwrapRequest(res.data);
}
