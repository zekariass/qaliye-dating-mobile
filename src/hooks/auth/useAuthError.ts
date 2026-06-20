import { useCallback } from 'react';

export function useAuthError() {
  return useCallback((error: Error | null | undefined): string | null => {
    if (!error) return null;
    const msg = error.message.toLowerCase();
    console.log('[useAuthError] raw message:', error.message);
    if (msg.includes('invalid login credentials')) return 'auth.loginError';
    if (msg.includes('email not confirmed')) return 'auth.loginError';
    if (msg.includes('user already registered')) return 'auth.signupError';
    if (msg.includes('rate limit')) return 'auth.loginError';
    if (msg.includes('weak password')) return 'auth.signupError';
    if (msg.includes('sign up')) return 'auth.signupError';
    if (msg.includes('sign in')) return 'auth.loginError';
    if (msg.includes('api key')) return 'auth.loginError';
    if (msg.includes('jwt')) return 'auth.loginError';
    if (msg.includes('network')) return 'auth.loginError';
    if (msg.includes('fetch')) return 'auth.loginError';
    return 'auth.loginError';
  }, []);
}
