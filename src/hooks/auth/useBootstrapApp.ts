import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useMeStore } from '@/stores/me-store';

export type BootstrapResult = {
  isBootstrapping: boolean;
  hasActiveSession: boolean;
};

export function useBootstrapApp(): BootstrapResult {
  const clearMe = useMeStore((s) => s.clearMe);

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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        clearMe();
      }
      setState((prev) => ({ ...prev, isBootstrapping: false, hasActiveSession: !!session }));
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [clearMe]);

  return state;
}
