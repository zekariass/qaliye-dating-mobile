import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import { deactivateDevice } from '@/api/notifications/notificationsApi';
import { readInstallationId } from '@/services/notifications/installationId';
import { supabase } from '@/lib/supabase';
import { useMeStore } from '@/stores/me-store';

export function useSignOutWithDeactivation() {
  const clearMe = useMeStore((s) => s.clearMe);
  const router = useRouter();

  const signOut = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        const installationId = await readInstallationId();
        if (installationId) {
          await deactivateDevice(installationId);
        }
      } catch {
        /* 404 or network failure — non-fatal, continue logout */
      }
    }

    await supabase.auth.signOut();
    clearMe();
    router.replace('/auth' as never);
  }, [clearMe, router]);

  return { signOut };
}
