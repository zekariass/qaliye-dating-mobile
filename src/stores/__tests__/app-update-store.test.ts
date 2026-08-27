jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware');
  return {
    ...actual,
    persist: (config: any) => config,
    createJSONStorage: () => undefined,
  };
});

import { useAppUpdateStore, UPDATE_CHECK_THROTTLE_MS } from '../app-update-store';

describe('app-update-store', () => {
  beforeEach(() => {
    // Reset to defaults before each test.
    useAppUpdateStore.setState({
      status: 'idle',
      storeUrl: null,
      latestVersion: null,
      isPromptVisible: false,
      isCheckInProgress: false,
      lastCheckedAt: null,
      dismissedOptionalVersion: null,
    });
  });

  // ── shouldThrottle ────────────────────────────────────────────────────────
  describe('shouldThrottle', () => {
    it('returns false when no check has happened yet', () => {
      expect(useAppUpdateStore.getState().shouldThrottle()).toBe(false);
    });

    it('returns true when last check was very recent', () => {
      useAppUpdateStore.getState().setLastCheckedAt(Date.now());
      expect(useAppUpdateStore.getState().shouldThrottle()).toBe(true);
    });

    it('returns false when last check was older than the throttle window', () => {
      useAppUpdateStore
        .getState()
        .setLastCheckedAt(Date.now() - UPDATE_CHECK_THROTTLE_MS - 1000);
      expect(useAppUpdateStore.getState().shouldThrottle()).toBe(false);
    });
  });

  // ── applyCheckResult ──────────────────────────────────────────────────────
  describe('applyCheckResult', () => {
    it('returns shouldShowPrompt=true for mandatory-update and sets status', () => {
      const { shouldShowPrompt } = useAppUpdateStore.getState().applyCheckResult({
        decision: 'mandatory-update',
        storeUrl: 'https://play.google.com/store/apps/details?id=com.qaliye.app',
        latestVersion: '1.4.0',
      });

      expect(shouldShowPrompt).toBe(true);
      expect(useAppUpdateStore.getState().status).toBe('mandatory-update');
      expect(useAppUpdateStore.getState().storeUrl).toBe(
        'https://play.google.com/store/apps/details?id=com.qaliye.app',
      );
      expect(useAppUpdateStore.getState().latestVersion).toBe('1.4.0');
    });

    it('returns shouldShowPrompt=true for optional-update when not previously dismissed', () => {
      const { shouldShowPrompt } = useAppUpdateStore.getState().applyCheckResult({
        decision: 'optional-update',
        storeUrl: 'https://play.google.com/...',
        latestVersion: '1.4.0',
      });

      expect(shouldShowPrompt).toBe(true);
      expect(useAppUpdateStore.getState().status).toBe('optional-update');
    });

    it('returns shouldShowPrompt=false for optional-update when same version was dismissed', () => {
      useAppUpdateStore.getState().setDismissedOptionalVersion('1.4.0');

      const { shouldShowPrompt } = useAppUpdateStore.getState().applyCheckResult({
        decision: 'optional-update',
        storeUrl: 'https://play.google.com/...',
        latestVersion: '1.4.0',
      });

      expect(shouldShowPrompt).toBe(false);
    });

    it('returns shouldShowPrompt=true for optional-update when a newer version is available', () => {
      // User dismissed 1.4.0; now 1.5.0 is the latest.
      useAppUpdateStore.getState().setDismissedOptionalVersion('1.4.0');

      const { shouldShowPrompt } = useAppUpdateStore.getState().applyCheckResult({
        decision: 'optional-update',
        storeUrl: 'https://play.google.com/...',
        latestVersion: '1.5.0',
      });

      expect(shouldShowPrompt).toBe(true);
    });

    it('hides any stale prompt and returns shouldShowPrompt=false for no-update', () => {
      useAppUpdateStore.getState().setIsPromptVisible(true);

      const { shouldShowPrompt } = useAppUpdateStore.getState().applyCheckResult({
        decision: 'no-update',
        storeUrl: 'https://play.google.com/...',
        latestVersion: '1.4.0',
      });

      expect(shouldShowPrompt).toBe(false);
      expect(useAppUpdateStore.getState().isPromptVisible).toBe(false);
      expect(useAppUpdateStore.getState().status).toBe('no-update');
    });

    it('updates lastCheckedAt on every successful result', () => {
      const before = Date.now();
      useAppUpdateStore.getState().applyCheckResult({
        decision: 'no-update',
        storeUrl: 'https://play.google.com/...',
        latestVersion: '1.4.0',
      });
      const after = Date.now();
      const ts = useAppUpdateStore.getState().lastCheckedAt;
      expect(ts).not.toBeNull();
      expect(ts!).toBeGreaterThanOrEqual(before);
      expect(ts!).toBeLessThanOrEqual(after);
    });
  });

  // ── Optional update dismissal persistence ─────────────────────────────────
  describe('optional update dismissal persistence', () => {
    it('persists the dismissed version', () => {
      useAppUpdateStore.getState().setDismissedOptionalVersion('1.4.0');
      expect(useAppUpdateStore.getState().dismissedOptionalVersion).toBe('1.4.0');
    });

    it('clears the dismissed version when set to null', () => {
      useAppUpdateStore.getState().setDismissedOptionalVersion('1.4.0');
      useAppUpdateStore.getState().setDismissedOptionalVersion(null);
      expect(useAppUpdateStore.getState().dismissedOptionalVersion).toBeNull();
    });
  });
});
