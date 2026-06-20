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
  const params = useGlobalSearchParams<{ code?: string; error?: string; error_description?: string }>();

  useEffect(() => {
    if (handledRef.current) return;

    const handleUrl = async (incomingUrl: string) => {
      if (handledRef.current) return;
      handledRef.current = true;

      console.log('[Callback] handling URL:', incomingUrl);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[Callback] session already exists');
          setStatus('success');
          return;
        }

        // Parse error from URL if present
        if (incomingUrl.includes('error=')) {
          const descMatch = incomingUrl.match(/error_description=([^&#]+)/);
          const codeMatch = incomingUrl.match(/error=([^&#]+)/);
          const desc = descMatch ? decodeURIComponent(descMatch[1].replace(/\+/g, ' ')) : null;
          const code = codeMatch ? decodeURIComponent(codeMatch[1]) : 'auth_error';
          console.error('[Callback] error in URL:', code, desc);
          throw new Error(desc ?? code);
        }

        const { error } = await supabase.auth.exchangeCodeForSession(incomingUrl);
        if (error) throw error;
        console.log('[Callback] session established');
        setStatus('success');
      } catch (e: any) {
        console.error('[Callback] error:', e.message);
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
