import { Platform } from 'react-native';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useCallback: (fn: unknown) => fn,
}));

import { deactivateDevice } from '@/api/notifications/notificationsApi';
import { supabase } from '@/lib/supabase';
import { readInstallationId } from '@/services/notifications/installationId';
import { useSignOutWithDeactivation } from '../useSignOutWithDeactivation';

jest.mock('@/api/notifications/notificationsApi', () => ({
  deactivateDevice: jest.fn(),
}));

jest.mock('@/services/notifications/installationId', () => ({
  readInstallationId: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { signOut: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock('@/stores/me-store', () => ({
  useMeStore: jest.fn((selector: any) => selector({ clearMe: jest.fn() })),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

const mockDeactivate = deactivateDevice as jest.Mock;
const mockReadId = readInstallationId as jest.Mock;
const mockSignOut = supabase.auth.signOut as jest.Mock;

async function runSignOut() {
  const { signOut } = (useSignOutWithDeactivation as unknown as () => { signOut: () => Promise<void> })();
  await signOut();
}

describe('useSignOutWithDeactivation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls deactivateDevice before supabase.auth.signOut on iOS/Android', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    mockReadId.mockResolvedValue('test-installation-id');
    mockDeactivate.mockResolvedValue(undefined);

    await runSignOut();

    const deactivateOrder = mockDeactivate.mock.invocationCallOrder[0];
    const signOutOrder = mockSignOut.mock.invocationCallOrder[0];
    expect(deactivateOrder).toBeLessThan(signOutOrder);
  });

  it('does not block logout when deactivation returns 404', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'android', configurable: true });
    mockReadId.mockResolvedValue('test-installation-id');
    mockDeactivate.mockRejectedValue(
      Object.assign(new Error('Not Found'), { response: { status: 404 } }),
    );

    await runSignOut();

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('does not block logout on network failure during deactivation', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    mockReadId.mockResolvedValue('test-installation-id');
    mockDeactivate.mockRejectedValue(new Error('Network Error'));

    await runSignOut();

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('skips deactivation attempt on web', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'web', configurable: true });

    await runSignOut();

    expect(mockDeactivate).not.toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('installationId is read (not regenerated) during logout', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'ios', configurable: true });
    mockReadId.mockResolvedValue('stable-id');
    mockDeactivate.mockResolvedValue(undefined);

    await runSignOut();

    expect(mockDeactivate).toHaveBeenCalledWith('stable-id');
  });
});
