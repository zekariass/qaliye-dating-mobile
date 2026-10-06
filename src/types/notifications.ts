export type NotificationPlatform = 'IOS' | 'ANDROID';

export type NotificationType =
  | 'CHAT_MESSAGE'
  | 'MATCH_CREATED'
  | 'LIKE_RECEIVED'
  | 'SUPERLIKE_RECEIVED'
  | 'ACCOUNT_ALERT'
  | 'MARKETING'
  | 'VIDEO_CALL_REQUESTED'
  | 'VIDEO_CALL_ACCEPTED'
  | 'VIDEO_CALL_DECLINED'
  | 'VIDEO_CALL_CANCELLED'
  | 'VIDEO_CALL_EXPIRED'
  | 'AUDIO_CALL_REQUESTED'
  | 'AUDIO_CALL_ACCEPTED'
  | 'AUDIO_CALL_DECLINED'
  | 'AUDIO_CALL_CANCELLED'
  | 'AUDIO_CALL_EXPIRED'
  | 'VIDEO_CALL_ENDED_TIME_LIMIT'
  | 'AUDIO_CALL_ENDED_TIME_LIMIT';

export type DeviceRegistrationRequest = {
  expoPushToken: string;
  platform: NotificationPlatform;
  installationId: string;
};

export type DeviceRegistrationResponse = {
  registered: boolean;
  isActive: boolean;
};

export type NotificationPreferences = {
  pushEnabled: boolean;
  messageNotificationsEnabled: boolean;
  matchNotificationsEnabled: boolean;
  likeNotificationsEnabled: boolean;
  superlikeNotificationsEnabled: boolean;
  superMessageEnabled: boolean;
  messagePreviewEnabled: boolean;
  marketingNotificationsEnabled: boolean;
  marketingNotificationsOptedInAt: string | null;
  marketingNotificationsConsentVersion: string | null;
};

export type NotificationPreferencesPatch = {
  pushEnabled?: boolean;
  messageNotificationsEnabled?: boolean;
  matchNotificationsEnabled?: boolean;
  likeNotificationsEnabled?: boolean;
  superlikeNotificationsEnabled?: boolean;
  superMessageEnabled?: boolean;
  messagePreviewEnabled?: boolean;
  marketingNotificationsEnabled?: boolean;
  marketingNotificationsConsentVersion?: string;
};

export type MarketingNavigation = {
  screen: string;
  params?: Record<string, unknown>;
};

/** ACCOUNT_ALERT sub-codes emitted by the Blind Date feature. */
export type BlindDateAlertCode =
  | 'BLIND_DATE_REVEAL'
  | 'BLIND_DATE_ELIMINATED'
  | 'BLIND_DATE_MATCHED'
  | 'BLIND_DATE_NO_MATCH'
  | 'BLIND_DATE_ADVANCED';

export const BLIND_DATE_ALERT_CODES: ReadonlySet<string> = new Set<string>([
  'BLIND_DATE_REVEAL',
  'BLIND_DATE_ELIMINATED',
  'BLIND_DATE_MATCHED',
  'BLIND_DATE_NO_MATCH',
  'BLIND_DATE_ADVANCED',
]);

/**
 * ACCOUNT_ALERT sub-codes emitted by the matchmaking feature.
 * The backend sends notification_type="ACCOUNT_ALERT" with the real event in
 * `alert_code` — route on the alert_code, never on notification_type.
 * See docs/matchmaking-client-api.md §5.
 */
export type MatchmakingAlertCode =
  | 'MATCHMAKING_REQUEST_CREATED'
  | 'MATCHMAKING_REQUEST_CANCELLED'
  | 'MATCHMAKING_REQUEST_EXPIRED'
  | 'MATCHMAKING_INTRODUCTION_PROPOSED'
  | 'MATCHMAKING_INTRODUCTION_DECLINED'
  | 'MATCHMAKING_INTRODUCTION_CANCELLED'
  | 'MATCHMAKING_INTRODUCTION_EXPIRED'
  | 'MATCHMAKING_MATCHED';

export const MATCHMAKING_ALERT_CODES: ReadonlySet<string> = new Set<string>([
  'MATCHMAKING_REQUEST_CREATED',
  'MATCHMAKING_REQUEST_CANCELLED',
  'MATCHMAKING_REQUEST_EXPIRED',
  'MATCHMAKING_INTRODUCTION_PROPOSED',
  'MATCHMAKING_INTRODUCTION_DECLINED',
  'MATCHMAKING_INTRODUCTION_CANCELLED',
  'MATCHMAKING_INTRODUCTION_EXPIRED',
  'MATCHMAKING_MATCHED',
]);

/**
 * ACCOUNT_ALERT sub-codes emitted by the audio/video call feature — the
 * prefix carries the call type (VIDEO_CALL_* / AUDIO_CALL_*).
 * See docs/video-audio-call/backend-api.md §2.
 */
export const CALL_ALERT_CODES: ReadonlySet<string> = new Set<string>([
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
]);

export type NotificationPayloadData = {
  type: NotificationType;
  match_id?: string;
  message_id?: string;
  discovery_action_id?: string;
  campaign_id?: string;
  /** Present on ACCOUNT_ALERT pushes (e.g. BLIND_DATE_* codes). */
  alert_code?: string;
  /** Blind Date session id — present on newer BLIND_DATE_* pushes; absent on
   *  older queued notifications, so consumers must handle the fallback. */
  session_id?: string;
  /** Only present for MARKETING notifications. Contains the deep-link target. */
  navigation?: MarketingNavigation;
  /** Matchmaking: the introduction id (MATCHMAKING_INTRODUCTION_* / MATCHMAKING_MATCHED alert codes). */
  introduction_id?: string;
  /** Matchmaking: the caller's own request id (MATCHMAKING_* alert codes). */
  request_id?: string;
  /** Video call: the video-call request id (VIDEO_CALL_* events). */
  video_call_request_id?: string;
  /** Video call: 'VIDEO' | 'AUDIO' (VIDEO_CALL_* events; absent on older payloads). */
  call_type?: string;
};

export type ValidatedNavIntent = {
  type: NotificationType;
  match_id?: string;
  message_id?: string;
  discovery_action_id?: string;
  campaign_id?: string;
  alert_code?: string;
  session_id?: string;
  introduction_id?: string;
  request_id?: string;
  video_call_request_id?: string;
  screen: string;
  params?: Record<string, unknown>;
};

export type ForegroundBannerState = {
  id: string;
  title: string;
  body: string;
  navIntent: ValidatedNavIntent | null;
};

