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
      // Merge the PUT response with the existing cached profile to preserve
      // fields the update endpoint may not return (e.g. photos with signed URLs).
      // Replacing the cache outright can cause the avatar to disappear briefly
      // until the background refetch completes.
      queryClient.setQueryData<ProfileMeDto>(PROFILE_ME_QUERY_KEY, (prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              photos: updated.photos?.length ? updated.photos : prev.photos,
              primary_photo_url: updated.primary_photo_url || prev.primary_photo_url,
            }
          : updated,
      );
      queryClient.invalidateQueries({ queryKey: PROFILE_ME_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
    },
  });
}
