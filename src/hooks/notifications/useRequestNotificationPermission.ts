import { useCallback } from 'react';
import { Platform } from 'react-native';

import { useNotificationPermission } from './useNotificationPermission';

export function useRequestNotificationPermission() {
  const { status, requestPermission } = useNotificationPermission();

  const request = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    if (status === 'denied') return false;
    if (status === 'granted') return true;

    return requestPermission();
  }, [status, requestPermission]);

  return { status, request };
}
