// ---------------------------------------------------------------------------
// useAppVersionCheck
// ---------------------------------------------------------------------------
//
// Lifecycle-aware hook that checks the backend for app version updates.
//
// Trigger points:
//  A. On mount (application startup / first render after auth bootstrap)
//  B. When the app returns from background to active (foreground event)
//
// Throttle:
//  Skips the network call when a successful check was made within the last
//  UPDATE_CHECK_THROTTLE_MS milliseconds (default 5 minutes).
//
// Guard:
//  If a check is already in flight, the new request is dropped.
//
// Fail-open:
//  Any network or parsing error is logged in DEV and silently ignored so the
//  user is never blocked from using the app due to an update-check failure.
//
// Prompt coordination:
//  The hook defers the optional-update prompt while InsufficientCreditsModal
//  is visible.  Mandatory updates are shown as soon as that modal clears.
//  It also listens for foreground transitions to re-evaluate pending prompts
//  after the user returns from the App Store / Play Store.
// ---------------------------------------------------------------------------

import * as Sentry from '@sentry/react-native';
import * as Application from 'expo-application';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { fetchAppVersion } from '@/api/app/appVersionApi';
import { useAppUpdateStore } from '@/stores/app-update-store';
import { useInsufficientCreditsStore } from '@/stores/insufficient-credits-store';
import { decideUpdate } from '@/utils/semver';

// ─── Standalone check function ────────────────────────────────────────────────
//
// Extracted from the hook so it can be unit-tested without React rendering.
// Operates purely on the Zustand store via getState().

export async function runAppVersionCheck(): Promise<void> {
  const store = useAppUpdateStore.getState();

  // Drop duplicate concurrent requests.
  if (store.isCheckInProgress) return;

  // Throttle: skip if a check was done very recently.
  if (store.shouldThrottle()) return;

  // Obtain the installed native version at call-time (never hard-coded).
  const currentVersion = Application.nativeApplicationVersion;
  if (!currentVersion) {
    if (__DEV__) {
      console.warn('[AppVersion] nativeApplicationVersion is null — skipping check');
    }
    return;
  }

  store.setIsCheckInProgress(true);
  store.setStatus('checking');

  try {
    const data = await fetchAppVersion();

    const decision = decideUpdate({
      currentVersion,
      latestVersion: data.latest_version,
      minimumVersion: data.minimum_version,
      forceUpdate: data.force_update,
    });

    if (__DEV__) {
      console.log(
        '[AppVersion] check result — ' +
          `installed: ${currentVersion} | ` +
          `latest: ${data.latest_version} | ` +
          `minimum: ${data.minimum_version} | ` +
          `forceUpdate: ${data.force_update} | ` +
          `decision: ${decision}`,
      );
    }

    const { shouldShowPrompt } = store.applyCheckResult({
      decision,
      storeUrl: data.store_url,
      latestVersion: data.latest_version,
    });

    if (shouldShowPrompt) {
      // Defer the optional-update prompt while a billing modal is blocking.
      const insufficientCreditsVisible =
        useInsufficientCreditsStore.getState().visible;

      if (!insufficientCreditsVisible) {
        store.setIsPromptVisible(true);
      }
      // If deferred, the AppUpdateModal component's own effect will re-show
      // the prompt once InsufficientCreditsModal is dismissed.
    }

    Sentry.addBreadcrumb({
      category: 'app_update',
      message: 'app_version_check_completed',
      data: {
        currentVersion,
        latestVersion: data.latest_version,
        minimumVersion: data.minimum_version,
        forceUpdate: data.force_update,
        decision,
      },
      level: 'info',
    });
  } catch (error) {
    // Fail-open: never block the user due to a failed update check.
    store.setStatus('idle');
    if (__DEV__) {
      console.warn('[AppVersion] Check failed (fail-open):', error);
    }
  } finally {
    store.setIsCheckInProgress(false);
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAppVersionCheck() {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Keep a stable reference to the check function across renders.
  const performCheck = useCallback(() => {
    // Fire-and-forget — errors are handled inside runAppVersionCheck.
    void runAppVersionCheck();
  }, []);

  // ── Lifecycle: startup + foreground ─────────────────────────────────────

  useEffect(() => {
    // Startup check — runs asynchronously so it never blocks the splash screen.
    performCheck();

    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        const prev = appStateRef.current;
        appStateRef.current = nextState;

        // App returned to foreground (from background or inactive).
        if (prev.match(/inactive|background/) && nextState === 'active') {
          performCheck();
        }
      },
    );

    return () => subscription.remove();
  }, [performCheck]);
}
