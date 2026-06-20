import { create } from 'zustand';

import { fetchMe as apiFetchMe } from '@/api/meApi';
import { MeResponse } from '@/types/api';

type MeStatus = 'idle' | 'loading' | 'success' | 'error';

type MeState = {
  data: MeResponse | null;
  status: MeStatus;
  error: string | null;
  fetchMe: () => Promise<void>;
  clearMe: () => void;
  markOnboarded: () => void;
};

export const useMeStore = create<MeState>((set, get) => ({
  data: null,
  status: 'idle',
  error: null,

  fetchMe: async () => {
    if (get().status === 'loading') return;
    set({ status: 'loading', error: null });
    try {
      const data = await apiFetchMe();
      set({ data, status: 'success' });
    } catch (e) {
      set({ status: 'error', error: (e as Error).message });
    }
  },

  clearMe: () => set({ data: null, status: 'idle', error: null }),

  markOnboarded: () => {
    const prev = get();
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
