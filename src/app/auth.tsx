import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { useBootstrapApp } from '@/hooks/auth/useBootstrapApp';
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

  useEffect(() => {
    if (hasActiveSession && meStatus === 'idle') {
      fetchMe();
    }
  }, [hasActiveSession, meStatus, fetchMe]);

  useEffect(() => {
    if (!accountJustDeleted) return;
    const timer = setTimeout(() => setAccountJustDeleted(false), OVERLAY_DURATION_MS);
    return () => clearTimeout(timer);
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
          <View style={deletedOverlay.card}>
            <Ionicons name="checkmark-circle-outline" size={56} color="#EF4444" style={{ marginBottom: 20 }} />
            <Text style={deletedOverlay.title}>
              {t('settings.accountDeletedOverlayTitle', 'Account Deleted')}
            </Text>
            <Text style={deletedOverlay.body}>
              {t(
                'settings.accountDeletedOverlayBody',
                'Your account and all associated data have been permanently deleted. You will be signed out shortly.',
              )}
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 44,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
    textAlign: 'center',
  },
});
