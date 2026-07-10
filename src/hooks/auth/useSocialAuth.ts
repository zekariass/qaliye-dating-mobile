import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

// CRITICAL: Must be called at module level so Expo can close the
// browser cleanly when the deep-link redirect fires on Android.
WebBrowser.maybeCompleteAuthSession();

type AuthMutation = {
  mutateAsync: () => Promise<void>;
  isPending: boolean;
  error: Error | null;
};

async function createSessionFromUrl(url: string) {
  console.log('[Facebook] createSessionFromUrl:', url);

  // Parse query params from the URL
  const queryString = url.split('?')[1] ?? '';
  const searchParams = new URLSearchParams(queryString);

  const errorCode = searchParams.get('error');
  if (errorCode) {
    const desc = searchParams.get('error_description') ?? errorCode;
    throw new Error(desc);
  }

  const code = searchParams.get('code');
  if (!code) {
    throw new Error('No auth code found in callback URL');
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[Facebook] exchangeCodeForSession error:', error.message);
    throw error;
  }
  console.log('[Facebook] session established');
  return data.session;
}

export function useSocialAuth() {
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState<Error | null>(null);
  const [applePending, setApplePending] = useState(false);
  const [appleError, setAppleError] = useState<Error | null>(null);
  const [facebookPending, setFacebookPending] = useState(false);
  const [facebookError, setFacebookError] = useState<Error | null>(null);

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
      try {
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        console.log('[Google] id_token aud:', payload.aud, '| iss:', payload.iss, '| exp:', new Date(payload.exp * 1000).toISOString());
      } catch { /* decoding is best-effort */ }
      const _diagUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=id_token`;
      const _diagRes = await fetch(_diagUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        body: JSON.stringify({ provider: 'google', id_token: idToken }),
      });
      const _diagBody = await _diagRes.text();
      console.log('[Google] RAW Supabase response:', _diagRes.status, _diagBody);

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) {
        console.error('[Google] signInWithIdToken error:', error.message, (error as any).status, (error as any).code);
        throw error;
      }
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
      const AppleAuthentication = await import('expo-apple-authentication');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('Apple sign-in failed');
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
    } catch (e) {
      setAppleError(e as Error);
      /* error stays in state; UI shows it inline */
    } finally {
      setApplePending(false);
    }
  }, []);

  const facebook = useCallback(async () => {
    setFacebookPending(true);
    setFacebookError(null);

    try {
      const redirectTo = makeRedirectUri({
        scheme: 'qaliyemobile',
        path: 'callback',
      });
      console.log('[Facebook] redirectTo:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      console.log('[Facebook] OAuth URL:', data?.url, 'error:', error?.message);
      if (error || !data.url) throw error ?? new Error('Facebook sign-in failed');

      if (Platform.OS === 'android') {
        await WebBrowser.warmUpAsync();
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      console.log('[Facebook] browser result type:', result.type, 'url:', (result as any).url ?? 'none');

      // iOS: the browser returns the callback URL directly.
      if (result.type === 'success' && result.url) {
        await createSessionFromUrl(result.url);
        return;
      }

      if (result.type === 'cancel') {
        throw new Error('Facebook sign-in cancelled');
      }

      // Android: Chrome Custom Tabs almost always returns 'dismiss'
      // because the redirect fires a deep link back into the app
      // instead of returning to the browser session.
      // Poll for the session AND actively check Linking for the URL.
      if (Platform.OS === 'android') {
        console.log('[Facebook] polling for session after Android dismiss...');

        let deepLinkUrl: string | null = null;
        let listener: { remove(): void } | null = null;
        const deepLinkPromise = new Promise<string>((resolve) => {
          listener = Linking.addEventListener('url', ({ url }: { url: string }) => {
            if (url && url.startsWith('qaliyemobile://callback')) {
              console.log('[Facebook] deep link event:', url);
              resolve(url);
            }
          });
        });

        for (let i = 0; i < 30; i++) {
          // 1. Check if session already exists (callback screen or root layout handled it)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            (listener as any)?.remove?.();
            console.log('[Facebook] session established via polling');
            return;
          }

          // 2. Check if a deep link URL was captured
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl && initialUrl.startsWith('qaliyemobile://callback')) {
            deepLinkUrl = initialUrl;
            break;
          }

          // 3. Check if event listener caught anything (non-blocking)
          const race = await Promise.race([
            deepLinkPromise,
            new Promise<null>((r) => setTimeout(() => r(null), 1000)),
          ]);
          if (race) {
            deepLinkUrl = race;
            break;
          }
        }

        (listener as any)?.remove?.();

        if (deepLinkUrl) {
          console.log('[Facebook] handling deep link URL:', deepLinkUrl);
          await createSessionFromUrl(deepLinkUrl);
          return;
        }

        throw new Error('Facebook sign-in timed out — no session found');
      }

      throw new Error('Facebook sign-in failed');
    } catch (e) {
      setFacebookError(e as Error);
    } finally {
      setFacebookPending(false);
    }
  }, []);

  return {
    google: { mutateAsync: google, isPending: googlePending, error: googleError } as AuthMutation,
    apple: { mutateAsync: apple, isPending: applePending, error: appleError } as AuthMutation,
    facebook: { mutateAsync: facebook, isPending: facebookPending, error: facebookError } as AuthMutation,
  };
}
