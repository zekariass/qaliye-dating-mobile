import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase';

type Mutation<T = void> = {
  mutateAsync: (vars: T) => Promise<void>;
  isPending: boolean;
  error: Error | null;
};

export function useForgotPassword() {
  const [requestPending, setRequestPending] = useState(false);
  const [requestError, setRequestError] = useState<Error | null>(null);
  const [updatePending, setUpdatePending] = useState(false);
  const [updateError, setUpdateError] = useState<Error | null>(null);

  const requestReset = useCallback(async (email: string) => {
    setRequestPending(true);
    setRequestError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'qaliyemobile://callback',
      });
      if (error) throw error;
    } catch (e) {
      setRequestError(e as Error);
      throw e;
    } finally {
      setRequestPending(false);
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    setUpdatePending(true);
    setUpdateError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    } catch (e) {
      setUpdateError(e as Error);
      throw e;
    } finally {
      setUpdatePending(false);
    }
  }, []);

  return {
    requestReset: {
      mutateAsync: requestReset,
      isPending: requestPending,
      error: requestError,
    } as Mutation<string>,
    updatePassword: {
      mutateAsync: updatePassword,
      isPending: updatePending,
      error: updateError,
    } as Mutation<string>,
  };
}
