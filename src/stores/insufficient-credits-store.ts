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
  /** True when the error was a 429 LIMIT_EXCEEDED (quota exhausted), not a 402
   *  insufficient-credits. Used by the modal to pick the correct cost to show
   *  even when cached entitlements are stale. */
  isLimitExceeded: boolean;
  /** Value of apply_credit_after_limit from the entitlements costs map at the
   *  time the error occurred. When true, credits can buy more after the free
   *  quota is exhausted → modal should show actual_credit_cost. */
  applyCreditAfterLimit: boolean;
  /** Server-provided "needed" credits from 402 insufficient_credits error
   *  details. When present, the modal uses this instead of client-side calculation. */
  serverNeeded: number | null;
  /** Server-provided "balance" from 402 insufficient_credits error details. */
  serverBalance: number | null;
  show: (payload: {
    actionCode?: string | null;
    title?: string | null;
    message?: string;
    retryConfig?: unknown;
    isLimitExceeded?: boolean;
    applyCreditAfterLimit?: boolean;
    serverNeeded?: number | null;
    serverBalance?: number | null;
  }) => void;
  dismiss: () => void;
};

export const useInsufficientCreditsStore = create<InsufficientCreditsStore>((set, get) => ({
  visible: false,
  actionCode: null,
  title: null,
  message: '',
  retryConfig: null,
  isLimitExceeded: false,
  applyCreditAfterLimit: false,
  serverNeeded: null,
  serverBalance: null,
  show: (payload) => {
    if (get().visible) return;
    set({
      visible: true,
      actionCode: payload.actionCode ?? null,
      title: payload.title ?? null,
      message: payload.message ?? '',
      retryConfig: payload.retryConfig ?? null,
      isLimitExceeded: payload.isLimitExceeded ?? false,
      applyCreditAfterLimit: payload.applyCreditAfterLimit ?? false,
      serverNeeded: payload.serverNeeded ?? null,
      serverBalance: payload.serverBalance ?? null,
    });
  },
  dismiss: () =>
    set({
      visible: false,
      actionCode: null,
      title: null,
      message: '',
      retryConfig: null,
      isLimitExceeded: false,
      applyCreditAfterLimit: false,
      serverNeeded: null,
      serverBalance: null,
    }),
}));
