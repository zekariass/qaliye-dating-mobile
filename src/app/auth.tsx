import { Redirect } from 'expo-router';
import { useEffect } from 'react';

import { useBootstrapApp } from '@/hooks/auth/useBootstrapApp';
import AuthScreen from '@/screens/auth/AuthScreen';
import { useMeStore } from '@/stores/me-store';

export default function Auth() {
  const { isBootstrapping, hasActiveSession } = useBootstrapApp();
  const meData = useMeStore((s) => s.data);
  const meStatus = useMeStore((s) => s.status);
  const fetchMe = useMeStore((s) => s.fetchMe);

  useEffect(() => {
    if (hasActiveSession && meStatus === 'idle') {
      fetchMe();
    }
  }, [hasActiveSession, meStatus, fetchMe]);

  if (isBootstrapping) return null;
  if (hasActiveSession && (meStatus === 'idle' || meStatus === 'loading')) return null;

  if (hasActiveSession) {
    if (meData?.onboarding?.is_onboarded) {
      return <Redirect href="/(app)/(tabs)" />;
    }
    return <Redirect href={"/(onboarding)" as any} />;
  }

  return <AuthScreen />;
}
