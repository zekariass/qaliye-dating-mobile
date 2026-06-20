import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '@/global.css';
import { useTheme } from '@/hooks/use-theme';
import '@/i18n';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hide();
  }, []);

  // Global deep-link catcher for OAuth callbacks on Android.
  // Chrome Custom Tabs sometimes fires deep links without routing
  // through Expo Router, so we handle the exchange here as a fallback.
  useEffect(() => {
    const callbackBase = 'qaliyemobile://callback';

    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[RootLayout] ALL url event:', url);
      if (!url || !url.startsWith(callbackBase)) return;

      console.log('[RootLayout] caught callback URL:', url);

      const exchange = async () => {
        try {
          if (url.includes('error=')) {
            const descMatch = url.match(/error_description=([^&#]+)/);
            const codeMatch = url.match(/error=([^&#]+)/);
            const desc = descMatch ? decodeURIComponent(descMatch[1].replace(/\+/g, ' ')) : null;
            const code = codeMatch ? decodeURIComponent(codeMatch[1]) : 'auth_error';
            console.error('[RootLayout] OAuth error:', code, desc);
            return;
          }

          const { error } = await supabase.auth.exchangeCodeForSession(url);
          if (error) {
            console.error('[RootLayout] exchangeCodeForSession error:', error.message);
          } else {
            console.log('[RootLayout] session established from deep link');
          }
        } catch (e: any) {
          console.error('[RootLayout] deep link exchange failed:', e.message);
        }
      };

      exchange();
    });

    return () => subscription.remove();
  }, []);

  const { mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
          }}
        />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
