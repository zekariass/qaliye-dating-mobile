import { apiClient } from '@/api/apiClient';
import type {
    DeviceRegistrationRequest,
    DeviceRegistrationResponse,
    NotificationPreferences,
    NotificationPreferencesPatch,
} from '@/types/notifications';

type BackendDeviceRegistrationRequest = {
  expo_push_token: string;
  platform: string;
  installation_id: string;
};

type BackendNotificationPreferences = {
  push_enabled: boolean;
  message_notifications_enabled: boolean;
  match_notifications_enabled: boolean;
  like_notifications_enabled: boolean;
  message_preview_enabled: boolean;
  marketing_notifications_enabled: boolean;
  marketing_notifications_opted_in_at: string | null;
  marketing_notifications_consent_version: string | null;
};

type BackendNotificationPreferencesPatch = Partial<BackendNotificationPreferences>;

function toCamelCasePreferences(
  backend: BackendNotificationPreferences,
): NotificationPreferences {
  return {
    pushEnabled: backend.push_enabled,
    messageNotificationsEnabled: backend.message_notifications_enabled,
    matchNotificationsEnabled: backend.match_notifications_enabled,
    likeNotificationsEnabled: backend.like_notifications_enabled,
    messagePreviewEnabled: backend.message_preview_enabled,
    marketingNotificationsEnabled: backend.marketing_notifications_enabled,
    marketingNotificationsOptedInAt: backend.marketing_notifications_opted_in_at,
    marketingNotificationsConsentVersion: backend.marketing_notifications_consent_version,
  };
}

function toSnakeCasePatch(
  patch: NotificationPreferencesPatch,
): BackendNotificationPreferencesPatch {
  const result: BackendNotificationPreferencesPatch = {};
  if (patch.pushEnabled !== undefined) result.push_enabled = patch.pushEnabled;
  if (patch.messageNotificationsEnabled !== undefined)
    result.message_notifications_enabled = patch.messageNotificationsEnabled;
  if (patch.matchNotificationsEnabled !== undefined)
    result.match_notifications_enabled = patch.matchNotificationsEnabled;
  if (patch.likeNotificationsEnabled !== undefined)
    result.like_notifications_enabled = patch.likeNotificationsEnabled;
  if (patch.messagePreviewEnabled !== undefined)
    result.message_preview_enabled = patch.messagePreviewEnabled;
  if (patch.marketingNotificationsEnabled !== undefined)
    result.marketing_notifications_enabled = patch.marketingNotificationsEnabled;
  if (patch.marketingNotificationsConsentVersion !== undefined)
    result.marketing_notifications_consent_version = patch.marketingNotificationsConsentVersion;
  return result;
}

export async function registerDevice(
  req: DeviceRegistrationRequest,
): Promise<DeviceRegistrationResponse> {
  const body: BackendDeviceRegistrationRequest = {
    expo_push_token: req.expoPushToken,
    platform: req.platform,
    installation_id: req.installationId,
  };

  const { data } = await apiClient.post<DeviceRegistrationResponse>(
    '/api/v1/notifications/devices',
    body,
  );
  return data;
}

export async function deactivateDevice(installationId: string): Promise<void> {
  await apiClient.delete('/api/v1/notifications/devices/current', {
    params: { installation_id: installationId },
  });
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { data } = await apiClient.get<BackendNotificationPreferences>(
    '/api/v1/notifications/preferences',
  );

  if (__DEV__) {
    console.log('[API] getNotificationPreferences raw response:', JSON.stringify(data, null, 2));
  }

  return toCamelCasePreferences(data);
}

export async function updateNotificationPreferences(
  patch: NotificationPreferencesPatch,
): Promise<NotificationPreferences> {
  const { data } = await apiClient.patch<BackendNotificationPreferences>(
    '/api/v1/notifications/preferences',
    toSnakeCasePatch(patch),
  );

  if (__DEV__) {
    console.log('[API] updateNotificationPreferences raw response:', JSON.stringify(data, null, 2));
  }

  return toCamelCasePreferences(data);
}
