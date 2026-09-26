export type NotificationPlatform = 'IOS' | 'ANDROID';

export type NotificationType =
  | 'CHAT_MESSAGE'
  | 'MATCH_CREATED'
  | 'LIKE_RECEIVED'
  | 'SUPERLIKE_RECEIVED'
  | 'ACCOUNT_ALERT'
  | 'MARKETING';

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
};

export type ValidatedNavIntent = {
  type: NotificationType;
  match_id?: string;
  message_id?: string;
  discovery_action_id?: string;
  campaign_id?: string;
  alert_code?: string;
  session_id?: string;
  screen: string;
  params?: Record<string, unknown>;
};

export type ForegroundBannerState = {
  id: string;
  title: string;
  body: string;
  navIntent: ValidatedNavIntent | null;
};

