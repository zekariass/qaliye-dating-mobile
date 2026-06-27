import { apiClient } from '@/api/apiClient';
import {
    deactivateDevice,
    getNotificationPreferences,
    registerDevice,
    updateNotificationPreferences,
} from '../notificationsApi';

jest.mock('@/api/apiClient', () => ({
  apiClient: {
    post: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockPost = apiClient.post as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;
const mockGet = apiClient.get as jest.Mock;
const mockPatch = apiClient.patch as jest.Mock;

describe('registerDevice', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls POST /api/v1/notifications/devices with correct body', async () => {
    mockPost.mockResolvedValue({ data: { registered: true, isActive: true } });

    const result = await registerDevice({
      expoPushToken: 'ExponentPushToken[abc]',
      platform: 'IOS',
      installationId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(mockPost).toHaveBeenCalledWith('/api/v1/notifications/devices', {
      expo_push_token: 'ExponentPushToken[abc]',
      platform: 'IOS',
      installation_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.registered).toBe(true);
  });

  it('never sends WEB as platform', async () => {
    mockPost.mockResolvedValue({ data: { registered: true, isActive: true } });

    await registerDevice({
      expoPushToken: 'ExponentPushToken[abc]',
      platform: 'ANDROID',
      installationId: '550e8400-e29b-41d4-a716-446655440000',
    });

    const body = mockPost.mock.calls[0][1];
    expect(body.platform).not.toBe('WEB');
    expect(body).toHaveProperty('expo_push_token');
    expect(body).toHaveProperty('installation_id');
  });
});

describe('deactivateDevice', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls DELETE /api/v1/notifications/devices/current with installation_id query param', async () => {
    mockDelete.mockResolvedValue({ status: 204 });

    await deactivateDevice('test-installation-id');

    expect(mockDelete).toHaveBeenCalledWith('/api/v1/notifications/devices/current', {
      params: { installation_id: 'test-installation-id' },
    });
  });

  it('resolves on 204', async () => {
    mockDelete.mockResolvedValue({ status: 204 });
    await expect(deactivateDevice('some-id')).resolves.not.toThrow();
  });
});

describe('getNotificationPreferences', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns exact backend field names', async () => {
    const backendPrefs = {
      push_enabled: true,
      message_notifications_enabled: true,
      match_notifications_enabled: false,
      like_notifications_enabled: true,
      message_preview_enabled: false,
      marketing_notifications_enabled: false,
      marketing_notifications_opted_in_at: null,
      marketing_notifications_consent_version: null,
    };
    mockGet.mockResolvedValue({ data: backendPrefs });

    const result = await getNotificationPreferences();

    expect(result).toEqual({
      pushEnabled: true,
      messageNotificationsEnabled: true,
      matchNotificationsEnabled: false,
      likeNotificationsEnabled: true,
      messagePreviewEnabled: false,
      marketingNotificationsEnabled: false,
      marketingNotificationsOptedInAt: null,
      marketingNotificationsConsentVersion: null,
    });
    expect(result).toHaveProperty('pushEnabled');
    expect(result).toHaveProperty('messageNotificationsEnabled');
    expect(result).toHaveProperty('matchNotificationsEnabled');
    expect(result).toHaveProperty('likeNotificationsEnabled');
    expect(result).toHaveProperty('messagePreviewEnabled');
    expect(result).toHaveProperty('marketingNotificationsEnabled');
    expect(result).toHaveProperty('marketingNotificationsOptedInAt');
    expect(result).toHaveProperty('marketingNotificationsConsentVersion');
  });
});

describe('updateNotificationPreferences', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends only the fields provided (partial PATCH)', async () => {
    const backendUpdated = {
      push_enabled: false,
      message_notifications_enabled: true,
      match_notifications_enabled: true,
      like_notifications_enabled: true,
      message_preview_enabled: false,
      marketing_notifications_enabled: false,
      marketing_notifications_opted_in_at: null,
      marketing_notifications_consent_version: null,
    };
    mockPatch.mockResolvedValue({ data: backendUpdated });

    const result = await updateNotificationPreferences({ pushEnabled: false });

    expect(mockPatch).toHaveBeenCalledWith('/api/v1/notifications/preferences', {
      push_enabled: false,
    });
    expect(result.pushEnabled).toBe(false);
  });

  it('sends marketingNotificationsConsentVersion when enabling marketing', async () => {
    mockPatch.mockResolvedValue({ data: {} });

    await updateNotificationPreferences({
      marketingNotificationsEnabled: true,
      marketingNotificationsConsentVersion: '1.0',
    });

    const body = mockPatch.mock.calls[0][1];
    expect(body.marketing_notifications_enabled).toBe(true);
    expect(body.marketing_notifications_consent_version).toBe('1.0');
  });

  it('does NOT send marketingNotificationsOptedInAt — backend sets it', async () => {
    mockPatch.mockResolvedValue({ data: {} });

    await updateNotificationPreferences({
      marketingNotificationsEnabled: true,
      marketingNotificationsConsentVersion: '1.0',
    });

    const body = mockPatch.mock.calls[0][1];
    expect(body).not.toHaveProperty('marketing_notifications_opted_in_at');
  });
});
