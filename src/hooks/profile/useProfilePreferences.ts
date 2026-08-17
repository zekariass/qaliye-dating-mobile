import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchProfilePreferences,
  updateProfilePreferences,
} from '@/api/profile/profileApi';
import type {
  ProfileDiscoveryPreferencesDto,
  ProfilePreferencesUpdateRequest,
} from '@/types/profile';

import { ENTITLEMENTS_KEY } from '@/hooks/billing/useEntitlements';
import { PROFILE_ME_QUERY_KEY } from './useCurrentProfile';

export const PROFILE_PREFS_QUERY_KEY = ['profile', 'preferences'] as const;

export function useProfilePreferences() {
  return useQuery<ProfileDiscoveryPreferencesDto, Error>({
    queryKey: PROFILE_PREFS_QUERY_KEY,
    queryFn: fetchProfilePreferences,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateProfilePreferences() {
  const queryClient = useQueryClient();

  return useMutation<ProfileDiscoveryPreferencesDto, Error, ProfilePreferencesUpdateRequest>({
    mutationFn: updateProfilePreferences,
    onSuccess: (data) => {
      queryClient.setQueryData<ProfileDiscoveryPreferencesDto>(PROFILE_PREFS_QUERY_KEY, data);
      queryClient.invalidateQueries({ queryKey: PROFILE_ME_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['discovery', 'profiles'] });
      queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
    },
  });
}
