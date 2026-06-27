import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ReactNode } from 'react';
import { Alert } from 'react-native';

import { revisitPassedProfiles } from '@/api/discovery/discoveryApi';

import { ReviewPassedProfilesSheet } from '../ReviewPassedProfilesSheet';

jest.mock('@/api/discovery/discoveryApi', () => ({
  revisitPassedProfiles: jest.fn(),
}));

jest.mock('axios', () => ({
  isAxiosError: jest.fn((error: unknown) => !!((error as any)?.response?.status)),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, ...args: any[]) => {
      const options = args.length > 1 ? args[1] : args[0];
      const defaultValue = typeof args[0] === 'string' ? args[0] : options?.defaultValue;
      let value = defaultValue || key;
      const opts = typeof options === 'object' ? options : {};
      value = value.replace(/\{\{count\}\}/g, opts.count ?? '');
      return value;
    },
  }),
}));

const mockRevisit = revisitPassedProfiles as jest.Mock;
const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('ReviewPassedProfilesSheet', () => {
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

  function renderSheet(visible = true) {
    return render(
      <ReviewPassedProfilesSheet visible={visible} onClose={jest.fn()} />,
      { wrapper },
    );
  }

  it('renders only Last 10, Last 20, and Last 30 options', () => {
    renderSheet();

    expect(screen.getByTestId('revisit-count-10')).toBeTruthy();
    expect(screen.getByTestId('revisit-count-20')).toBeTruthy();
    expect(screen.getByTestId('revisit-count-30')).toBeTruthy();
  });

  it('calls POST /api/v1/discovery/passes/revisit?count=10 when selecting Last 10 and confirming', async () => {
    mockRevisit.mockResolvedValue({ success: true, reopenedCount: 3 });
    renderSheet();

    fireEvent.press(screen.getByTestId('revisit-count-10'));
    fireEvent.press(screen.getByTestId('revisit-confirm'));

    await waitFor(() => expect(mockRevisit).toHaveBeenCalledWith(10));
  });

  it('calls POST /api/v1/discovery/passes/revisit?count=20 when selecting Last 20 and confirming', async () => {
    mockRevisit.mockResolvedValue({ success: true, reopenedCount: 0 });
    renderSheet();

    fireEvent.press(screen.getByTestId('revisit-count-20'));
    fireEvent.press(screen.getByTestId('revisit-confirm'));

    await waitFor(() => expect(mockRevisit).toHaveBeenCalledWith(20));
  });

  it('calls POST /api/v1/discovery/passes/revisit?count=30 when selecting Last 30 and confirming', async () => {
    mockRevisit.mockResolvedValue({ success: true, reopenedCount: 7 });
    renderSheet();

    fireEvent.press(screen.getByTestId('revisit-count-30'));
    fireEvent.press(screen.getByTestId('revisit-confirm'));

    await waitFor(() => expect(mockRevisit).toHaveBeenCalledWith(30));
  });

  it('shows the correct success message when reopenedCount > 0', async () => {
    mockRevisit.mockResolvedValue({ success: true, reopenedCount: 5 });
    renderSheet();

    fireEvent.press(screen.getByTestId('revisit-count-10'));
    fireEvent.press(screen.getByTestId('revisit-confirm'));

    await waitFor(() => expect(mockRevisit).toHaveBeenCalled());

    expect(mockAlert).toHaveBeenCalledWith(
      'Profiles reopened',
      '5 previously passed profiles are available in Discovery again.',
      expect.any(Array),
    );
  });

  it('shows the correct success message when reopenedCount = 0', async () => {
    mockRevisit.mockResolvedValue({ success: true, reopenedCount: 0 });
    renderSheet();

    fireEvent.press(screen.getByTestId('revisit-count-10'));
    fireEvent.press(screen.getByTestId('revisit-confirm'));

    await waitFor(() => expect(mockRevisit).toHaveBeenCalled());

    expect(mockAlert).toHaveBeenCalledWith(
      'Profiles reopened',
      'No eligible previously passed profiles are available right now.',
      [{ text: 'OK' }],
    );
  });

  it('shows the correct singular success message when reopenedCount = 1', async () => {
    mockRevisit.mockResolvedValue({ success: true, reopenedCount: 1 });
    renderSheet();

    fireEvent.press(screen.getByTestId('revisit-count-10'));
    fireEvent.press(screen.getByTestId('revisit-confirm'));

    await waitFor(() => expect(mockRevisit).toHaveBeenCalled());

    expect(mockAlert).toHaveBeenCalledWith(
      'Profiles reopened',
      '1 previously passed profile is available in Discovery again.',
      expect.any(Array),
    );
  });

  it('prevents duplicate confirm taps while the mutation is pending', async () => {
    let resolveRequest!: (value: { success: boolean; reopenedCount: number }) => void;
    mockRevisit.mockImplementation(
      () =>
        new Promise<{ success: boolean; reopenedCount: number }>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    renderSheet();

    fireEvent.press(screen.getByTestId('revisit-count-20'));
    fireEvent.press(screen.getByTestId('revisit-confirm'));
    fireEvent.press(screen.getByTestId('revisit-confirm'));

    await waitFor(() => expect(mockRevisit).toHaveBeenCalledTimes(1));

    resolveRequest({ success: true, reopenedCount: 2 });

    await waitFor(() => expect(mockAlert).toHaveBeenCalled());
  });

  it('shows standard error feedback and does not invalidate Discovery cache on failure', async () => {
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    mockRevisit.mockRejectedValue(new Error('Network Error'));
    renderSheet();

    fireEvent.press(screen.getByTestId('revisit-count-10'));
    fireEvent.press(screen.getByTestId('revisit-confirm'));

    await waitFor(() => expect(mockRevisit).toHaveBeenCalled());

    expect(mockAlert).toHaveBeenCalledWith(
      'Could not reopen',
      'Something went wrong. Please try again.',
      [{ text: 'Try again' }],
    );
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('shows a validation error for 400 responses without retrying', async () => {
    mockRevisit.mockRejectedValue(Object.assign(new Error('Bad Request'), { response: { status: 400 } }));
    renderSheet();

    fireEvent.press(screen.getByTestId('revisit-count-10'));
    fireEvent.press(screen.getByTestId('revisit-confirm'));

    await waitFor(() => expect(mockRevisit).toHaveBeenCalled());

    expect(mockAlert).toHaveBeenCalledWith(
      'Could not reopen',
      "This request isn't valid right now.",
      [{ text: 'Try again' }],
    );
  });

  it('shows a forbidden error for 403 responses', async () => {
    mockRevisit.mockRejectedValue(Object.assign(new Error('Forbidden'), { response: { status: 403 } }));
    renderSheet();

    fireEvent.press(screen.getByTestId('revisit-count-10'));
    fireEvent.press(screen.getByTestId('revisit-confirm'));

    await waitFor(() => expect(mockRevisit).toHaveBeenCalled());

    expect(mockAlert).toHaveBeenCalledWith(
      'Could not reopen',
      "You can't use Discovery right now.",
      [{ text: 'Try again' }],
    );
  });

  it('does not render profile cards, feed, or pagination elements', () => {
    renderSheet();

    expect(screen.queryByTestId('revisit-profile-card')).toBeNull();
    expect(screen.queryByTestId('revisit-feed')).toBeNull();
    expect(screen.queryByTestId('revisit-cursor')).toBeNull();
  });
});
