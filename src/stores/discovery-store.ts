import { create } from 'zustand';

export type DiscoveryViewMode = 'swipe' | 'browse';

interface DiscoveryStoreState {
  viewMode: DiscoveryViewMode;
  setViewMode: (v: DiscoveryViewMode) => void;
}

export const useDiscoveryStore = create<DiscoveryStoreState>((set) => ({
  viewMode: 'swipe',
  setViewMode: (v) => set({ viewMode: v }),
}));
