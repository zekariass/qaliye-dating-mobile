// ---------------------------------------------------------------------------
// App Update Store
// ---------------------------------------------------------------------------
//
// Central state for the app-update-checking system.
//
//  Persisted (AsyncStorage):
//    dismissedOptionalVersion — the latest_version the user last dismissed so
//    we don't repeat the optional prompt for the same version.
//
//  Transient (in-memory only):
//    Everything else — reset on each app launch.
// ---------------------------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { UpdateDecision } from '@/utils/semver';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum milliseconds between successive update checks (5 minutes). */
export const UPDATE_CHECK_THROTTLE_MS = 5 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'no-update'
  | 'optional-update'
  | 'mandatory-update';

type AppUpdateStore = {
  // ── Transient state ──────────────────────────────────────────────────────
  status: UpdateStatus;
  storeUrl: string | null;
  latestVersion: string | null;
  /** Whether the update prompt modal should currently be shown. */
  isPromptVisible: boolean;
  /** Guard against concurrent duplicate requests. */
  isCheckInProgress: boolean;
  /** Unix timestamp (ms) of the last successful check — used for throttling. */
  lastCheckedAt: number | null;

  // ── Persisted state ──────────────────────────────────────────────────────
  /**
   * The optional-update version the user last dismissed.
   * We hide the optional prompt while latest_version === this value.
   * Cleared automatically when a newer latest_version is available.
   */
  dismissedOptionalVersion: string | null;

  // ── Actions ──────────────────────────────────────────────────────────────
  setStatus: (status: UpdateStatus) => void;
  setStoreUrl: (url: string | null) => void;
  setLatestVersion: (version: string | null) => void;
  setIsPromptVisible: (visible: boolean) => void;
  setIsCheckInProgress: (inProgress: boolean) => void;
  setLastCheckedAt: (ts: number) => void;
  setDismissedOptionalVersion: (version: string | null) => void;

  /** Returns true when the last check was recent enough to skip a new one. */
  shouldThrottle: () => boolean;

  /**
   * Apply the result of a completed version check.
   * Returns the UpdateDecision so callers can decide whether to show a prompt.
   */
  applyCheckResult: (params: {
    decision: UpdateDecision;
    storeUrl: string;
    latestVersion: string;
  }) => { shouldShowPrompt: boolean };
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppUpdateStore = create<AppUpdateStore>()(
  persist(
    (set, get) => ({
      // Transient defaults
      status: 'idle',
      storeUrl: null,
      latestVersion: null,
      isPromptVisible: false,
      isCheckInProgress: false,
      lastCheckedAt: null,

      // Persisted defaults
      dismissedOptionalVersion: null,

      // ── Simple setters ───────────────────────────────────────────────────

      setStatus: (status) => set({ status }),
      setStoreUrl: (url) => set({ storeUrl: url }),
      setLatestVersion: (version) => set({ latestVersion: version }),
      setIsPromptVisible: (visible) => set({ isPromptVisible: visible }),
      setIsCheckInProgress: (inProgress) => set({ isCheckInProgress: inProgress }),
      setLastCheckedAt: (ts) => set({ lastCheckedAt: ts }),
      setDismissedOptionalVersion: (version) => set({ dismissedOptionalVersion: version }),

      // ── Derived helpers ──────────────────────────────────────────────────

      shouldThrottle: () => {
        const { lastCheckedAt } = get();
        return lastCheckedAt !== null && Date.now() - lastCheckedAt < UPDATE_CHECK_THROTTLE_MS;
      },

      applyCheckResult: ({ decision, storeUrl, latestVersion }) => {
        const { dismissedOptionalVersion } = get();

        set({
          status: decision,
          storeUrl,
          latestVersion,
          lastCheckedAt: Date.now(),
        });

        if (decision === 'mandatory-update') {
          return { shouldShowPrompt: true };
        }

        if (decision === 'optional-update') {
          // Suppress the prompt when the user already dismissed this specific version.
          const alreadyDismissed = dismissedOptionalVersion === latestVersion;
          return { shouldShowPrompt: !alreadyDismissed };
        }

        // no-update: hide any stale prompt
        set({ isPromptVisible: false });
        return { shouldShowPrompt: false };
      },
    }),
    {
      name: 'qaliye-app-update-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the dismissal tracking — everything else resets on launch.
      partialize: (state) => ({
        dismissedOptionalVersion: state.dismissedOptionalVersion,
      }),
    },
  ),
);
