export type NotificationPlatform = 'IOS' | 'ANDROID';

export type NotificationType =
  | 'CHAT_MESSAGE'
  | 'MATCH_CREATED'
  | 'LIKE_RECEIVED'
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
  messagePreviewEnabled?: boolean;
  marketingNotificationsEnabled?: boolean;
  marketingNotificationsConsentVersion?: string;
};

export type NotificationPayloadData = {
  type: NotificationType;
  match_id?: string;
  message_id?: string;
  discovery_action_id?: string;
  campaign_id?: string;
};

export type ValidatedNavIntent = {
  type: NotificationType;
  match_id?: string;
  message_id?: string;
  discovery_action_id?: string;
  campaign_id?: string;
  screen: string;
  params?: Record<string, unknown>;
};

export type ForegroundBannerState = {
  id: string;
  title: string;
  body: string;
  navIntent: ValidatedNavIntent | null;
};

