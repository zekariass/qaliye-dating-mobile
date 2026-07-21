import { create } from 'zustand';

import { fetchMe as apiFetchMe } from '@/api/meApi';
import { MeResponse } from '@/types/api';

type MeStatus = 'idle' | 'loading' | 'success' | 'error';

type MeState = {
  data: MeResponse | null;
  status: MeStatus;
  error: string | null;
  isOnboarded: boolean;
  /** Set to true immediately after successful account deletion so auth.tsx can show the
   *  "Account Deleted" overlay. Intentionally NOT reset by clearMe() so it survives signOut. */
  accountJustDeleted: boolean;
  fetchMe: () => Promise<void>;
  clearMe: () => void;
  markOnboarded: () => void;
  setAccountJustDeleted: (v: boolean) => void;
};

export const useMeStore = create<MeState>((set, get) => ({
  data: null,
  status: 'idle',
  error: null,
  isOnboarded: false,
  accountJustDeleted: false,

  fetchMe: async () => {
    if (get().status === 'loading') return;
    set({ status: 'loading', error: null });
    try {
      const data = await apiFetchMe();
      set({ data, status: 'success', isOnboarded: data.onboarding.is_onboarded });
    } catch (e) {
      set({ status: 'error', error: (e as Error).message });
    }
  },

  clearMe: () => set({ data: null, status: 'idle', error: null, isOnboarded: false }),
  setAccountJustDeleted: (v) => set({ accountJustDeleted: v }),

  markOnboarded: () => {
    const prev = get();
    // Always set the flag regardless of whether meData was loaded successfully.
    // This prevents the redirect loop when fetchMe() failed due to a temporary
    // backend outage but onboarding/status later succeeds.
    set({ isOnboarded: true });
    if (!prev.data) return;
    set({
      data: {
        ...prev.data,
        onboarding: {
          ...prev.data.onboarding,
          is_onboarded: true,
          next_step: 'DONE',
          can_enter_discovery: true,
        },
      },
    });
  },
}));
