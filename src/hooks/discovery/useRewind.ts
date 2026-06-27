import { useMutation } from '@tanstack/react-query';

import { rewindLastAction } from '@/api/discovery/discoveryApi';
import { RewindResponse } from '@/types/discovery';

export function useRewind() {
  return useMutation<RewindResponse, Error, void>({
    mutationFn: rewindLastAction,
  });
}
