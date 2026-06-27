import { create } from 'zustand';

interface ActivityStoreState {
  showActivityStatus: boolean;
  setShowActivityStatus: (v: boolean) => void;
}

export const useActivityStore = create<ActivityStoreState>((set) => ({
  showActivityStatus: true,
  setShowActivityStatus: (v) => set({ showActivityStatus: v }),
}));
