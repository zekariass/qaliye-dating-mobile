import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Hook — returns the current authenticated user's ID
// ---------------------------------------------------------------------------

export function useCurrentUserId(): string | undefined {
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  return userId;
}
