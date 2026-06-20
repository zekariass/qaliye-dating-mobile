import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase';

type AuthMutation<T> = {
  mutateAsync: (vars: T) => Promise<void>;
  isPending: boolean;
  error: Error | null;
};

export function useEmailAuth() {
  const [loginPending, setLoginPending] = useState(false);
  const [loginError, setLoginError] = useState<Error | null>(null);
  const [signupPending, setSignupPending] = useState(false);
  const [signupError, setSignupError] = useState<Error | null>(null);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    setLoginPending(true);
    setLoginError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e) {
      console.error('[useEmailAuth] login error:', (e as Error).message);
      setLoginError(e as Error);
      throw e;
    } finally {
      setLoginPending(false);
    }
  }, []);

  const signup = useCallback(async ({ email, password }: { email: string; password: string }) => {
    setSignupPending(true);
    setSignupError(null);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    } catch (e) {
      console.error('[useEmailAuth] signup error:', (e as Error).message);
      setSignupError(e as Error);
      throw e;
    } finally {
      setSignupPending(false);
    }
  }, []);

  return {
    login: { mutateAsync: login, isPending: loginPending, error: loginError } as AuthMutation<{ email: string; password: string }>,
    signup: { mutateAsync: signup, isPending: signupPending, error: signupError } as AuthMutation<{ email: string; password: string }>,
  };
}
