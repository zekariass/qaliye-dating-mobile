import axios from 'axios';
import { Platform } from 'react-native';

import { deactivateDevice } from '@/api/notifications/notificationsApi';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { readInstallationId } from '@/services/notifications/installationId';
import { useBillingStore } from '@/stores/billing-store';
import { useChatStore } from '@/stores/chat-store';
import { useDiscoveryStore } from '@/stores/discovery-store';
import { useInsufficientCreditsStore } from '@/stores/insufficient-credits-store';
import { useMeStore } from '@/stores/me-store';
import { useNotificationsStore } from '@/stores/notifications-store';

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isSigningOutOnAccountDeleted = false;

async function handleAccountDeleted() {
  if (isSigningOutOnAccountDeleted) return;
  isSigningOutOnAccountDeleted = true;

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
  } finally {
    // Cancel ALL in-flight queries FIRST so pending HTTP requests are aborted
    // and no onSuccess callbacks fire with stale data after we clear everything.
    // NOTE: Do NOT set accountJustDeleted here. That flag is only set by the
    // explicit delete action in useDeleteAccount.ts. Setting it here would cause
    // the "Account Deleted" overlay to re-appear on every re-login attempt after
    // deletion, because the interceptor fires again on the stale-session path.
    queryClient.cancelQueries();
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
    isSigningOutOnAccountDeleted = false;
  }
}

apiClient.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Ensure Content-Type is set for requests with a body (unless multipart, which is set per-request)
  if (config.data && !config.headers?.['Content-Type'] && !config.headers?.['content-type']) {
    config.headers['Content-Type'] = 'application/json';
  }

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
    if (__DEV__) {
      console.log(
        `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
        '| token:', session.access_token.slice(0, 20) + '…',
      );
      if (config.data) {
        console.log(`[API] request data:`, typeof config.data === 'string' ? config.data : JSON.stringify(config.data));
        console.log(`[API] Content-Type:`, config.headers['Content-Type'] ?? config.headers['content-type'] ?? 'not set');
      }
    }
  } else if (__DEV__) {
    console.warn('[API] No active session — request sent without Bearer token');
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isRetry = (error.config as { _retry?: boolean })?._retry;
    if (error.response?.status === 401 && !isRetry) {
      (error.config as { _retry?: boolean })._retry = true;
      try {
        const {
          data: { session },
        } = await supabase.auth.refreshSession();
        if (session) {
          error.config.headers.Authorization = `Bearer ${session.access_token}`;
          return axios(error.config);
        }
      } catch {
        await supabase.auth.signOut();
      }
    }
    if (__DEV__ && error.response) {
      console.warn(
        `[API] ${error.response.status} ${error.config?.url}`,
        JSON.stringify(error.response.data),
      );
    }

    const rawError = error.response?.data?.error;
    const errorCode: string | undefined =
      typeof rawError === 'string'
        ? rawError                                          // {"error":"account_deleted"}
        : typeof rawError === 'object' && rawError !== null
          ? (rawError as { code?: string }).code            // {"error":{"code":"ACCOUNT_DELETED"}}
          : undefined;
    const normalizedCode = errorCode?.toLowerCase();

    // 402 Payment Required — insufficient credits: show global modal, suppress generic error handling
    if (error.response?.status === 402 && normalizedCode === 'insufficient_credits') {
      const message =
        typeof rawError === 'object' && rawError !== null
          ? (rawError as { message?: string }).message ?? "You don't have enough credits for this action."
          : "You don't have enough credits for this action.";
      useInsufficientCreditsStore.getState().show(message);
      const tagged = new Error('insufficient_credits') as Error & { isInsufficientCredits: true };
      tagged.isInsufficientCredits = true;
      return Promise.reject(tagged);
    }

    if (
      error.response?.status === 403 &&
      (normalizedCode === 'account_deleted' || normalizedCode === 'account_suspended') &&
      !(error.config as { _skipAccountGuard?: boolean })?._skipAccountGuard
    ) {
      handleAccountDeleted();
    }

    return Promise.reject(error);
  },
);
