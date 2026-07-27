import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { ForegroundBannerState, ValidatedNavIntent } from '@/types/notifications';

const SOUND_ENABLED_KEY = 'qaliye_notification_sound_enabled';

type NotificationsState = {
  systemPermissionGranted: boolean | null;
  pendingNavIntent: ValidatedNavIntent | null;
  lastHandledNotificationId: string | null;
  foregroundBanner: ForegroundBannerState | null;
  soundEnabled: boolean;

  setSystemPermissionGranted: (granted: boolean) => void;
  setPendingNavIntent: (intent: ValidatedNavIntent | null) => void;
  setLastHandledNotificationId: (id: string) => void;
  setForegroundBanner: (banner: ForegroundBannerState | null) => void;
  dismissForegroundBanner: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  loadSoundPreference: () => Promise<void>;
};

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  systemPermissionGranted: null,
  pendingNavIntent: null,
  lastHandledNotificationId: null,
  foregroundBanner: null,
  soundEnabled: true,

  setSystemPermissionGranted: (granted) => set({ systemPermissionGranted: granted }),
  setPendingNavIntent: (intent) => set({ pendingNavIntent: intent }),
  setLastHandledNotificationId: (id) => set({ lastHandledNotificationId: id }),
  setForegroundBanner: (banner) => set({ foregroundBanner: banner }),
  dismissForegroundBanner: () => set({ foregroundBanner: null }),
  setSoundEnabled: (enabled) => {
    set({ soundEnabled: enabled });
    AsyncStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false').catch(() => {});
  },
  loadSoundPreference: async () => {
    try {
      const value = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
      if (value !== null) {
        set({ soundEnabled: value === 'true' });
      }
    } catch {}
  },
}));
