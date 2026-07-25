import { QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';

import '@/global.css';
import { useTheme } from '@/hooks/use-theme';
import '@/i18n';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { applyFontOverride } from '@/utils/fontOverride';

applyFontOverride();
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Native splash is hidden by the React SplashScreen component
  // once its animated content has rendered, avoiding a blank gap.

  // Global deep-link catcher for OAuth callbacks on Android.
  // Chrome Custom Tabs sometimes fires deep links without routing
  // through Expo Router, so we handle the exchange here as a fallback.
  useEffect(() => {
    const callbackBase = 'qaliyemobile://callback';

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (!url || !url.startsWith(callbackBase)) return;

      const exchange = async () => {
        try {
          if (url.includes('error=')) return;

          await supabase.auth.exchangeCodeForSession(url);
        } catch {
          // Non-fatal — session exchange failure will leave user on auth screen
        }
      };

      exchange();
    });

    return () => subscription.remove();
  }, []);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const splashBackground = '#2A0B4F';

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: splashBackground }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
            contentStyle: { backgroundColor: splashBackground },
          }}
        />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
