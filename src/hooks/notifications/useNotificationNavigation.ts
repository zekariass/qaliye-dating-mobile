import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type * as NotificationsType from 'expo-notifications';

import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import { navigateBlindDateAlert } from '@/services/notifications/blindDateNavigation';
import { navigateMarketingIntent } from '@/services/notifications/marketingNavigation';
import { navigateMatchmakingAlert } from '@/services/notifications/matchmakingNavigation';
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
  const loadLastHandledNotificationId = useNotificationsStore((s) => s.loadLastHandledNotificationId);
  const pendingNavIntent = useNotificationsStore((s) => s.pendingNavIntent);
  const setPendingNavIntent = useNotificationsStore((s) => s.setPendingNavIntent);
  const myUserId = useCurrentProfile().data?.user_id;
  const pathname = usePathname();
  const currentParams = useGlobalSearchParams<{ matchId?: string; requestId?: string }>();
  const processedOnce = useRef(false);
  // Dedup MATCHMAKING_MATCHED vs the generic MATCH_CREATED push that arrives
  // alongside it — both carry the same match_id.
  const lastMatchNavRef = useRef<{ matchId: string; ts: number } | null>(null);
  const [persistedIdLoaded, setPersistedIdLoaded] = useState(false);

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
          // A matchmaking match emits MATCHMAKING_MATCHED alongside this
          // generic push — if the matchmaking nav just ran for the same
          // match_id, skip so we don't stack a second screen.
          if (
            intent.match_id &&
            intent.match_id === lastMatchNavRef.current?.matchId &&
            Date.now() - lastMatchNavRef.current!.ts < 5000
          ) {
            break;
          }
          if (intent.match_id) {
            lastMatchNavRef.current = { matchId: intent.match_id, ts: Date.now() };
          }
          router.push('/(app)/(tabs)/matches' as any);
          break;
        case 'LIKE_RECEIVED':
          router.push('/(app)/(tabs)/likes' as any);
          break;
        case 'SUPERLIKE_RECEIVED':
          router.push('/(app)/(tabs)/likes' as any);
          break;
        case 'ACCOUNT_ALERT':
          if (intent.screen === 'blind-date') {
            void navigateBlindDateAlert({
              router,
              alertCode: intent.alert_code,
              sessionId: intent.session_id,
              userId: myUserId,
            });
          } else if (intent.screen === 'matchmaking') {
            // Matchmaking pushes ride ACCOUNT_ALERT — route on alert_code.
            // MATCHMAKING_MATCHED also emits a generic MATCH_CREATED push; the
            // dedup ref below prevents a double-navigation on match_id.
            if (
              intent.alert_code === 'MATCHMAKING_MATCHED' &&
              intent.match_id &&
              intent.match_id === lastMatchNavRef.current?.matchId &&
              Date.now() - lastMatchNavRef.current!.ts < 5000
            ) {
              break;
            }
            if (intent.alert_code === 'MATCHMAKING_MATCHED' && intent.match_id) {
              lastMatchNavRef.current = { matchId: intent.match_id, ts: Date.now() };
            }
            navigateMatchmakingAlert({
              router,
              alertCode: intent.alert_code,
              introductionId: intent.introduction_id,
              requestId: intent.request_id,
              matchId: intent.match_id,
            });
          } else if (intent.screen === 'video-call') {
            // Call pushes (ACCOUNT_ALERT + VIDEO_CALL_*/AUDIO_CALL_*) land on
            // the messages list — the user opens the match's call screen from
            // there.
            router.push('/(app)/(tabs)/messages' as any);
          } else {
            router.push('/(app)/settings' as any);
          }
          break;
        case 'MARKETING':
          navigateMarketingIntent(
            router,
            intent.screen || undefined,
            intent.params as Record<string, unknown> | undefined,
            intent.campaign_id,
          );
          break;
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
        case 'VIDEO_CALL_NO_SHOW':
        case 'AUDIO_CALL_NO_SHOW':
          if (intent.match_id) {
            // Skip the push when already viewing this request — the screen
            // polls every 5s and reflects the new state itself; pushing
            // again would stack an identical copy per notification.
            const alreadyViewing =
              (pathname === '/video-call' || pathname.endsWith('/video-call')) &&
              currentParams.matchId === intent.match_id &&
              (!intent.video_call_request_id ||
                currentParams.requestId === intent.video_call_request_id);
            if (!alreadyViewing) {
              router.push({
                pathname: '/(app)/video-call' as any,
                params: {
                  matchId: intent.match_id,
                  ...(intent.video_call_request_id
                    ? { requestId: intent.video_call_request_id }
                    : {}),
                },
              });
            }
          }
          break;
        default:
          break;
      }
    },
    [hasSession, router, setPendingNavIntent, myUserId, pathname, currentParams],
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

  // Load the persisted last-handled notification ID once on mount so that
  // stale notification responses from a previous app session are not
  // re-processed.  Without this, getLastNotificationResponse() on Android
  // returns the last notification the user ever tapped — even days later —
  // causing unwanted navigation to a chat screen after login.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    loadLastHandledNotificationId().finally(() => setPersistedIdLoaded(true));
  }, [loadLastHandledNotificationId]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!isAppReady) return;
    if (processedOnce.current) return;
    // Wait until the persisted last-handled ID has been loaded from
    // AsyncStorage so the deduplication check in handleResponse uses the
    // correct value instead of the initial null.
    if (!persistedIdLoaded) return;

    processedOnce.current = true;

    const lastResponse = Expo?.getLastNotificationResponse();
    if (lastResponse) {
      handleResponse(lastResponse);
    }
  }, [isAppReady, handleResponse, persistedIdLoaded]);

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
