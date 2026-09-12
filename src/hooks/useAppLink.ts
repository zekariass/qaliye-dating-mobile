// ---------------------------------------------------------------------------
// useAppLink
// ---------------------------------------------------------------------------
//
// Hook for opening configurable app links (terms, privacy, App Store, Play
// Store) that are fetched on demand from the backend.
//
// Links are NEVER hardcoded in the client. When the user taps a link, the
// hook fetches the URL from `GET /api/v1/links?key={key}` and opens it in the
// system browser. On failure, a user-friendly alert is shown.
//
// Also provides `shareApp()` which fetches the platform-appropriate store
// link and opens the native Share sheet.
// ---------------------------------------------------------------------------

import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Platform, Share } from 'react-native';

import { fetchLink, type LinkKey } from '@/api/links/linksApi';

export function useAppLink() {
  const { t } = useTranslation();
  const pendingKeys = useRef<Set<string>>(new Set());

  /**
   * Fetch a link by key from the backend and open it in the system browser.
   * Shows an alert on failure.
   *
   * Duplicate taps while a fetch is in-flight are ignored so we don't fire
   * multiple network requests or open the browser twice.
   */
  const openLink = useCallback(
    async (key: LinkKey) => {
      if (pendingKeys.current.has(key)) return;
      pendingKeys.current.add(key);
      try {
        const url = await fetchLink(key);
        await Linking.openURL(url);
      } catch {
        Alert.alert(
          t('links.errorTitle', 'Unable to open link'),
          t('links.errorBody', 'Please try again later.'),
        );
      } finally {
        pendingKeys.current.delete(key);
      }
    },
    [t],
  );

  /**
   * Fetch the platform-appropriate store link from the backend and open the
   * native Share sheet so the user can share the app.
   */
  const shareApp = useCallback(async () => {
    if (pendingKeys.current.has('share')) return;
    pendingKeys.current.add('share');
    try {
      const key: LinkKey = Platform.OS === 'ios' ? 'ios_app_store' : 'play_store';
      const url = await fetchLink(key);
      const message = t(
        'links.shareMessage',
        'Check out Qal Dating! {{url}}',
        { url },
      );
      await Share.share({ message });
    } catch {
      Alert.alert(
        t('links.errorTitle', 'Unable to open link'),
        t('links.errorBody', 'Please try again later.'),
      );
    } finally {
      pendingKeys.current.delete('share');
    }
  }, [t]);

  return { openLink, shareApp };
}
