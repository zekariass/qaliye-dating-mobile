import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateProfileLocation } from '@/api/profile/profileApi';
import { ENTITLEMENTS_KEY } from '@/hooks/billing/useEntitlements';
import type { GpsLocationPayload, ManualLocationPayload } from '@/types/api';

export function useUpdateProfileLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: GpsLocationPayload | ManualLocationPayload) =>
      updateProfileLocation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'location'] });
      queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['billing', 'offers'] });
    },
  });
}
