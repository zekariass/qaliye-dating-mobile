import type {
    MarketingNavigation,
    NotificationPayloadData,
    NotificationType,
    ValidatedNavIntent,
} from '@/types/notifications';
import { BLIND_DATE_ALERT_CODES, CALL_ALERT_CODES, MATCHMAKING_ALERT_CODES } from '@/types/notifications';

const SUPPORTED_TYPES: NotificationType[] = [
  'CHAT_MESSAGE',
  'MATCH_CREATED',
  'LIKE_RECEIVED',
  'SUPERLIKE_RECEIVED',
  'ACCOUNT_ALERT',
  'MARKETING',
  // Audio/video calls
  'VIDEO_CALL_REQUESTED',
  'VIDEO_CALL_ACCEPTED',
  'VIDEO_CALL_DECLINED',
  'VIDEO_CALL_CANCELLED',
  'VIDEO_CALL_EXPIRED',
  'AUDIO_CALL_REQUESTED',
  'AUDIO_CALL_ACCEPTED',
  'AUDIO_CALL_DECLINED',
  'AUDIO_CALL_CANCELLED',
  'AUDIO_CALL_EXPIRED',
  'VIDEO_CALL_ENDED_TIME_LIMIT',
  'AUDIO_CALL_ENDED_TIME_LIMIT',
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function validatePayload(raw: unknown): NotificationPayloadData | null {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Record<string, unknown>;
  const type = data.notification_type as NotificationType;

  if (!SUPPORTED_TYPES.includes(type)) return null;

  // Extract deep-link navigation for MARKETING notifications only.
  //
  // FCM (Android) requires all data-payload values to be strings, so the
  // backend JSON-serializes the nested `navigation` object before sending.
  // We therefore handle both the already-parsed object case (iOS / local
  // test sends) and the JSON-string case (FCM on Android).
  let navigation: MarketingNavigation | undefined;
  if (type === 'MARKETING') {
    let nav: unknown = data.navigation;

    // Deserialize if the backend sent it as a JSON string (FCM requirement)
    if (typeof nav === 'string') {
      try { nav = JSON.parse(nav); } catch { nav = undefined; }
    }

    if (nav && typeof nav === 'object' && !Array.isArray(nav)) {
      const navObj = nav as Record<string, unknown>;
      if (typeof navObj.screen === 'string' && navObj.screen) {
        // `params` may also be a JSON string for the same reason
        let params: Record<string, unknown> | undefined;
        let rawParams = navObj.params;
        if (typeof rawParams === 'string') {
          try { rawParams = JSON.parse(rawParams); } catch { rawParams = undefined; }
        }
        if (rawParams && typeof rawParams === 'object' && !Array.isArray(rawParams)) {
          params = rawParams as Record<string, unknown>;
        }
        navigation = { screen: navObj.screen, params };
      }
    }
  }

  return {
    type,
    match_id: isValidUuid(data.match_id) ? data.match_id : undefined,
    message_id: isValidUuid(data.message_id) ? data.message_id : undefined,
    discovery_action_id: isValidUuid(data.discovery_action_id)
      ? data.discovery_action_id
      : undefined,
    campaign_id: isValidUuid(data.campaign_id) ? data.campaign_id : undefined,
    alert_code:
      typeof data.alert_code === 'string' && data.alert_code
        ? data.alert_code
        : undefined,
    session_id: isValidUuid(data.session_id) ? data.session_id : undefined,
    introduction_id: isValidUuid(data.introduction_id) ? data.introduction_id : undefined,
    request_id: isValidUuid(data.request_id) ? data.request_id : undefined,
    video_call_request_id: isValidUuid(data.video_call_request_id)
      ? data.video_call_request_id
      : undefined,
    call_type:
      typeof data.call_type === 'string' && data.call_type
        ? data.call_type
        : undefined,
    navigation,
  };
}

export function buildNavIntent(
  payload: NotificationPayloadData,
): ValidatedNavIntent | null {
  const { type, match_id, message_id, discovery_action_id, campaign_id } = payload;

  switch (type) {
    case 'CHAT_MESSAGE':
      if (match_id) {
        return {
          type,
          match_id,
          message_id,
          screen: 'chat',
          params: { match_id },
        };
      }
      return null;
    case 'MATCH_CREATED':
      return { type, match_id, screen: 'matches' };
    case 'LIKE_RECEIVED':
      return { type, discovery_action_id, screen: 'likes' };
    case 'SUPERLIKE_RECEIVED':
      return { type, discovery_action_id, screen: 'likes' };
    case 'ACCOUNT_ALERT':
      // Blind Date lifecycle alerts (reveal/eliminated/matched/no-match)
      // deep-link into the session-scoped Blind Date screens — the concrete
      // route is resolved by navigateBlindDateAlert, which fetches the
      // session and falls back to the hub when `session_id` is absent or the
      // fetch fails. Everything else keeps going to Settings.
      if (payload.alert_code && BLIND_DATE_ALERT_CODES.has(payload.alert_code)) {
        return {
          type,
          alert_code: payload.alert_code,
          session_id: payload.session_id,
          screen: 'blind-date',
        };
      }
      // Matchmaking alerts ride the same ACCOUNT_ALERT envelope — the event
      // name lives in `alert_code` and the deep-link ids (introduction_id /
      // request_id / match_id) are resolved by navigateMatchmakingAlert.
      if (payload.alert_code && MATCHMAKING_ALERT_CODES.has(payload.alert_code)) {
        return {
          type,
          alert_code: payload.alert_code,
          introduction_id: payload.introduction_id,
          request_id: payload.request_id,
          match_id: payload.match_id,
          screen: 'matchmaking',
        };
      }
      // Audio/video call events ride ACCOUNT_ALERT too (VIDEO_CALL_* /
      // AUDIO_CALL_*) — without this branch they fell through to Settings.
      if (payload.alert_code && CALL_ALERT_CODES.has(payload.alert_code)) {
        return {
          type,
          alert_code: payload.alert_code,
          match_id: payload.match_id,
          video_call_request_id: payload.video_call_request_id ?? payload.request_id,
          screen: 'video-call',
        };
      }
      return { type, alert_code: payload.alert_code, screen: 'settings' };
    case 'MARKETING':
      return {
        type,
        campaign_id,
        // screen holds the deep-link target name (empty string = no deep-link → home)
        screen: payload.navigation?.screen ?? '',
        params: payload.navigation?.params,
      };
    case 'VIDEO_CALL_REQUESTED':
    case 'VIDEO_CALL_ACCEPTED':
    case 'VIDEO_CALL_DECLINED':
    case 'VIDEO_CALL_CANCELLED':
    case 'VIDEO_CALL_EXPIRED':
    case 'AUDIO_CALL_REQUESTED':
    case 'AUDIO_CALL_ACCEPTED':
    case 'AUDIO_CALL_DECLINED':
    case 'AUDIO_CALL_CANCELLED':
    case 'AUDIO_CALL_EXPIRED':
    case 'VIDEO_CALL_ENDED_TIME_LIMIT':
    case 'AUDIO_CALL_ENDED_TIME_LIMIT':
      return payload.match_id
        ? {
            type,
            match_id: payload.match_id,
            video_call_request_id:
              payload.video_call_request_id ?? payload.request_id,
            screen: 'video-call',
            params: {
              matchId: payload.match_id,
              requestId: payload.video_call_request_id ?? payload.request_id,
            },
          }
        : null;
  }
}
