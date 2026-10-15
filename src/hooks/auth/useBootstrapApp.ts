import { useEffect, useState } from 'react';

import { queryClient } from '@/lib/queryClient';
import {
    clearPasswordRecoveryPending,
    isPasswordRecoveryPending,
    markPasswordRecoveryPending,
} from '@/lib/recoverySession';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/stores/chat-store';
import { useMeStore } from '@/stores/me-store';

export type BootstrapResult = {
  isBootstrapping: boolean;
  hasActiveSession: boolean;
  isPasswordRecovery: boolean;
};

function clearAllSessionState() {
  queryClient.clear();
  useMeStore.getState().clearMe();
  useChatStore.getState().reset();
}

export function useBootstrapApp(): BootstrapResult {
  const [state, setState] = useState<BootstrapResult>({
    isBootstrapping: true,
    hasActiveSession: false,
    isPasswordRecovery: false,
  });

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const recoveryPending = await isPasswordRecoveryPending();
      if (!mounted) return;
      // A stale flag with no session means a previous recovery attempt ended
      // without completing — clear it so the app isn't pinned to the reset screen.
      if (!session && recoveryPending) void clearPasswordRecoveryPending();
      setState((prev) => ({
        ...prev,
        isBootstrapping: false,
        hasActiveSession: !!session,
        isPasswordRecovery: !!session && recoveryPending,
      }));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || !session) {
        clearAllSessionState();
      }
      const isRecovery = event === 'PASSWORD_RECOVERY';
      if (isRecovery) void markPasswordRecoveryPending();
      const wasRecovery = event === 'USER_UPDATED' || event === 'SIGNED_OUT';
      if (wasRecovery) void clearPasswordRecoveryPending();
      setState((prev) => ({
        ...prev,
        isBootstrapping: false,
        hasActiveSession: !!session,
        isPasswordRecovery: isRecovery ? true : wasRecovery ? false : prev.isPasswordRecovery,
      }));
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}
