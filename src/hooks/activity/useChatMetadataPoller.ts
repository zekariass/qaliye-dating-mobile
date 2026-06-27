import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { fetchChatThread } from '@/api/chat/chatApi';
import { ACTIVITY_CHAT_METADATA_POLL_INTERVAL_MS } from '@/constants/activity';
import type { ActivityStatus } from '@/types/activity';
import type { ChatThreadDto } from '@/types/chat';

/**
 * Polls `GET /api/v1/chat/matches/{matchId}` every 90 s while the chat screen
 * is focused and the app is foregrounded.
 *
 * Per spec: use this endpoint (not the batch statuses endpoint) for open chat.
 * Triggers an immediate refresh on focus, foreground, and reconnect.
 */
export function useChatMetadataPoller(matchId: string, enabled: boolean) {
  const [activityStatus, setActivityStatus] = useState<ActivityStatus | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(AppState.currentState === 'active');
  const isFocusedRef = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const refresh = useCallback(async () => {
    if (!matchId || !enabledRef.current) return;
    try {
      const dto = await fetchChatThread(matchId);
      const status = (dto as ChatThreadDto & { participant: { activity_status?: ActivityStatus } })
        .participant.activity_status;
      setActivityStatus(status ?? null);
    } catch {
      // Keep last known status on failure
    }
  }, [matchId]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (isActiveRef.current && isFocusedRef.current && enabledRef.current) refresh();
    }, ACTIVITY_CHAT_METADATA_POLL_INTERVAL_MS);
  }, [refresh]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      if (isActiveRef.current && enabledRef.current) {
        refresh();
        startPolling();
      }
      return () => {
        isFocusedRef.current = false;
        stopPolling();
      };
    }, [refresh, startPolling, stopPolling]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      isActiveRef.current = nextState === 'active';
      if (nextState === 'active' && isFocusedRef.current && enabledRef.current) {
        refresh();
        startPolling();
      } else if (nextState !== 'active') {
        stopPolling();
      }
    });
    return () => sub.remove();
  }, [refresh, startPolling, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return { activityStatus, refresh };
}
