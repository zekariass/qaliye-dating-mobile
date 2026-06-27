import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { postHeartbeat } from '@/api/activity/activityApi';
import { ACTIVITY_HEARTBEAT_INTERVAL_MS } from '@/constants/activity';
import { supabase } from '@/lib/supabase';
import { useActivityStore } from '@/stores/activity-store';

interface Options {
  enabled?: boolean;
}

export function useHeartbeat({ enabled = true }: Options = {}) {
  const setShowActivityStatus = useActivityStore((s) => s.setShowActivityStatus);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const sendHeartbeat = useCallback(async () => {
    if (!enabledRef.current) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const res = await postHeartbeat();
      setShowActivityStatus(res.show_activity_status);
    } catch {
      // Silent – never block UI or surface heartbeat errors to the user
    }
  }, [setShowActivityStatus]);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(sendHeartbeat, ACTIVITY_HEARTBEAT_INTERVAL_MS);
  }, [sendHeartbeat]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    sendHeartbeat();
    startInterval();

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (nextState === 'active' && prev !== 'active') {
        sendHeartbeat();
        startInterval();
      } else if (nextState !== 'active') {
        stopInterval();
      }
    });

    return () => {
      stopInterval();
      subscription.remove();
    };
  }, [sendHeartbeat, startInterval, stopInterval]);
}
