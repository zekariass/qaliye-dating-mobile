import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { GpsLocationPayload, ManualLocationPayload } from '@/types/api';
import { updateProfileLocation } from '@/api/profile/profileApi';

export function useUpdateProfileLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: GpsLocationPayload | ManualLocationPayload) =>
      updateProfileLocation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'location'] });
    },
  });
}
