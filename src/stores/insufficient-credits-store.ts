import { create } from 'zustand';

type InsufficientCreditsStore = {
  visible: boolean;
  /** Action code from the failed request, e.g. "LIKE" or "SEE_WHO_LIKED_YOU". */
  actionCode: string | null;
  /** Override title for the modal. */
  title: string | null;
  /** Optional fallback message from the server. */
  message: string;
  /** Original axios request config so the action can be retried after a refresh. */
  retryConfig: unknown;
  show: (payload: {
    actionCode?: string | null;
    title?: string | null;
    message?: string;
    retryConfig?: unknown;
  }) => void;
  dismiss: () => void;
};

export const useInsufficientCreditsStore = create<InsufficientCreditsStore>((set, get) => ({
  visible: false,
  actionCode: null,
  title: null,
  message: '',
  retryConfig: null,
  show: (payload) => {
    if (get().visible) return;
    set({
      visible: true,
      actionCode: payload.actionCode ?? null,
      title: payload.title ?? null,
      message: payload.message ?? '',
      retryConfig: payload.retryConfig ?? null,
    });
  },
  dismiss: () =>
    set({
      visible: false,
      actionCode: null,
      title: null,
      message: '',
      retryConfig: null,
    }),
}));
