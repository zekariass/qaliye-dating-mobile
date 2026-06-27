import { useQuery } from '@tanstack/react-query';

import { fetchProfileMe } from '@/api/profile/profileApi';
import type { ProfileMeDto } from '@/types/profile';

export const PROFILE_ME_QUERY_KEY = ['profile', 'me'] as const;

export function useCurrentProfile() {
  return useQuery<ProfileMeDto, Error>({
    queryKey: PROFILE_ME_QUERY_KEY,
    queryFn: fetchProfileMe,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
}
