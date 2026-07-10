import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { normalizeEthiopianPhone } from '@/utils/phone';

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

  /**
   * Accepts any Ethiopian phone format (e.g. 0912345678 / 912345678 / +251912345678).
   * Normalizes to E.164 before calling Supabase.
   */
  const sendCode = useCallback(async (phone: string) => {
    setSendPending(true);
    setSendError(null);
    try {
      const normalized = normalizeEthiopianPhone(phone);
      if (!normalized) {
        throw new Error('invalid_ethiopian_phone');
      }
      const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
      if (error) {
        console.error('[usePhoneOtp] signInWithOtp error:', error.message, error);
        throw error;
      }
    } catch (e) {
      setSendError(e as Error);
      throw e;
    } finally {
      setSendPending(false);
    }
  }, []);

  /**
   * phone: raw input or already-normalized E.164 — both are accepted.
   * code: the 6-digit OTP sent by Supabase.
   */
  const verifyCode = useCallback(async ({ phone, code }: { phone: string; code: string }) => {
    setVerifyPending(true);
    setVerifyError(null);
    try {
      const normalized = normalizeEthiopianPhone(phone);
      if (!normalized) {
        throw new Error('invalid_ethiopian_phone');
      }
      const { error } = await supabase.auth.verifyOtp({
        phone: normalized,
        token: code,
        type: 'sms',
      });
      if (error) throw error;
    } catch (e) {
      setVerifyError(e as Error);
      throw e;
    } finally {
      setVerifyPending(false);
    }
  }, []);

  return {
    sendCode: { mutateAsync: sendCode, isPending: sendPending, error: sendError } as AuthMutation<string>,
    verifyCode: { mutateAsync: verifyCode, isPending: verifyPending, error: verifyError } as AuthMutation<{ phone: string; code: string }>,
  };
}
