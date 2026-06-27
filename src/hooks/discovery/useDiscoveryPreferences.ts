import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    getDiscoveryPreferences,
    putDiscoveryPreferences,
} from '@/api/discovery/discoveryApi';
import type {
    DiscoveryPreferencesDto,
    UpdateDiscoveryPreferencesPayload,
    UpdateDiscoveryPreferencesResponse,
} from '@/types/discovery';

export const DISCOVERY_PREFERENCES_KEY = ['discovery', 'preferences'];

export function useDiscoveryPreferences() {
  return useQuery<DiscoveryPreferencesDto, Error>({
    queryKey: DISCOVERY_PREFERENCES_KEY,
    queryFn: getDiscoveryPreferences,
    retry: (failureCount, error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useUpdateDiscoveryPreferences() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateDiscoveryPreferencesResponse,
    Error,
    UpdateDiscoveryPreferencesPayload
  >({
    mutationFn: putDiscoveryPreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(DISCOVERY_PREFERENCES_KEY, data.preferences);
    },
  });
}
