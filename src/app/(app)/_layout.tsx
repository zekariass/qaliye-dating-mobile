import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedAlert } from '@/components/common/ThemedAlert';
import { NotificationBanner } from '@/components/notifications/NotificationBanner';
import { colors, spacing } from '@/constants/theme';
import { useHeartbeat } from '@/hooks/activity/useHeartbeat';
import { useBootstrapApp } from '@/hooks/auth/useBootstrapApp';
import { useCurrentUserId } from '@/hooks/auth/useCurrentUserId';
import { useEligiblePromotions } from '@/hooks/billing/useEligiblePromotions';
import { useRevenueCatIdentity } from '@/hooks/billing/useRevenueCatIdentity';
import { useForegroundNotifications } from '@/hooks/notifications/useForegroundNotifications';
import { useNotificationNavigation } from '@/hooks/notifications/useNotificationNavigation';
import { useNotificationSetup } from '@/hooks/notifications/useNotificationSetup';
import { useSignedUrlRefresh } from '@/hooks/profile/useSignedUrlRefresh';
import { useTheme } from '@/hooks/use-theme';
import { useMeStore } from '@/stores/me-store';

export default function AppLayout() {
  const { t } = useTranslation();
  const { isBootstrapping, hasActiveSession } = useBootstrapApp();
  const meData = useMeStore((s) => s.data);
  const meStatus = useMeStore((s) => s.status);
  const isOnboarded = useMeStore((s) => s.isOnboarded);
  const fetchMe = useMeStore((s) => s.fetchMe);
  const userId = useCurrentUserId();
  const { colors: th } = useTheme();
  const [isRetrying, setRetrying] = useState(false);

  useHeartbeat();
  useEligiblePromotions();

  useEffect(() => {
    if (hasActiveSession && meStatus === 'idle') {
      fetchMe();
    }
  }, [hasActiveSession, meStatus, fetchMe]);

  const isAppReady = !isBootstrapping && hasActiveSession && meStatus === 'success';

  useNotificationSetup(userId);
  useForegroundNotifications();
  useNotificationNavigation({ isAppReady, hasSession: hasActiveSession });
  useRevenueCatIdentity();
  useSignedUrlRefresh();

  if (isBootstrapping || (hasActiveSession && (meStatus === 'idle' || meStatus === 'loading'))) {
    return (
      <View style={[errStyles.container, { backgroundColor: th.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!hasActiveSession) {
    return <Redirect href="/auth" />;
  }

  // If meStatus === 'error':
  // - 403 account_deleted/suspended: the apiClient interceptor calls clearMe()
  //   which resets status to 'idle' almost immediately, so this screen barely
  //   flashes before hasActiveSession flips to false and redirects to /auth.
  // - Network error (backend down): status stays 'error' — show a meaningful
  //   error screen with a retry button instead of a blank purple screen.
  if (hasActiveSession && meStatus === 'error') {
    const handleRetry = () => {
      setRetrying(true);
      useMeStore.setState({ status: 'idle', error: null });
      fetchMe();
    };
    return (
      <View style={[errStyles.container, { backgroundColor: th.background }]}>
        <Ionicons name="cloud-offline-outline" size={56} color={colors.primary} />
        <Text style={[errStyles.title, { color: th.text }]}>
          {t('common.connectionErrorTitle', 'Connection problem')}
        </Text>
        <Text style={[errStyles.subtitle, { color: th.textSecondary }]}>
          {t('common.connectionErrorBody', 'We couldn\'t reach our servers. Please check your internet connection and try again.')}
        </Text>
        <Pressable
          style={[errStyles.retryBtn, { backgroundColor: colors.primary }]}
          onPress={handleRetry}
          disabled={isRetrying}
        >
          {isRetrying ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={errStyles.retryText}>{t('common.retry', 'Try again')}</Text>
          )}
        </Pressable>
      </View>
    );
  }

  if (!meData?.onboarding?.is_onboarded && !isOnboarded) {
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
        <Stack.Screen
          name="balances"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="premium"
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="credits-shop"
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="boost"
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="order-status"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="manual-payment"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="payment-activity"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="support-conversation"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="staff-support-inbox"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="staff-support-chat"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="promotions"
          options={{ animation: 'slide_from_right' }}
        />
      </Stack>
      <NotificationBanner />
      <ThemedAlert />
    </View>
  );
}

const errStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: 14,
    minWidth: 180,
    alignItems: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
