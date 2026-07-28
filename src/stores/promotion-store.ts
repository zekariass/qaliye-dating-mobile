import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ─── Per-campaign record (persisted per user+campaign) ───────────────────────
export type CampaignRecord = {
  lastShownAt: string | null;      // ISO UTC
  lastDismissedAt: string | null;  // ISO UTC
  dismissalCount: number;
  permanentlyHidden: boolean;
  claimedOrRedeemed: boolean;
};

const DEFAULT_RECORD: CampaignRecord = {
  lastShownAt: null,
  lastDismissedAt: null,
  dismissalCount: 0,
  permanentlyHidden: false,
  claimedOrRedeemed: false,
};

// ─── In-memory state (not persisted, reset on process start) ─────────────────
const _sessionShown = new Map<string, Set<string>>(); // userId → Set<campaignKey>
let _displayLockHeld = false;

// ─── Store types ─────────────────────────────────────────────────────────────
type PersistedState = {
  records: Record<string, CampaignRecord>; // key: `${userId}:${campaignKey}`
};

type PromotionStore = PersistedState & {
  getRecord: (userId: string, campaignKey: string) => CampaignRecord;
  recordShown: (userId: string, campaignKey: string) => void;
  recordExplicitDismissal: (userId: string, campaignKey: string) => void;
  markClaimedOrRedeemed: (userId: string, campaignKey: string) => void;
  markPermanentlyHidden: (userId: string, campaignKey: string) => void;
  isShownThisSession: (userId: string, campaignKey: string) => boolean;
  markShownThisSession: (userId: string, campaignKey: string) => void;
  clearSessionForUser: (userId: string) => void;
  acquireDisplayLock: () => boolean;
  releaseDisplayLock: () => void;
  isDisplayLockHeld: () => boolean;
};

function storeKey(userId: string, campaignKey: string): string {
  return `${userId}:${campaignKey}`;
}

export const usePromotionStore = create<PromotionStore>()(
  persist(
    (set, get) => ({
      records: {},

      getRecord: (userId, campaignKey) =>
        get().records[storeKey(userId, campaignKey)] ?? { ...DEFAULT_RECORD },

      recordShown: (userId, campaignKey) => {
        const key = storeKey(userId, campaignKey);
        set((state) => ({
          records: {
            ...state.records,
            [key]: {
              ...(state.records[key] ?? { ...DEFAULT_RECORD }),
              lastShownAt: new Date().toISOString(),
            },
          },
        }));
      },

      recordExplicitDismissal: (userId, campaignKey) => {
        const key = storeKey(userId, campaignKey);
        set((state) => {
          const existing = state.records[key] ?? { ...DEFAULT_RECORD };
          return {
            records: {
              ...state.records,
              [key]: {
                ...existing,
                lastDismissedAt: new Date().toISOString(),
                dismissalCount: existing.dismissalCount + 1,
              },
            },
          };
        });
      },

      markClaimedOrRedeemed: (userId, campaignKey) => {
        const key = storeKey(userId, campaignKey);
        set((state) => ({
          records: {
            ...state.records,
            [key]: {
              ...(state.records[key] ?? { ...DEFAULT_RECORD }),
              claimedOrRedeemed: true,
            },
          },
        }));
      },

      markPermanentlyHidden: (userId, campaignKey) => {
        const key = storeKey(userId, campaignKey);
        set((state) => ({
          records: {
            ...state.records,
            [key]: {
              ...(state.records[key] ?? { ...DEFAULT_RECORD }),
              permanentlyHidden: true,
            },
          },
        }));
      },

      isShownThisSession: (userId, campaignKey) =>
        _sessionShown.get(userId)?.has(campaignKey) ?? false,

      markShownThisSession: (userId, campaignKey) => {
        if (!_sessionShown.has(userId)) _sessionShown.set(userId, new Set());
        _sessionShown.get(userId)!.add(campaignKey);
      },

      clearSessionForUser: (userId) => {
        _sessionShown.delete(userId);
        _displayLockHeld = false;
      },

      acquireDisplayLock: () => {
        if (_displayLockHeld) return false;
        _displayLockHeld = true;
        return true;
      },

      releaseDisplayLock: () => { _displayLockHeld = false; },

      isDisplayLockHeld: () => _displayLockHeld,
    }),
    {
      name: 'qaliye-promotion-store-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ records: state.records }),
    },
  ),
);
