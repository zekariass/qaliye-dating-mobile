import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { NotificationBanner } from '@/components/notifications/NotificationBanner';
import { useHeartbeat } from '@/hooks/activity/useHeartbeat';
import { useBootstrapApp } from '@/hooks/auth/useBootstrapApp';
import { useCurrentUserId } from '@/hooks/auth/useCurrentUserId';
import { useForegroundNotifications } from '@/hooks/notifications/useForegroundNotifications';
import { useNotificationNavigation } from '@/hooks/notifications/useNotificationNavigation';
import { useNotificationSetup } from '@/hooks/notifications/useNotificationSetup';
import { useMeStore } from '@/stores/me-store';

export default function AppLayout() {
  const { isBootstrapping, hasActiveSession } = useBootstrapApp();
  const meData = useMeStore((s) => s.data);
  const meStatus = useMeStore((s) => s.status);
  const fetchMe = useMeStore((s) => s.fetchMe);
  const userId = useCurrentUserId();

  useHeartbeat();

  useEffect(() => {
    if (hasActiveSession && meStatus === 'idle') {
      fetchMe();
    }
  }, [hasActiveSession, meStatus, fetchMe]);

  const isAppReady = !isBootstrapping && hasActiveSession && meStatus === 'success';

  useNotificationSetup(userId);
  useForegroundNotifications();
  useNotificationNavigation({ isAppReady, hasSession: hasActiveSession });

  if (isBootstrapping) return null;
  if (hasActiveSession && (meStatus === 'idle' || meStatus === 'loading')) return null;

  if (!hasActiveSession) {
    return <Redirect href="/auth" />;
  }

  if (!meData?.onboarding?.is_onboarded) {
    return <Redirect href={"/(onboarding)" as any} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="preferences"
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="user-profile"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="edit-profile"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="settings"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="chat"
          options={{ animation: 'slide_from_right' }}
        />
      </Stack>
      <NotificationBanner />
    </View>
  );
}
