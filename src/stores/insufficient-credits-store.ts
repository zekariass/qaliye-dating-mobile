import { create } from 'zustand';

type InsufficientCreditsStore = {
  visible: boolean;
  message: string;
  show: (message: string) => void;
  dismiss: () => void;
};

export const useInsufficientCreditsStore = create<InsufficientCreditsStore>((set, get) => ({
  visible: false,
  message: '',
  show: (message: string) => {
    if (get().visible) return;
    set({ visible: true, message });
  },
  dismiss: () => set({ visible: false, message: '' }),
}));
