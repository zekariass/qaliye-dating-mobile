import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { batchFetchStatuses } from '@/api/activity/activityApi';
import { ACTIVITY_STATUS_REFRESH_INTERVAL_MS } from '@/constants/activity';
import type { ActivityStatus } from '@/types/activity';

/**
 * Polls `POST /api/v1/activity/statuses` every 90 s while the screen is focused
 * and the app is in the foreground.
 *
 * statusMap values:
 *   - Key absent        → not yet refreshed; callers should fall back to the initial API value
 *   - null              → server omitted this ID (privacy/block); display nothing
 *   - ActivityStatus    → use this value
 */
export function useActivityStatuses(visibleUserIds: string[]) {
  const [statusMap, setStatusMap] = useState<Record<string, ActivityStatus | null>>({});
  const isActiveRef = useRef(AppState.currentState === 'active');
  const isFocusedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visibleIdsRef = useRef(visibleUserIds);
  visibleIdsRef.current = visibleUserIds;

  const refresh = useCallback(async () => {
    const ids = visibleIdsRef.current;
    if (ids.length === 0) return;
    try {
      const res = await batchFetchStatuses(ids);
      setStatusMap((prev) => {
        const next = { ...prev };
        for (const id of ids) {
          const found = res.items.find((item) => item.user_id === id);
          next[id] = found ? found.activity_status : null;
        }
        return next;
      });
    } catch {
      // Keep last known statuses on failure – do not clear them
    }
  }, []);

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (isActiveRef.current && isFocusedRef.current) refresh();
    }, ACTIVITY_STATUS_REFRESH_INTERVAL_MS);
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
      if (isActiveRef.current) {
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
      if (nextState === 'active' && isFocusedRef.current) {
        refresh();
        startPolling();
      } else if (nextState !== 'active') {
        stopPolling();
      }
    });
    return () => sub.remove();
  }, [refresh, startPolling, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  /**
   * Returns the effective status for a user:
   * - After first refresh: statusMap value (null → no indicator)
   * - Before first refresh: initialStatus (from original API response)
   */
  const getStatus = useCallback(
    (userId: string, initialStatus?: ActivityStatus | null): ActivityStatus | null | undefined => {
      if (userId in statusMap) return statusMap[userId];
      return initialStatus;
    },
    [statusMap],
  );

  return { statusMap, getStatus };
}
