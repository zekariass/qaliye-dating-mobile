import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { useBootstrapApp } from '@/hooks/auth/useBootstrapApp';
import { useTheme } from '@/hooks/use-theme';
import AuthScreen from '@/screens/auth/AuthScreen';
import { useMeStore } from '@/stores/me-store';

const OVERLAY_DURATION_MS = 5000;

export default function Auth() {
  const { isBootstrapping, hasActiveSession, isPasswordRecovery } = useBootstrapApp();
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

  // If a password-recovery session is active, send the user to the reset screen
  // instead of into the app. This handles the edge case where the user navigates
  // back to /auth while holding a recovery session.
  if (isPasswordRecovery) {
    return <Redirect href={'/reset-password' as any} />;
  }

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
              <Ionicons name="close" size={22} color={colors.danger} />
            </Pressable>
            <View style={deletedOverlay.content}>
              <View style={[deletedOverlay.iconCircle, { backgroundColor: colors.danger + '20' }]}>
                <Ionicons name="checkmark-circle-outline" size={32} color={colors.danger} />
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
        </View>
      </Modal>
    </>
  );
}

const deletedOverlay = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 6, 51, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 36,
    paddingHorizontal: 28,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  content: {
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  countdown: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
});
