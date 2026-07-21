import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { deleteAccount } from '@/api/meApi';
import { deactivateDevice } from '@/api/notifications/notificationsApi';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { readInstallationId } from '@/services/notifications/installationId';
import { useBillingStore } from '@/stores/billing-store';
import { useChatStore } from '@/stores/chat-store';
import { useMeStore } from '@/stores/me-store';
import { useNotificationsStore } from '@/stores/notifications-store';

export type DeleteAccountStatus = 'idle' | 'deleting' | 'error';

function clearAllLocalState() {
  queryClient.clear();
  useMeStore.getState().clearMe();
  useChatStore.getState().reset();
  useBillingStore.getState().clearActiveOrder();
  useBillingStore.getState().clearOrderIdempotencyKey();
  useBillingStore.getState().clearBoostIdempotencyKey();
  useNotificationsStore.getState().setPendingNavIntent(null);
  useNotificationsStore.getState().setForegroundBanner(null);
  useNotificationsStore.getState().setLastHandledNotificationId('');
}

export function useDeleteAccount() {
  const router = useRouter();
  const [deleteStatus, setDeleteStatus] = useState<DeleteAccountStatus>('idle');

  const confirmDelete = useCallback(async () => {
    setDeleteStatus('deleting');
    try {
      if (Platform.OS !== 'web') {
        try {
          const installationId = await readInstallationId();
          if (installationId) {
            await deactivateDevice(installationId);
          }
        } catch {
          /* non-fatal */
        }
      }

      await deleteAccount();

      // Cancel all in-flight queries IMMEDIATELY so background refetches don't
      // complete with the old JWT and trigger 403 account_deleted responses.
      queryClient.cancelQueries();

      // Set the flag BEFORE signOut so it survives clearMe() (clearMe does not
      // reset accountJustDeleted). auth.tsx will read it and show the overlay.
      useMeStore.getState().setAccountJustDeleted(true);

      // Sign out IMMEDIATELY — no delayed timer. This eliminates the race window
      // where a stale JWT could remain in storage if the app is killed mid-flow.
      await supabase.auth.signOut({ scope: 'local' });
      clearAllLocalState();

      router.replace('/auth' as never);
    } catch (err) {
      setDeleteStatus('idle');
      throw err;
    }
  }, [router]);

  return { confirmDelete, deleteStatus };
}
