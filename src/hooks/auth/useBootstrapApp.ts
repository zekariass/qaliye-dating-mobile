import { useEffect, useState } from 'react';

import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/stores/chat-store';
import { useMeStore } from '@/stores/me-store';

export type BootstrapResult = {
  isBootstrapping: boolean;
  hasActiveSession: boolean;
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
  });

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setState({ isBootstrapping: false, hasActiveSession: !!session });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || !session) {
        clearAllSessionState();
      }
      setState((prev) => ({ ...prev, isBootstrapping: false, hasActiveSession: !!session }));
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}
