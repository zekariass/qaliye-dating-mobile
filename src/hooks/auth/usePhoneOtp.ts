import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase';

type AuthMutation<T> = {
  mutateAsync: (vars: T) => Promise<void>;
  isPending: boolean;
  error: Error | null;
};

export function usePhoneOtp() {
  const [sendPending, setSendPending] = useState(false);
  const [sendError, setSendError] = useState<Error | null>(null);
  const [verifyPending, setVerifyPending] = useState(false);
  const [verifyError, setVerifyError] = useState<Error | null>(null);

  const sendCode = useCallback(async (phone: string) => {
    setSendPending(true);
    setSendError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: `+251${phone}` });
      if (error) throw error;
    } catch (e) {
      console.error('[usePhoneOtp] sendCode error:', (e as Error).message);
      setSendError(e as Error);
      /* error stays in state; UI shows it inline */
    } finally {
      setSendPending(false);
    }
  }, []);

  const verifyCode = useCallback(async ({ phone, code }: { phone: string; code: string }) => {
    setVerifyPending(true);
    setVerifyError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: `+251${phone}`,
        token: code,
        type: 'sms',
      });
      if (error) throw error;
    } catch (e) {
      console.error('[usePhoneOtp] verifyCode error:', (e as Error).message);
      setVerifyError(e as Error);
      /* error stays in state; UI shows it inline */
    } finally {
      setVerifyPending(false);
    }
  }, []);

  return {
    sendCode: { mutateAsync: sendCode, isPending: sendPending, error: sendError } as AuthMutation<string>,
    verifyCode: { mutateAsync: verifyCode, isPending: verifyPending, error: verifyError } as AuthMutation<{ phone: string; code: string }>,
  };
}
