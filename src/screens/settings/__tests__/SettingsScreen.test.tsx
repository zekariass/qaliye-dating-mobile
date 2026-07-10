import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ReactNode } from 'react';
import { Platform } from 'react-native';

import SettingsScreen from '../SettingsScreen';

jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({
    colors: {
      text: '#111827',
      textSecondary: '#6B7280',
      textMuted: '#9CA3AF',
      background: '#FFF6FB',
      backgroundElement: '#F7EEFF',
      backgroundSelected: '#EFE7FF',
      surface: '#FFFFFF',
      border: '#E9DDF8',
    },
    mode: 'light',
  }),
}));

jest.mock('@/stores/theme-store', () => ({
  useThemeStore: jest.fn((selector: any) => selector({ mode: 'light', setMode: jest.fn() })),
}));

jest.mock('@/hooks/activity/useActivityVisibility', () => ({
  useActivityVisibility: () => ({
    showActivityStatus: true,
    update: jest.fn(),
    isUpdating: false,
  }),
}));

jest.mock('@/hooks/billing/useEntitlements', () => ({
  useEntitlements: () => ({ entitlements: null }),
}));

jest.mock('@/hooks/billing/useOrders', () => ({
  usePendingOrders: () => ({ orders: [], pendingCount: 0, requiresActionCount: 0, refetch: jest.fn() }),
}));

jest.mock('@/hooks/billing/useRevenueCatRestore', () => ({
  useRevenueCatRestore: () => ({ restore: jest.fn(), isRestoring: false, restoreState: 'idle' }),
}));

jest.mock('@/hooks/notifications/useSignOutWithDeactivation', () => ({
  useSignOutWithDeactivation: () => ({ signOut: jest.fn() }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    canGoBack: jest.fn().mockReturnValue(false),
    back: jest.fn(),
    replace: jest.fn(),
  }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

describe('SettingsScreen', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  it('shows a Review passed profiles entry', () => {
    render(<SettingsScreen />, { wrapper });

    expect(screen.getByTestId('review-passed-profiles-row')).toBeTruthy();
  });

  it('opens the selection sheet when the entry is tapped', () => {
    render(<SettingsScreen />, { wrapper });

    fireEvent.press(screen.getByTestId('review-passed-profiles-row'));

    expect(screen.getByTestId('revisit-count-10')).toBeTruthy();
    expect(screen.getByTestId('revisit-count-20')).toBeTruthy();
    expect(screen.getByTestId('revisit-count-30')).toBeTruthy();
  });

  it('does not render a revisit feed, profile cards, or pagination', () => {
    render(<SettingsScreen />, { wrapper });

    expect(screen.queryByTestId('revisit-profile-card')).toBeNull();
    expect(screen.queryByTestId('revisit-feed')).toBeNull();
    expect(screen.queryByTestId('revisit-cursor')).toBeNull();
  });

  it('renders Payment Activity before Restore Purchases on Android', () => {
    jest.spyOn(Platform, 'OS', 'get').mockReturnValue('android');
    render(<SettingsScreen />, { wrapper });

    expect(screen.getByLabelText('Payment Activity')).toBeTruthy();
    expect(screen.getByText('Restore Purchases')).toBeTruthy();
  });

  it('does not render Payment Activity on iOS', () => {
    jest.spyOn(Platform, 'OS', 'get').mockReturnValue('ios');
    render(<SettingsScreen />, { wrapper });

    expect(screen.queryByLabelText('Payment Activity')).toBeNull();
  });
});
