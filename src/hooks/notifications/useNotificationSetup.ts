import Constants from 'expo-constants';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { getOrCreateInstallationId } from '@/services/notifications/installationId';
import { setupAndroidNotificationChannel } from '@/services/notifications/notificationChannel';
import { Expo } from '@/services/notifications/notificationsModule';
import { useNotificationsStore } from '@/stores/notifications-store';
import type { NotificationPlatform } from '@/types/notifications';

import { useNotificationPermission } from './useNotificationPermission';
import { useRegisterDevice } from './useRegisterDevice';

function getMobilePlatform(): NotificationPlatform | null {
  if (Platform.OS === 'ios') return 'IOS';
  if (Platform.OS === 'android') return 'ANDROID';
  return null;
}

export function useNotificationSetup(userId: string | undefined) {
  const { isGranted, checkPermission } = useNotificationPermission();
  const { mutate: registerDevice } = useRegisterDevice();
  const systemPermissionGranted = useNotificationsStore(
    (s) => s.systemPermissionGranted,
  );

  const channelSetupDone = useRef(false);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!Expo) return;
    Expo.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }, []);

  const tryRegister = useCallback(
    async (token: string) => {
      if (!userId || !systemPermissionGranted) return;
      if (!token || !token.startsWith('ExponentPushToken[')) return;

      const platform = getMobilePlatform();
      if (!platform) return;

      const installationId = await getOrCreateInstallationId();
      if (!installationId) return;

      if (__DEV__) {
        console.log('[NotificationSetup] tryRegister:', {
          token: token ? `${token.slice(0, 20)}...` : null,
          installationId,
          platform,
        });
      }

      registerDevice({ expoPushToken: token, platform, installationId });
    },
    [userId, systemPermissionGranted, registerDevice],
  );

  const setupTokenAndRegister = useCallback(async () => {
    if (Platform.OS === 'web' || !Expo) return;
    if (!isGranted || !userId) return;

    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      if (__DEV__) {
        console.log('[NotificationSetup] projectId:', projectId);
      }

      const { data: token } = await Expo.getExpoPushTokenAsync({
        projectId,
      });

      if (__DEV__) {
        console.log('[NotificationSetup] getExpoPushTokenAsync result:', token ? `${token.slice(0, 40)}...` : null);
      }

      if (!token || !token.startsWith('ExponentPushToken[')) {
        if (__DEV__) {
          console.warn('[NotificationSetup] Received non-Expo push token; skipping registration.');
        }
        return;
      }

      tokenRef.current = token;
      await tryRegister(token);
    } catch (error) {
      if (__DEV__) {
        console.log('[NotificationSetup] getExpoPushTokenAsync failed:', error);
      }
    }
  }, [isGranted, userId, tryRegister]);

  useEffect(() => {
    if (!channelSetupDone.current) {
      channelSetupDone.current = true;
      setupAndroidNotificationChannel();
    }
  }, []);

  useEffect(() => {
    setupTokenAndRegister();
  }, [setupTokenAndRegister]);

  useEffect(() => {
    if (Platform.OS === 'web' || !Expo) return;

    const sub = Expo.addPushTokenListener(async ({ data: newToken }) => {
      if (!newToken || !newToken.startsWith('ExponentPushToken[')) return;
      tokenRef.current = newToken;
      if (userId && systemPermissionGranted && newToken) {
        await tryRegister(newToken);
      }
    });

    return () => sub.remove();
  }, [userId, systemPermissionGranted, tryRegister]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const sub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        await checkPermission();
        if (isGranted && userId && tokenRef.current) {
          await tryRegister(tokenRef.current);
        }
      }
    });

    return () => sub.remove();
  }, [checkPermission, isGranted, userId, tryRegister]);
}
