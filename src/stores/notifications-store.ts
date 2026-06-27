import { create } from 'zustand';

import type { ForegroundBannerState, ValidatedNavIntent } from '@/types/notifications';

type NotificationsState = {
  systemPermissionGranted: boolean | null;
  pendingNavIntent: ValidatedNavIntent | null;
  lastHandledNotificationId: string | null;
  foregroundBanner: ForegroundBannerState | null;

  setSystemPermissionGranted: (granted: boolean) => void;
  setPendingNavIntent: (intent: ValidatedNavIntent | null) => void;
  setLastHandledNotificationId: (id: string) => void;
  setForegroundBanner: (banner: ForegroundBannerState | null) => void;
  dismissForegroundBanner: () => void;
};

export const useNotificationsStore = create<NotificationsState>((set) => ({
  systemPermissionGranted: null,
  pendingNavIntent: null,
  lastHandledNotificationId: null,
  foregroundBanner: null,

  setSystemPermissionGranted: (granted) => set({ systemPermissionGranted: granted }),
  setPendingNavIntent: (intent) => set({ pendingNavIntent: intent }),
  setLastHandledNotificationId: (id) => set({ lastHandledNotificationId: id }),
  setForegroundBanner: (banner) => set({ foregroundBanner: banner }),
  dismissForegroundBanner: () => set({ foregroundBanner: null }),
}));
