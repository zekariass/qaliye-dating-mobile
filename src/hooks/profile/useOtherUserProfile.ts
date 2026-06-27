import { useQuery } from '@tanstack/react-query';

import { fetchOtherUserProfile } from '@/api/profile/profileApi';
import type { OtherUserProfileDto } from '@/types/profile';

export function useOtherUserProfile(userId: string) {
  return useQuery<OtherUserProfileDto, Error>({
    queryKey: ['profile', 'user', userId],
    queryFn: () => fetchOtherUserProfile(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
}
