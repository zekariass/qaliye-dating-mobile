import { useMutation, useQueryClient } from '@tanstack/react-query';

import { rewindLastAction } from '@/api/discovery/discoveryApi';
import { ENTITLEMENTS_KEY } from '@/hooks/billing/useEntitlements';
import { RewindResponse } from '@/types/discovery';

export function useRewind() {
  const qc = useQueryClient();
  return useMutation<RewindResponse, Error, void>({
    mutationFn: rewindLastAction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
    },
  });
}
