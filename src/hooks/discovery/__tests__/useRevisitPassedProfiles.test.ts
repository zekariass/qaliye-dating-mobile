import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { ReactNode } from 'react';

import { revisitPassedProfiles } from '@/api/discovery/discoveryApi';

import { useRevisitPassedProfiles } from '../useRevisitPassedProfiles';

jest.mock('@/api/discovery/discoveryApi', () => ({
  revisitPassedProfiles: jest.fn(),
}));

const mockRevisit = revisitPassedProfiles as jest.Mock;

describe('useRevisitPassedProfiles', () => {
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

  it('calls the revisit endpoint with the selected count', async () => {
    mockRevisit.mockResolvedValue({ success: true, reopenedCount: 5 });
    const { result } = renderHook(() => useRevisitPassedProfiles(), { wrapper });

    result.current.mutate(20);

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockRevisit).toHaveBeenCalledWith(20);
  });

  it('invalidates the discovery profiles query on success', async () => {
    mockRevisit.mockResolvedValue({ success: true, reopenedCount: 5 });
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRevisitPassedProfiles(), { wrapper });

    result.current.mutate(10);

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['discovery', 'profiles'] });
  });

  it('does not invalidate the discovery profiles query on failure', async () => {
    mockRevisit.mockRejectedValue(new Error('Network Error'));
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useRevisitPassedProfiles(), { wrapper });

    result.current.mutate(30);

    await waitFor(() => expect(result.current.isPending).toBe(false));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('prevents simultaneous duplicate mutations while pending', async () => {
    let resolveRequest!: (value: { success: boolean; reopenedCount: number }) => void;
    mockRevisit.mockImplementation(
      () =>
        new Promise<{ success: boolean; reopenedCount: number }>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const { result } = renderHook(() => useRevisitPassedProfiles(), { wrapper });

    result.current.mutate(10);

    await waitFor(() => expect(result.current.isPending).toBe(true));

    result.current.mutate(10);

    expect(mockRevisit).toHaveBeenCalledTimes(1);

    resolveRequest({ success: true, reopenedCount: 2 });

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});
