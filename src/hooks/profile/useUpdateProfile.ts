import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateProfileMe } from '@/api/profile/profileApi';
import { ENTITLEMENTS_KEY } from '@/hooks/billing/useEntitlements';
import type { ProfileMeDto, ProfileUpdateRequest } from '@/types/profile';

import { PROFILE_ME_QUERY_KEY } from './useCurrentProfile';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<ProfileMeDto, Error, ProfileUpdateRequest>({
    mutationFn: updateProfileMe,
    onSuccess: (updated) => {
      queryClient.setQueryData<ProfileMeDto>(PROFILE_ME_QUERY_KEY, updated);
      queryClient.invalidateQueries({ queryKey: PROFILE_ME_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
    },
  });
}
