import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { useBootstrapApp } from '@/hooks/auth/useBootstrapApp';
import { useTheme } from '@/hooks/use-theme';
import AuthScreen from '@/screens/auth/AuthScreen';
import { useMeStore } from '@/stores/me-store';

const OVERLAY_DURATION_MS = 5000;

export default function Auth() {
  const { isBootstrapping, hasActiveSession } = useBootstrapApp();
  const meData = useMeStore((s) => s.data);
  const meStatus = useMeStore((s) => s.status);
  const isOnboarded = useMeStore((s) => s.isOnboarded);
  const fetchMe = useMeStore((s) => s.fetchMe);
  const accountJustDeleted = useMeStore((s) => s.accountJustDeleted);
  const setAccountJustDeleted = useMeStore((s) => s.setAccountJustDeleted);
  const { t } = useTranslation();
  const { colors: th } = useTheme();

  useEffect(() => {
    if (hasActiveSession && meStatus === 'idle') {
      fetchMe();
    }
  }, [hasActiveSession, meStatus, fetchMe]);

  const [countdown, setCountdown] = useState(Math.ceil(OVERLAY_DURATION_MS / 1000));

  const dismissOverlay = useCallback(() => {
    setAccountJustDeleted(false);
  }, [setAccountJustDeleted]);

  useEffect(() => {
    if (!accountJustDeleted) return;
    setCountdown(Math.ceil(OVERLAY_DURATION_MS / 1000));
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    const timer = setTimeout(() => setAccountJustDeleted(false), OVERLAY_DURATION_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [accountJustDeleted, setAccountJustDeleted]);

  if (isBootstrapping) return null;
  if (hasActiveSession && (meStatus === 'idle' || meStatus === 'loading')) return null;

  // If meStatus is 'error', the session is invalid (e.g. account_deleted 403).
  // The apiClient interceptor will be signing out asynchronously, but until
  // hasActiveSession flips to false we must NOT redirect to onboarding — that
  // would mount OnboardingScreen which fires /api/v1/onboarding/status and
  // triggers another 403.  Fall through to <AuthScreen /> instead.
  if (hasActiveSession && meStatus === 'success') {
    if (meData?.onboarding?.is_onboarded || isOnboarded) {
      return <Redirect href="/(app)/(tabs)" />;
    }
    return <Redirect href={"/(onboarding)" as any} />;
  }

  return (
    <>
      <AuthScreen />
      <Modal
        visible={accountJustDeleted}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={deletedOverlay.backdrop}>
          <View style={[deletedOverlay.card, { backgroundColor: th.surface, borderColor: th.border }]}>
            <Pressable
              onPress={dismissOverlay}
              style={({ pressed }) => [
                deletedOverlay.closeBtn,
                { backgroundColor: colors.danger + '15', opacity: pressed ? 0.6 : 1 },
              ]}
              hitSlop={12}
            >
              <Ionicons name="close" size={24} color={colors.danger} />
            </Pressable>
            <View style={[deletedOverlay.iconCircle, { backgroundColor: colors.danger + '20' }]}>
              <Ionicons name="checkmark-circle-outline" size={28} color={colors.danger} />
            </View>
            <Text style={[deletedOverlay.title, { color: th.text }]}>
              {t('settings.accountDeletedOverlayTitle', 'Account Deleted')}
            </Text>
            <Text style={[deletedOverlay.body, { color: th.textSecondary }]}>
              {t(
                'settings.accountDeletedOverlayBody',
                'Your account and all associated data have been permanently deleted. You will be signed out shortly.',
              )}
            </Text>
            <Text style={[deletedOverlay.countdown, { color: th.textSecondary }]}>
              {countdown}s
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const deletedOverlay = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdown: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
});
