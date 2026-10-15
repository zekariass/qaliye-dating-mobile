import * as Linking from 'expo-linking';
import { Redirect, router, useGlobalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import i18n from '@/i18n';
import { consumeAuthDeepLink } from '@/lib/deepLink';
import { markPasswordRecoveryPending } from '@/lib/recoverySession';
import { supabase } from '@/lib/supabase';

export default function OAuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const handledRef = useRef(false);

  // Expo Router parses deep-link query params into search params
  const params = useGlobalSearchParams<{ code?: string; error?: string; error_description?: string; type?: string }>();

  // Rebuild the deep link from router params — on warm starts these are
  // always fresh, while getInitialURL() can return a stale link or null.
  const paramsUrl = (() => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (typeof v === 'string' && v) qs.set(k, v);
    }
    const s = qs.toString();
    return s ? `qaliyemobile://callback?${s}` : null;
  })();

  // True if this is a password-recovery callback (set once we know the URL)
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    if (handledRef.current) return;

    const handleUrl = async (incomingUrl: string) => {
      if (handledRef.current) return;
      handledRef.current = true;

      // Detect recovery before any async work so the redirect is set correctly
      const recovery = incomingUrl.includes('type=recovery');
      setIsRecovery(recovery);

      // Only mark recovery-pending once a session actually exists. Recovery
      // links are single-use — a dead/replayed link must not pin the user on
      // the reset screen with no session behind it.
      const onExchangeSuccess = async () => {
        if (recovery) await markPasswordRecoveryPending();
        setStatus('success');
      };

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await onExchangeSuccess();
          return;
        }

        // Parse error from URL if present
        if (incomingUrl.includes('error=')) {
          const descMatch = incomingUrl.match(/error_description=([^&#]+)/);
          const codeMatch = incomingUrl.match(/error=([^&#]+)/);
          const desc = descMatch ? decodeURIComponent(descMatch[1].replace(/\+/g, ' ')) : null;
          const code = codeMatch ? decodeURIComponent(codeMatch[1]) : 'auth_error';
          throw new Error(desc ?? code);
        }

        // Hash/implicit flow: #access_token=...&refresh_token=...&type=recovery
        // (Used by Supabase token-based email verification)
        const hashIndex = incomingUrl.indexOf('#');
        if (hashIndex !== -1) {
          const fragment = incomingUrl.slice(hashIndex + 1);
          const hashParams = new URLSearchParams(fragment);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
            await onExchangeSuccess();
            return;
          }
        }

        // PKCE flow: ?code=...
        const { error } = await supabase.auth.exchangeCodeForSession(incomingUrl);
        if (error) throw error;
        await onExchangeSuccess();
      } catch (e: any) {
        setStatus('error');
        setErrorMsg(e.message || i18n.t('auth.authenticationFailed', 'Authentication failed'));
      }
    };

    // Deep links can arrive as the initial URL (cold start) or as a url event
    // while the app is already running — where the event can fire before this
    // screen subscribes. Try all four sources; handledRef dedupes them.
    // The stashed URL from the root layout's listener is the most reliable
    // warm-start source and preserves the URL fragment (error details).
    const stashed = consumeAuthDeepLink();
    if (stashed) handleUrl(stashed);
    if (paramsUrl) handleUrl(paramsUrl);

    const listener = Linking.addEventListener('url', ({ url: eventUrl }) => {
      if (eventUrl) handleUrl(eventUrl);
    });
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // Never spin forever — if no source delivered a usable link, surface an
    // error instead of an endless spinner.
    const timeout = setTimeout(() => {
      if (!handledRef.current) {
        handledRef.current = true;
        setStatus('error');
        setErrorMsg(i18n.t('auth.authenticationFailed', 'Authentication failed'));
      }
    }, 8000);

    return () => {
      listener.remove();
      clearTimeout(timeout);
    };
  }, [params.code, params.error]);

  if (status === 'success') {
    // Password-recovery tokens must land on the reset screen, not the app
    if (isRecovery || params.type === 'recovery') {
      return <Redirect href={'/reset-password' as any} />;
    }
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {status === 'loading' ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text style={{ color: 'red', padding: 20, textAlign: 'center' }}>
            {errorMsg}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/auth' as any)}
            style={{
              marginTop: 12,
              paddingVertical: 12,
              paddingHorizontal: 28,
              borderRadius: 24,
              backgroundColor: '#8A2CFF',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>
              {i18n.t('auth.resetPasswordBackToLogin', 'Back to login')}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
