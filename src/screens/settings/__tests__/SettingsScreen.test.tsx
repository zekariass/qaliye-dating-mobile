import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ReactNode } from 'react';

import { Colors } from '@/constants/theme';
import SettingsScreen from '../SettingsScreen';

jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({ colors: Colors.light, mode: 'light' }),
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

jest.mock('@/hooks/notifications/useSignOutWithDeactivation', () => ({
  useSignOutWithDeactivation: () => ({ signOut: jest.fn() }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    canGoBack: jest.fn().mockReturnValue(false),
    back: jest.fn(),
    replace: jest.fn(),
  }),
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
});
