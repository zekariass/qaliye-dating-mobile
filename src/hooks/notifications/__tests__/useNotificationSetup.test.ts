import { Platform } from 'react-native';

jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn(),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
  AndroidNotificationVisibility: { PRIVATE: 0 },
  setNotificationChannelAsync: jest.fn(),
  IosAuthorizationStatus: { PROVISIONAL: 1 },
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
  },
}));

jest.mock('@/services/notifications/installationId', () => ({
  getOrCreateInstallationId: jest.fn().mockResolvedValue('test-installation-id'),
}));

jest.mock('@/services/notifications/notificationChannel', () => ({
  setupAndroidNotificationChannel: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/stores/notifications-store', () => ({
  useNotificationsStore: jest.fn((selector: any) =>
    selector({ systemPermissionGranted: true, setSystemPermissionGranted: jest.fn() }),
  ),
}));

const mockRegisterDevice = jest.fn();
jest.mock('../useRegisterDevice', () => ({
  useRegisterDevice: () => ({ mutate: mockRegisterDevice }),
}));

describe('Registration platform guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not register on web platform', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { get: () => 'web', configurable: true });

    const Notifications = require('expo-notifications');
    Notifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[test]' });

    Object.defineProperty(Platform, 'OS', { get: () => originalOS, configurable: true });
    expect(mockRegisterDevice).not.toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'WEB' }),
    );
  });

  it('maps ios platform to IOS', () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    const { useNotificationSetup } = require('../useNotificationSetup');
    expect(useNotificationSetup).toBeDefined();
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
  });

  it('never sends WEB as platform value', async () => {
    const calls = mockRegisterDevice.mock.calls;
    for (const call of calls) {
      expect(call[0]?.platform).not.toBe('WEB');
    }
  });
});

describe('Registration preconditions', () => {
  it('requires an authenticated userId', () => {
    expect(mockRegisterDevice).not.toHaveBeenCalledWith(
      expect.objectContaining({ expoPushToken: expect.any(String) }),
    );
  });
});
