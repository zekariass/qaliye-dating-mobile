// Mock expo-application — use a mutable holder so tests can simulate an update.
import { fetchAppVersion } from '@/api/app/appVersionApi';
import { useAppUpdateStore } from '@/stores/app-update-store';
import { useInsufficientCreditsStore } from '@/stores/insufficient-credits-store';
import * as Application from 'expo-application';

import { runAppVersionCheck } from '../useAppVersionCheck';

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.3.0',
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

// Mock the API module
jest.mock('@/api/app/appVersionApi', () => ({
  fetchAppVersion: jest.fn(),
}));

// Mock the insufficient-credits store (used via .getState())
jest.mock('@/stores/insufficient-credits-store', () => ({
  useInsufficientCreditsStore: {
    getState: jest.fn(() => ({ visible: false })),
  },
}));

// Mock zustand/middleware so persist doesn't touch real AsyncStorage
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

const mockedFetchAppVersion = fetchAppVersion as jest.MockedFunction<typeof fetchAppVersion>;
const mockedInsufficientGetState = useInsufficientCreditsStore.getState as jest.Mock;
const mockedApplication = Application as { nativeApplicationVersion: string | null };

function resetStore() {
  useAppUpdateStore.setState({
    status: 'idle',
    storeUrl: null,
    latestVersion: null,
    isPromptVisible: false,
    isCheckInProgress: false,
    lastCheckedAt: null,
    dismissedOptionalVersion: null,
  });
}

async function flushPromises() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

describe('runAppVersionCheck (startup + foreground logic)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
    mockedInsufficientGetState.mockReturnValue({ visible: false });
    mockedApplication.nativeApplicationVersion = '1.3.0';
  });

  // ── Startup check ────────────────────────────────────────────────────────
  it('performs a version check on startup', async () => {
    mockedFetchAppVersion.mockResolvedValue({
      platform: 'android',
      latest_version: '1.4.0',
      minimum_version: '1.2.0',
      force_update: false,
      store_url: 'https://play.google.com/...',
    });

    await runAppVersionCheck();
    await flushPromises();

    expect(mockedFetchAppVersion).toHaveBeenCalledTimes(1);
    expect(useAppUpdateStore.getState().status).toBe('optional-update');
    expect(useAppUpdateStore.getState().isPromptVisible).toBe(true);
  });

  // ── No-update case ───────────────────────────────────────────────────────
  it('does not show a prompt when up to date', async () => {
    mockedFetchAppVersion.mockResolvedValue({
      platform: 'android',
      latest_version: '1.3.0',
      minimum_version: '1.2.0',
      force_update: false,
      store_url: 'https://play.google.com/...',
    });

    await runAppVersionCheck();
    await flushPromises();

    expect(useAppUpdateStore.getState().status).toBe('no-update');
    expect(useAppUpdateStore.getState().isPromptVisible).toBe(false);
  });

  // ── Mandatory update ─────────────────────────────────────────────────────
  it('shows a mandatory prompt when current < minimum', async () => {
    mockedFetchAppVersion.mockResolvedValue({
      platform: 'android',
      latest_version: '1.4.0',
      minimum_version: '1.5.0',
      force_update: false,
      store_url: 'https://play.google.com/...',
    });

    await runAppVersionCheck();
    await flushPromises();

    expect(useAppUpdateStore.getState().status).toBe('mandatory-update');
    expect(useAppUpdateStore.getState().isPromptVisible).toBe(true);
  });

  it('shows a mandatory prompt when force_update is true', async () => {
    mockedFetchAppVersion.mockResolvedValue({
      platform: 'android',
      latest_version: '1.3.0',
      minimum_version: '1.0.0',
      force_update: true,
      store_url: 'https://play.google.com/...',
    });

    await runAppVersionCheck();
    await flushPromises();

    expect(useAppUpdateStore.getState().status).toBe('mandatory-update');
    expect(useAppUpdateStore.getState().isPromptVisible).toBe(true);
  });

  // ── Fail-open on network error ───────────────────────────────────────────
  it('fails open on network error — does not block the user', async () => {
    mockedFetchAppVersion.mockRejectedValue(new Error('Network Error'));

    await runAppVersionCheck();
    await flushPromises();

    expect(useAppUpdateStore.getState().status).toBe('idle');
    expect(useAppUpdateStore.getState().isPromptVisible).toBe(false);
  });

  // ── Fail-open on malformed response ──────────────────────────────────────
  it('fails open on malformed response', async () => {
    mockedFetchAppVersion.mockRejectedValue(new Error('Invalid response'));

    await runAppVersionCheck();
    await flushPromises();

    expect(useAppUpdateStore.getState().status).toBe('idle');
    expect(useAppUpdateStore.getState().isPromptVisible).toBe(false);
  });

  // ── Foreground re-check (simulated by calling again) ─────────────────────
  it('re-checks when called again after the throttle window', async () => {
    mockedFetchAppVersion.mockResolvedValue({
      platform: 'android',
      latest_version: '1.3.0',
      minimum_version: '1.0.0',
      force_update: false,
      store_url: 'https://play.google.com/...',
    });

    await runAppVersionCheck();
    await flushPromises();
    expect(mockedFetchAppVersion).toHaveBeenCalledTimes(1);

    // Reset the throttle so the next check actually runs.
    useAppUpdateStore.getState().setLastCheckedAt(0);

    await runAppVersionCheck();
    await flushPromises();

    expect(mockedFetchAppVersion).toHaveBeenCalledTimes(2);
  });

  // ── Throttle ─────────────────────────────────────────────────────────────
  it('does not re-check within the throttle window after a successful check', async () => {
    mockedFetchAppVersion.mockResolvedValue({
      platform: 'android',
      latest_version: '1.3.0',
      minimum_version: '1.0.0',
      force_update: false,
      store_url: 'https://play.google.com/...',
    });

    await runAppVersionCheck();
    await flushPromises();
    expect(mockedFetchAppVersion).toHaveBeenCalledTimes(1);

    // Second call immediately after — should be throttled.
    await runAppVersionCheck();
    await flushPromises();

    expect(mockedFetchAppVersion).toHaveBeenCalledTimes(1);
  });

  // ── Duplicate request prevention ─────────────────────────────────────────
  it('does not start a second concurrent check while one is in flight', async () => {
    let resolveFirst: (value: any) => void = () => {};
    mockedFetchAppVersion.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );

    // Start the first check (don't await yet).
    const firstPromise = runAppVersionCheck();
    await flushPromises();
    expect(mockedFetchAppVersion).toHaveBeenCalledTimes(1);

    // Second call while the first is still pending — should be dropped.
    await runAppVersionCheck();
    await flushPromises();
    expect(mockedFetchAppVersion).toHaveBeenCalledTimes(1);

    // Now resolve the first check.
    resolveFirst({
      platform: 'android',
      latest_version: '1.3.0',
      minimum_version: '1.0.0',
      force_update: false,
      store_url: 'https://play.google.com/...',
    });
    await firstPromise;
    await flushPromises();
  });

  // ── Optional update dismissal persistence ────────────────────────────────
  it('does not show optional prompt for a version the user already dismissed', async () => {
    useAppUpdateStore.getState().setDismissedOptionalVersion('1.4.0');

    mockedFetchAppVersion.mockResolvedValue({
      platform: 'android',
      latest_version: '1.4.0',
      minimum_version: '1.2.0',
      force_update: false,
      store_url: 'https://play.google.com/...',
    });

    await runAppVersionCheck();
    await flushPromises();

    expect(useAppUpdateStore.getState().status).toBe('optional-update');
    expect(useAppUpdateStore.getState().isPromptVisible).toBe(false);
  });

  it('shows optional prompt again when a newer version becomes available', async () => {
    useAppUpdateStore.getState().setDismissedOptionalVersion('1.4.0');

    mockedFetchAppVersion.mockResolvedValue({
      platform: 'android',
      latest_version: '1.5.0',
      minimum_version: '1.2.0',
      force_update: false,
      store_url: 'https://play.google.com/...',
    });

    await runAppVersionCheck();
    await flushPromises();

    expect(useAppUpdateStore.getState().status).toBe('optional-update');
    expect(useAppUpdateStore.getState().isPromptVisible).toBe(true);
  });

  // ── Prompt coordination with InsufficientCreditsModal ────────────────────
  it('defers the optional prompt when InsufficientCreditsModal is visible', async () => {
    mockedInsufficientGetState.mockReturnValue({ visible: true });

    mockedFetchAppVersion.mockResolvedValue({
      platform: 'android',
      latest_version: '1.4.0',
      minimum_version: '1.2.0',
      force_update: false,
      store_url: 'https://play.google.com/...',
    });

    await runAppVersionCheck();
    await flushPromises();

    expect(useAppUpdateStore.getState().status).toBe('optional-update');
    // Deferred — should not be visible while the billing modal is up.
    expect(useAppUpdateStore.getState().isPromptVisible).toBe(false);
  });

  // ── Mandatory update after returning from the store ──────────────────────
  it('re-evaluates mandatory update after returning from the store', async () => {
    // First check: mandatory update required.
    mockedFetchAppVersion.mockResolvedValueOnce({
      platform: 'android',
      latest_version: '1.4.0',
      minimum_version: '1.5.0',
      force_update: false,
      store_url: 'https://play.google.com/...',
    });

    await runAppVersionCheck();
    await flushPromises();
    expect(useAppUpdateStore.getState().status).toBe('mandatory-update');

    // Simulate the user returning from the store after installing a new version.
    // Reset the throttle so the next check actually runs.
    useAppUpdateStore.getState().setLastCheckedAt(0);
    // The user installed 1.5.0 while at the store.
    mockedApplication.nativeApplicationVersion = '1.5.0';

    // New check: now the user is up to date (1.5.0 >= 1.4.0 latest).
    mockedFetchAppVersion.mockResolvedValueOnce({
      platform: 'android',
      latest_version: '1.4.0',
      minimum_version: '1.0.0',
      force_update: false,
      store_url: 'https://play.google.com/...',
    });

    await runAppVersionCheck();
    await flushPromises();

    expect(useAppUpdateStore.getState().status).toBe('no-update');
    expect(useAppUpdateStore.getState().isPromptVisible).toBe(false);
  });
});
