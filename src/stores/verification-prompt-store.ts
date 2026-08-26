import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VerificationPromptRecord = {
  /** How many times the prompt has been shown. */
  identity_verification_prompt_count: number;
  /** ISO UTC timestamp of the most recent prompt. */
  identity_verification_last_prompted_at: string | null;
  /** ISO UTC timestamp when the prompt may next be shown.
   *  `null` means "due immediately" (no prompt has been shown yet). */
  identity_verification_next_prompt_at: string | null;
};

// ─── Schedule ─────────────────────────────────────────────────────────────────
// Interval (in days) after each successive prompt, indexed by prompt count
// at the time the prompt was shown (0-based).
//
//  After 1st show (count=0 → 1): wait 3 days
//  After 2nd show (count=1 → 2): wait 7 days
//  After 3rd show (count=2 → 3): wait 14 days
//  After 4th+ show (count≥3):    wait 30 days
const INTERVAL_DAYS = [3, 7, 14, 30] as const;

function nextIntervalDays(countBeforeShow: number): number {
  return INTERVAL_DAYS[Math.min(countBeforeShow, INTERVAL_DAYS.length - 1)];
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

const DEFAULT_RECORD: VerificationPromptRecord = {
  identity_verification_prompt_count: 0,
  identity_verification_last_prompted_at: null,
  identity_verification_next_prompt_at: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

type PersistedState = {
  /** Records keyed by userId. */
  records: Record<string, VerificationPromptRecord>;
};

type VerificationPromptStore = PersistedState & {
  getRecord: (userId: string) => VerificationPromptRecord;
  /** Returns true when the prompt is eligible to be shown for this user. */
  isDue: (userId: string) => boolean;
  /** Call after showing the prompt. Increments count and schedules next prompt. */
  recordShown: (userId: string) => void;
};

export const useVerificationPromptStore = create<VerificationPromptStore>()(
  persist(
    (set, get) => ({
      records: {},

      getRecord: (userId) => get().records[userId] ?? { ...DEFAULT_RECORD },

      isDue: (userId) => {
        const r = get().records[userId] ?? { ...DEFAULT_RECORD };
        // Never shown: due immediately.
        if (r.identity_verification_next_prompt_at === null) return true;
        return new Date() >= new Date(r.identity_verification_next_prompt_at);
      },

      recordShown: (userId) => {
        const r = get().records[userId] ?? { ...DEFAULT_RECORD };
        const now = new Date();
        const days = nextIntervalDays(r.identity_verification_prompt_count);
        set((state) => ({
          records: {
            ...state.records,
            [userId]: {
              identity_verification_prompt_count:
                r.identity_verification_prompt_count + 1,
              identity_verification_last_prompted_at: now.toISOString(),
              identity_verification_next_prompt_at: addDays(now, days).toISOString(),
            },
          },
        }));
      },
    }),
    {
      name: 'qaliye-verification-prompt-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ records: state.records }),
    },
  ),
);
