import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import type * as NotificationsType from 'expo-notifications';

import { Expo } from '@/services/notifications/notificationsModule';
import {
    buildNavIntent,
    validatePayload,
} from '@/services/notifications/payloadValidator';
import { useNotificationsStore } from '@/stores/notifications-store';
import type { ValidatedNavIntent } from '@/types/notifications';

type NavigationReadyState = {
  isAppReady: boolean;
  hasSession: boolean;
};

export function useNotificationNavigation({ isAppReady, hasSession }: NavigationReadyState) {
  const router = useRouter();
  const lastHandledId = useNotificationsStore((s) => s.lastHandledNotificationId);
  const setLastHandledId = useNotificationsStore((s) => s.setLastHandledNotificationId);
  const pendingNavIntent = useNotificationsStore((s) => s.pendingNavIntent);
  const setPendingNavIntent = useNotificationsStore((s) => s.setPendingNavIntent);
  const processedOnce = useRef(false);

  const navigate = useCallback(
    (intent: ValidatedNavIntent) => {
      if (!hasSession) {
        setPendingNavIntent(intent);
        return;
      }

      switch (intent.type) {
        case 'CHAT_MESSAGE':
          if (intent.match_id) {
            router.push({
              pathname: '/(app)/chat',
              params: { matchId: intent.match_id },
            } as any);
          } else {
            router.push('/(app)/(tabs)/messages' as any);
          }
          break;
        case 'MATCH_CREATED':
          router.push('/(app)/(tabs)/matches' as any);
          break;
        case 'LIKE_RECEIVED':
          router.push('/(app)/(tabs)/likes' as any);
          break;
        case 'ACCOUNT_ALERT':
          router.push('/(app)/settings' as any);
          break;
        case 'MARKETING':
          router.push('/(app)/(tabs)/index' as any);
          break;
        default:
          break;
      }
    },
    [hasSession, router, setPendingNavIntent],
  );

  const handleResponse = useCallback(
    (response: NotificationsType.NotificationResponse | null | undefined) => {
      if (!response) return;

      const notifId = response.notification.request.identifier;
      if (notifId === lastHandledId) return;

      const raw = response.notification.request.content.data;
      const payload = validatePayload(raw);
      if (!payload) return;

      const intent = buildNavIntent(payload);
      if (!intent) return;

      setLastHandledId(notifId);

      if (!isAppReady || !hasSession) {
        setPendingNavIntent(intent);
        return;
      }

      navigate(intent);
    },
    [lastHandledId, setLastHandledId, isAppReady, hasSession, navigate, setPendingNavIntent],
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!isAppReady) return;
    if (processedOnce.current) return;

    processedOnce.current = true;

    const lastResponse = Expo?.getLastNotificationResponse();
    if (lastResponse) {
      handleResponse(lastResponse);
    }
  }, [isAppReady, handleResponse]);

  useEffect(() => {
    if (Platform.OS === 'web' || !Expo) return;

    const sub = Expo.addNotificationResponseReceivedListener((response: NotificationsType.NotificationResponse) => {
      handleResponse(response);
    });

    return () => sub.remove();
  }, [handleResponse]);

  useEffect(() => {
    if (!isAppReady || !hasSession || !pendingNavIntent) return;

    const intent = pendingNavIntent;
    setPendingNavIntent(null);
    navigate(intent);
  }, [isAppReady, hasSession, pendingNavIntent, setPendingNavIntent, navigate]);
}
