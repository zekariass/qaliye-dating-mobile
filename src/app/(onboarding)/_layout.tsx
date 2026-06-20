import { Redirect, Stack } from 'expo-router';

import { useBootstrapApp } from '@/hooks/auth/useBootstrapApp';
import { useMeStore } from '@/stores/me-store';

export default function OnboardingLayout() {
  const { isBootstrapping, hasActiveSession } = useBootstrapApp();
  const meData = useMeStore((s) => s.data);
  const meStatus = useMeStore((s) => s.status);

  if (isBootstrapping || meStatus === 'loading') {
    return null;
  }

  if (!hasActiveSession) {
    return <Redirect href="/auth" />;
  }

  if (meData?.onboarding?.is_onboarded) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
