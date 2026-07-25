import { useCallback } from 'react';

export function useAuthError() {
  return useCallback((error: Error | null | undefined): string | null => {
    if (!error) return null;
    const msg = error.message.toLowerCase();
    if (msg.includes('user already registered')) return 'This email is already registered. Try logging in with Google or your password.';
    if (msg.includes('invalid login credentials')) return 'Invalid email or password.';
    if (msg.includes('email not confirmed')) return 'Please confirm your email before logging in.';
    if (msg.includes('weak password') || msg.includes('password should be at least')) return 'Password must be at least 6 characters.';
    if (msg.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.';
    if (msg.includes('api key') || msg.includes('jwt')) return 'Authentication configuration error. Please contact support.';
    if (msg.includes('network') || msg.includes('fetch')) return 'Network error. Check your internet connection and try again.';
    return error.message;
  }, []);
}
