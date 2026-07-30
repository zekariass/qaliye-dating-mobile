import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { deactivateDevice } from '@/api/notifications/notificationsApi';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { readInstallationId } from '@/services/notifications/installationId';
import { useBillingStore } from '@/stores/billing-store';
import { useChatStore } from '@/stores/chat-store';
import { useDiscoveryStore } from '@/stores/discovery-store';
import { useMeStore } from '@/stores/me-store';
import { useNotificationsStore } from '@/stores/notifications-store';

export function useSignOutWithDeactivation() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    setIsSigningOut(true);
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

    await supabase.auth.signOut({ scope: 'local' });

    queryClient.clear();
    useMeStore.getState().clearMe();
    useChatStore.getState().reset();
    useBillingStore.getState().clearActiveOrder();
    useBillingStore.getState().clearOrderIdempotencyKey();
    useBillingStore.getState().clearBoostIdempotencyKey();
    useNotificationsStore.getState().setPendingNavIntent(null);
    useNotificationsStore.getState().setForegroundBanner(null);
    useNotificationsStore.getState().setLastHandledNotificationId('');
    useDiscoveryStore.getState().setViewMode('swipe');

    router.replace('/auth' as never);
  }, [router]);

  return { signOut, isSigningOut };
}
