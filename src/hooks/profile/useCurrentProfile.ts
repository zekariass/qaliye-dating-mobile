import { useQuery } from '@tanstack/react-query';

import { fetchProfileMe } from '@/api/profile/profileApi';
import type { ProfileMeDto } from '@/types/profile';
import { computePhotoStaleTime } from '@/utils/signedUrlUtils';

export const PROFILE_ME_QUERY_KEY = ['profile', 'me'] as const;

export function useCurrentProfile() {
  return useQuery<ProfileMeDto, Error>({
    queryKey: PROFILE_ME_QUERY_KEY,
    queryFn: fetchProfileMe,
    staleTime: (query) => {
      const data = query.state.data as ProfileMeDto | undefined;
      return computePhotoStaleTime(data?.photos?.map((p) => p.expires_at) ?? []);
    },
    retry: 2,
  });
}
