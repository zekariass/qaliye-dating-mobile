import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { InsufficientCreditsModal } from '@/components/billing/InsufficientCreditsModal';
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
    return <SplashStyleLoader isDark={th.background !== '#FFFFFF'} />;
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
        <Stack.Screen
          name="verify-identity"
          options={{ animation: 'slide_from_right' }}
        />
      </Stack>
      <NotificationBanner />
      <ThemedAlert />
      <InsufficientCreditsModal />
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

function SplashStyleLoader({ isDark }: { isDark: boolean }) {
  const heartScale = useSharedValue(1);
  const ring1Scale = useSharedValue(0.6);
  const ring1Opacity = useSharedValue(0.5);
  const ring2Scale = useSharedValue(0.6);
  const ring2Opacity = useSharedValue(0.5);
  const ring3Scale = useSharedValue(0.6);
  const ring3Opacity = useSharedValue(0.5);
  const shimmerX = useSharedValue(-140);

  useEffect(() => {
    // Heartbeat: double-pump pattern (lub-dub) then rest, repeating
    heartScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(1.0, { duration: 120, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.15, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(1.0, { duration: 120, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.0, { duration: 800 }),
      ),
      -1,
      true,
    );

    // Three ripple rings expanding outward, staggered
    const ringAnim = (scale: Animated.SharedValue<number>, opacity: Animated.SharedValue<number>, delay: number) => {
      scale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1.8, { duration: 2400, easing: Easing.out(Easing.cubic) }),
            withTiming(0.6, { duration: 0 }),
          ),
          -1,
          false,
        ),
      );
      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.5, { duration: 0 }),
          ),
          -1,
          false,
        ),
      );
    };

    ringAnim(ring1Scale, ring1Opacity, 0);
    ringAnim(ring2Scale, ring2Opacity, 800);
    ringAnim(ring3Scale, ring3Opacity, 1600);

    // Shimmer bar
    shimmerX.value = withRepeat(
      withTiming(210, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, []);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: ring3Opacity.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const BOTH_ICON = require('@/assets/images/loader/loader-icon-male-and-female.webp');
  const HEART_SIZE = 130;
  const ICON_SIZE = 70;
  const RING_BASE = 130;

  return (
    <View style={splashStyles.root}>
      <LinearGradient
        colors={isDark
          ? ['#0D0712', '#1A0B2E', '#2A0B4F']
          : ['#2A0B4F', colors.primaryDark, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={splashStyles.fill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={splashStyles.overlay}
      />

      <View style={splashStyles.center}>
        <View style={splashStyles.heartContainer}>
          {/* Expanding ripple rings */}
          <Animated.View style={[splashStyles.ring, { width: RING_BASE, height: RING_BASE, borderRadius: RING_BASE / 2 }, ring1Style]} />
          <Animated.View style={[splashStyles.ring, { width: RING_BASE, height: RING_BASE, borderRadius: RING_BASE / 2 }, ring2Style]} />
          <Animated.View style={[splashStyles.ring, { width: RING_BASE, height: RING_BASE, borderRadius: RING_BASE / 2 }, ring3Style]} />

          {/* Pulsing heart with combined icon */}
          <Animated.View style={heartStyle}>
            <View style={splashStyles.heartWrap}>
              <Ionicons name="heart" size={HEART_SIZE} color="rgba(255,79,163,0.9)" />
              <View style={splashStyles.heartIconWrap}>
                <Image source={BOTH_ICON} style={{ width: ICON_SIZE, height: ICON_SIZE }} resizeMode="contain" />
              </View>
            </View>
          </Animated.View>
        </View>
      </View>

      <View style={splashStyles.bottom}>
        <View style={splashStyles.progressTrack}>
          <Animated.View style={[splashStyles.shimmer, shimmerStyle]} />
        </View>
      </View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.6,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIconWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  bottom: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
  },
  progressTrack: {
    width: 140,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  shimmer: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
