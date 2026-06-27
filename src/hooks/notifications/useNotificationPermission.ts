import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { Expo } from '@/services/notifications/notificationsModule';
import { useNotificationsStore } from '@/stores/notifications-store';

export type PermissionStatus = 'unknown' | 'granted' | 'denied' | 'undetermined';

export function useNotificationPermission() {
  const setSystemPermissionGranted = useNotificationsStore(
    (s) => s.setSystemPermissionGranted,
  );
  const [status, setStatus] = useState<PermissionStatus>('unknown');

  const checkPermission = useCallback(async () => {
    if (Platform.OS === 'web' || !Expo) {
      setStatus('denied');
      setSystemPermissionGranted(false);
      return;
    }

    const { status: permStatus, ios } = await Expo.getPermissionsAsync();
    const granted =
      permStatus === 'granted' ||
      ios?.status === Expo.IosAuthorizationStatus.PROVISIONAL;

    const resolved: PermissionStatus = granted
      ? 'granted'
      : permStatus === 'undetermined'
        ? 'undetermined'
        : 'denied';

    setStatus(resolved);
    setSystemPermissionGranted(granted);
  }, [setSystemPermissionGranted]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web' || !Expo) return false;

    const { status: permStatus, ios } = await Expo.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    const granted =
      permStatus === 'granted' ||
      ios?.status === Expo.IosAuthorizationStatus.PROVISIONAL;

    const resolved: PermissionStatus = granted
      ? 'granted'
      : permStatus === 'undetermined'
        ? 'undetermined'
        : 'denied';

    setStatus(resolved);
    setSystemPermissionGranted(granted);
    return granted;
  }, [setSystemPermissionGranted]);

  return {
    status,
    isGranted: status === 'granted',
    isDenied: status === 'denied',
    isUndetermined: status === 'undetermined',
    checkPermission,
    requestPermission,
  };
}
