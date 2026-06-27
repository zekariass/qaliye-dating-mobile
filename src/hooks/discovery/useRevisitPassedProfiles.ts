import { useMutation, useQueryClient } from '@tanstack/react-query';

import { revisitPassedProfiles } from '@/api/discovery/discoveryApi';
import type { RevisitCount, RevisitPassedProfilesResponse } from '@/types/discovery';

export function useRevisitPassedProfiles() {
  const queryClient = useQueryClient();

  return useMutation<RevisitPassedProfilesResponse, Error, RevisitCount>({
    mutationFn: revisitPassedProfiles,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovery', 'profiles'] });
    },
  });
}
