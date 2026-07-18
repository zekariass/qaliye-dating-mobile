import { useQuery } from '@tanstack/react-query';

import { fetchOtherUserProfile } from '@/api/profile/profileApi';
import type { OtherUserProfileDto } from '@/types/profile';
import { computePhotoStaleTime } from '@/utils/signedUrlUtils';

export function useOtherUserProfile(userId: string) {
  return useQuery<OtherUserProfileDto, Error>({
    queryKey: ['profile', 'user', userId],
    queryFn: () => fetchOtherUserProfile(userId),
    enabled: !!userId,
    staleTime: (query) => {
      const data = query.state.data as OtherUserProfileDto | undefined;
      return computePhotoStaleTime(data?.photos?.map((p) => p.expires_at) ?? []);
    },
    retry: 2,
  });
}
