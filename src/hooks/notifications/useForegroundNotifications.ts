import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { Expo } from '@/services/notifications/notificationsModule';
import {
    buildNavIntent,
    validatePayload,
} from '@/services/notifications/payloadValidator';
import { useNotificationsStore } from '@/stores/notifications-store';
import type { ForegroundBannerState } from '@/types/notifications';

type ForegroundNotificationOptions = {
  currentMatchId?: string | null;
};

export function useForegroundNotifications(options?: ForegroundNotificationOptions) {
  const queryClient = useQueryClient();
  const setForegroundBanner = useNotificationsStore((s) => s.setForegroundBanner);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' || !Expo) return;

    const sub = Expo.addNotificationReceivedListener((notification) => {
      const raw = notification.request.content.data;
      const payload = validatePayload(raw);
      if (!payload) return;

      const { type } = payload;

      switch (type) {
        case 'CHAT_MESSAGE': {
          const { match_id } = payload;
          const isCurrentChat =
            match_id && options?.currentMatchId === match_id;

          if (!isCurrentChat) {
            queryClient.invalidateQueries({ queryKey: ['chat-inbox'] });
          }

          if (!isCurrentChat) {
            showBanner(notification, payload);
          }
          break;
        }

        case 'MATCH_CREATED':
          queryClient.invalidateQueries({ queryKey: ['matches'] });
          queryClient.invalidateQueries({ queryKey: ['chat-inbox'] });
          showBanner(notification, payload);
          break;

        case 'LIKE_RECEIVED':
          queryClient.invalidateQueries({ queryKey: ['likes'] });
          showBanner(notification, payload);
          break;

        case 'ACCOUNT_ALERT':
          queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
          queryClient.invalidateQueries({ queryKey: ['me'] });
          showBanner(notification, payload);
          break;

        case 'MARKETING':
          showBanner(notification, payload);
          break;
      }
    });

    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, options?.currentMatchId]);

  function showBanner(
    notification: { request: { identifier: string; content: { title?: string | null; body?: string | null } } },
    payload: ReturnType<typeof validatePayload>,
  ) {
    if (!payload) return;

    const title = notification.request.content.title ?? '';
    const body = notification.request.content.body ?? '';

    if (!title && !body) return;

    const navIntent = buildNavIntent(payload);

    const banner: ForegroundBannerState = {
      id: notification.request.identifier,
      title,
      body,
      navIntent,
    };

    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
    }

    setForegroundBanner(banner);

    bannerTimerRef.current = setTimeout(() => {
      setForegroundBanner(null);
    }, 5000);
  }

  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) {
        clearTimeout(bannerTimerRef.current);
      }
    };
  }, []);
}
