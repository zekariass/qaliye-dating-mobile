import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';

import { useBootstrapApp } from '@/hooks/auth/useBootstrapApp';
import { useMeStore } from '@/stores/me-store';

export default function OnboardingLayout() {
  const { isBootstrapping, hasActiveSession } = useBootstrapApp();
  const meData = useMeStore((s) => s.data);
  const meStatus = useMeStore((s) => s.status);
  const isOnboarded = useMeStore((s) => s.isOnboarded);
  const fetchMe = useMeStore((s) => s.fetchMe);

  useEffect(() => {
    if (hasActiveSession && meStatus === 'idle') {
      fetchMe();
    }
  }, [hasActiveSession, meStatus, fetchMe]);

  if (isBootstrapping || meStatus === 'idle' || meStatus === 'loading') {
    return null;
  }

  // If meStatus === 'error', the session is invalid (e.g. account_deleted 403).
  // The interceptor is async-signing-out.  Return null and wait for
  // hasActiveSession to flip to false, which redirects to /auth below.
  if (hasActiveSession && meStatus === 'error') {
    return null;
  }

  if (!hasActiveSession) {
    return <Redirect href="/auth" />;
  }

  if (meData?.onboarding?.is_onboarded || isOnboarded) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
