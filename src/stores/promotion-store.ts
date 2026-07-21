import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const SHOW_COOLDOWN_MS = 30 * 60 * 1000; // 30 min between repeat displays of same campaign
const DISMISS_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 h after user taps "Not now"

type CampaignState = {
  lastShownAt: number;
  dismissedUntil: number | null;
};

type PromotionStore = {
  presentations: Record<string, CampaignState>;
  recordShown: (campaignKey: string) => void;
  recordDismissed: (campaignKey: string) => void;
  canShow: (campaignKey: string) => boolean;
};

export const usePromotionStore = create<PromotionStore>()(
  persist(
    (set, get) => ({
      presentations: {},

      recordShown: (campaignKey) => {
        set((state) => ({
          presentations: {
            ...state.presentations,
            [campaignKey]: {
              lastShownAt: Date.now(),
              dismissedUntil:
                state.presentations[campaignKey]?.dismissedUntil ?? null,
            },
          },
        }));
      },

      recordDismissed: (campaignKey) => {
        set((state) => ({
          presentations: {
            ...state.presentations,
            [campaignKey]: {
              lastShownAt:
                state.presentations[campaignKey]?.lastShownAt ?? Date.now(),
              dismissedUntil: Date.now() + DISMISS_COOLDOWN_MS,
            },
          },
        }));
      },

      canShow: (campaignKey) => {
        const p = get().presentations[campaignKey];
        if (!p) return true;
        const now = Date.now();
        if (p.dismissedUntil != null && now < p.dismissedUntil) return false;
        if (now - p.lastShownAt < SHOW_COOLDOWN_MS) return false;
        return true;
      },
    }),
    {
      name: 'qaliye-promotion-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
