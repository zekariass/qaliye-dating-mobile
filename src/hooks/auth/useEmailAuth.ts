import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase';

type AuthMutation<T, R = void> = {
  mutateAsync: (vars: T) => Promise<R>;
  isPending: boolean;
  error: Error | null;
};

type SignupResult = { needsConfirmation: boolean };

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

  const signup = useCallback(async ({ email, password }: { email: string; password: string }): Promise<SignupResult> => {
    setSignupPending(true);
    setSignupError(null);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      // Session created immediately (email confirmation disabled in Supabase).
      if (data.session) {
        return { needsConfirmation: false };
      }

      // No session returned — attempt an immediate sign-in so the user is
      // logged in right away without requiring email confirmation.
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInError) {
        // onAuthStateChange will fire with the new session, triggering redirect.
        return { needsConfirmation: false };
      }

      // sign-in failed (email confirmation genuinely required)
      return { needsConfirmation: true };
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
    signup: { mutateAsync: signup, isPending: signupPending, error: signupError } as AuthMutation<{ email: string; password: string }, SignupResult>,
  };
}
