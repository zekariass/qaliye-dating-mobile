import * as AppleAuthentication from 'expo-apple-authentication';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { supabase } from '@/lib/supabase';

type AuthMutation = {
  mutateAsync: () => Promise<void>;
  isPending: boolean;
  error: Error | null;
};

export function useSocialAuth() {
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState<Error | null>(null);
  const [applePending, setApplePending] = useState(false);
  const [appleError, setAppleError] = useState<Error | null>(null);

  const google = useCallback(async () => {
    setGooglePending(true);
    setGoogleError(null);
    try {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
      });
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      const idToken = (result as any).idToken ?? (result as any).data?.idToken;
      if (!idToken) throw new Error('Google sign-in failed: no idToken returned');
      // Revoke access + sign out AFTER obtaining the token so that:
      // (a) revokeAccess succeeds while we're still signed in to the SDK, and
      // (b) the next signIn() call always shows the account picker.
      try { await GoogleSignin.revokeAccess(); } catch { /* ignore */ }
      await GoogleSignin.signOut();
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) throw error;
    } catch (e) {
      setGoogleError(e as Error);
      /* error stays in state; UI shows it inline */
    } finally {
      setGooglePending(false);
    }
  }, []);

  const apple = useCallback(async () => {
    setApplePending(true);
    setAppleError(null);
    if (Platform.OS !== 'ios') {
      const err = new Error('Apple Sign-In is only available on iOS');
      setAppleError(err);
      setApplePending(false);
      throw err;
    }
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        throw new Error(
          'Apple Sign-In is not available. Make sure you are signed into an Apple Account in the Simulator (Settings > Mail > Accounts > Add Apple ID) and that the app was built with the Sign in with Apple entitlement.',
        );
      }
      const rawNonce = randomUUID();
      const hashedNonce = await digestStringAsync(
        CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) throw new Error('Apple sign-in failed');
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });
      if (error) throw error;
    } catch (e) {
      setAppleError(e as Error);
      /* error stays in state; UI shows it inline */
    } finally {
      setApplePending(false);
    }
  }, []);

  return {
    google: { mutateAsync: google, isPending: googlePending, error: googleError } as AuthMutation,
    apple: { mutateAsync: apple, isPending: applePending, error: appleError } as AuthMutation,
  };
}
