import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { updateInboxVideoCallRequest, upsertInboxItem } from '@/hooks/messages/useInbox';
import { Expo } from '@/services/notifications/notificationsModule';
import {
    buildNavIntent,
    validatePayload,
} from '@/services/notifications/payloadValidator';
import { useNotificationsStore } from '@/stores/notifications-store';
import {
    BLIND_DATE_ALERT_CODES,
    MATCHMAKING_ALERT_CODES,
    type ForegroundBannerState
} from '@/types/notifications';

type ForegroundNotificationOptions = {
  currentMatchId?: string | null;
};

type VideoCallEventCode =
  | 'VIDEO_CALL_REQUESTED'
  | 'VIDEO_CALL_ACCEPTED'
  | 'VIDEO_CALL_DECLINED'
  | 'VIDEO_CALL_CANCELLED'
  | 'VIDEO_CALL_EXPIRED'
  | 'VIDEO_CALL_ENDED_TIME_LIMIT'
  | 'AUDIO_CALL_ENDED_TIME_LIMIT'
  | 'VIDEO_CALL_NO_SHOW'
  | 'AUDIO_CALL_NO_SHOW';

/**
 * Keeps the inbox row's video-call badge in sync when a VIDEO_CALL_* push
 * arrives. The inbox field is a fetch-time snapshot — live events patch it
 * locally so the badge doesn't go stale while the list is open.
 *
 * Events are caller-relative to the recipient:
 *  • VIDEO_CALL_REQUESTED → responder → can_accept
 *  • VIDEO_CALL_ACCEPTED  → requester → can_join
 *  • terminal events      → badge cleared
 */
function applyVideoCallBadgeUpdate(
  queryClient: ReturnType<typeof useQueryClient>,
  code: VideoCallEventCode,
  payload: {
    match_id?: string;
    video_call_request_id?: string;
    request_id?: string;
    call_type?: string;
    callType?: string;
  },
) {
  const matchId = payload.match_id;
  if (!matchId) {
    queryClient.invalidateQueries({ queryKey: ['chat-inbox'] });
    return;
  }
  const requestId = payload.video_call_request_id ?? payload.request_id ?? '';
  const callType = (payload.call_type ?? payload.callType) === 'AUDIO' ? 'AUDIO' as const : 'VIDEO' as const;

  if (code === 'VIDEO_CALL_REQUESTED') {
    updateInboxVideoCallRequest(queryClient, matchId, {
      id: requestId,
      status: 'PENDING',
      callType,
      isRequester: false,
      canAccept: true,
      canCancel: false,
      canJoin: false,
    });
  } else if (code === 'VIDEO_CALL_ACCEPTED') {
    updateInboxVideoCallRequest(queryClient, matchId, {
      id: requestId,
      status: 'ACCEPTED',
      callType,
      isRequester: true,
      canAccept: false,
      canCancel: false,
      canJoin: true,
    });
  } else {
    // DECLINED / CANCELLED / EXPIRED / ENDED_TIME_LIMIT → request is
    // terminal, clear the badge.
    updateInboxVideoCallRequest(queryClient, matchId, null);
  }
}

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
            const title = notification.request.content.title ?? '';
            const body = notification.request.content.body ?? '';
            if (match_id) {
              // Only use the push body as a preview when it looks like real
              // message content. Generic server fallbacks ("You have a new
              // message", empty strings) are skipped — the WebSocket-triggered
              // server refetch will supply the correct preview within ms.
              const isGenericBody =
                !body ||
                /new message/i.test(body) ||
                /sent you a message/i.test(body);
              upsertInboxItem(queryClient, match_id, {
                preview: isGenericBody ? undefined : body,
                senderDisplayName: title || undefined,
                createdAt: new Date().toISOString(),
                // Never bump the unread count from a push notification.
                // The WebSocket inbox.match.updated event triggers a full
                // server refetch that carries the authoritative count.
                // Without this flag, a push arriving after the refetch
                // passes the createdAt dedup check (client "now" > server
                // message timestamp) and increments an already-correct count,
                // producing an off-by-one badge.
                incrementUnread: false,
              });
            } else {
              queryClient.invalidateQueries({ queryKey: ['chat-inbox'] });
            }
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

        case 'SUPERLIKE_RECEIVED':
          queryClient.invalidateQueries({ queryKey: ['likes'] });
          showBanner(notification, payload);
          break;

        case 'ACCOUNT_ALERT': {
          queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
          queryClient.invalidateQueries({ queryKey: ['me'] });
          // Blind Date lifecycle alerts ride on ACCOUNT_ALERT — refresh the
          // blind-date screens so the new state is there when the user taps through.
          if (payload?.alert_code && BLIND_DATE_ALERT_CODES.has(payload.alert_code)) {
            queryClient.invalidateQueries({ queryKey: ['blindDate'] });
            queryClient.invalidateQueries({ queryKey: ['matches'] });
          }
          // Matchmaking lifecycle alerts ride ACCOUNT_ALERT as alert_code —
          // refresh requests/intros/preferences so the status screens show
          // the new state when the user taps through.
          if (payload?.alert_code && MATCHMAKING_ALERT_CODES.has(payload.alert_code)) {
            queryClient.invalidateQueries({ queryKey: ['matchmaking'] });
            if (payload.alert_code === 'MATCHMAKING_MATCHED') {
              queryClient.invalidateQueries({ queryKey: ['matches'] });
              queryClient.invalidateQueries({ queryKey: ['chat-inbox'] });
            }
          }
          // VIDEO_CALL_* may also ride on ACCOUNT_ALERT as an alert_code —
          // apply the same badge update as dedicated notification types.
          // AUDIO_CALL_ENDED_TIME_LIMIT / AUDIO_CALL_NO_SHOW are included
          // explicitly: the generic VIDEO_CALL_ prefix doesn't cover them,
          // and they map to the terminal (badge-clearing) branch.
          if (payload?.alert_code?.startsWith('VIDEO_CALL_') ||
              payload?.alert_code === 'AUDIO_CALL_ENDED_TIME_LIMIT' ||
              payload?.alert_code === 'AUDIO_CALL_NO_SHOW') {
            applyVideoCallBadgeUpdate(
              queryClient,
              payload.alert_code as Parameters<typeof applyVideoCallBadgeUpdate>[1],
              payload,
            );
          }
          showBanner(notification, payload);
          break;
        }

        case 'VIDEO_CALL_REQUESTED':
        case 'VIDEO_CALL_ACCEPTED':
        case 'VIDEO_CALL_DECLINED':
        case 'VIDEO_CALL_CANCELLED':
        case 'VIDEO_CALL_EXPIRED':
        case 'VIDEO_CALL_ENDED_TIME_LIMIT':
        case 'AUDIO_CALL_ENDED_TIME_LIMIT':
        case 'VIDEO_CALL_NO_SHOW':
        case 'AUDIO_CALL_NO_SHOW':
          applyVideoCallBadgeUpdate(queryClient, type, payload);
          queryClient.invalidateQueries({ queryKey: ['videoCall'] });
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
