import * as Linking from 'expo-linking';
import { Redirect, useGlobalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { supabase } from '@/lib/supabase';

export default function OAuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const handledRef = useRef(false);

  // Expo Router parses deep-link query params into search params
  const params = useGlobalSearchParams<{ code?: string; error?: string; error_description?: string; type?: string }>();

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

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus('success');
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
            setStatus('success');
            return;
          }
        }

        // PKCE flow: ?code=...
        const { error } = await supabase.auth.exchangeCodeForSession(incomingUrl);
        if (error) throw error;
        setStatus('success');
      } catch (e: any) {
        setStatus('error');
        setErrorMsg(e.message || 'Authentication failed');
      }
    };

    // Try search params first (Expo Router deep link)
    const code = params.code;
    if (code) {
      // Reconstruct the full URL with query params for exchangeCodeForSession
      Linking.getInitialURL().then((url) => {
        if (url) handleUrl(url);
      });
      return;
    }

    // Fallback: check initial URL and listen for events
    let listener: ReturnType<typeof Linking.addEventListener> | null = null;

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
        return;
      }

      // If no initial URL, listen for upcoming events
      listener = Linking.addEventListener('url', ({ url: eventUrl }) => {
        if (eventUrl) handleUrl(eventUrl);
      });
    });

    return () => {
      listener?.remove();
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
        <Text style={{ color: 'red', padding: 20, textAlign: 'center' }}>
          {errorMsg}
        </Text>
      )}
    </View>
  );
}
