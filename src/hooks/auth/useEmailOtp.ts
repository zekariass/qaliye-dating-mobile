import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase';

type AuthMutation<T> = {
  mutateAsync: (vars: T) => Promise<void>;
  isPending: boolean;
  error: Error | null;
};

export function useEmailOtp() {
  const [verifyPending, setVerifyPending] = useState(false);
  const [verifyError, setVerifyError] = useState<Error | null>(null);
  const [resendPending, setResendPending] = useState(false);
  const [resendError, setResendError] = useState<Error | null>(null);

  const verifyOtp = useCallback(async ({ email, token }: { email: string; token: string }) => {
    setVerifyPending(true);
    setVerifyError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      if (error) throw error;
    } catch (e) {
      console.error('[useEmailOtp] verifyOtp error:', (e as Error).message);
      setVerifyError(e as Error);
      throw e;
    } finally {
      setVerifyPending(false);
    }
  }, []);

  const resendOtp = useCallback(async (email: string) => {
    setResendPending(true);
    setResendError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
    } catch (e) {
      console.error('[useEmailOtp] resendOtp error:', (e as Error).message);
      setResendError(e as Error);
      throw e;
    } finally {
      setResendPending(false);
    }
  }, []);

  return {
    verifyOtp: { mutateAsync: verifyOtp, isPending: verifyPending, error: verifyError } as AuthMutation<{ email: string; token: string }>,
    resendOtp: { mutateAsync: resendOtp, isPending: resendPending, error: resendError } as AuthMutation<string>,
  };
}
