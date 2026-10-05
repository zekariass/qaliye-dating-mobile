import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    fetchMatchmakingPreferences,
    updateMatchmakingPreferences,
} from '@/api/matchmaking/matchmakingApi';
import type {
    MatchmakingPreferencesDto,
    MatchmakingPreferencesPayload,
} from '@/types/matchmaking';

export const MM_PREFS_QUERY_KEY = ['matchmaking', 'preferences'] as const;
export { MM_ACTIVE_REQUEST_QUERY_KEY } from './useMatchmakingRequest';

/** `null` data = user has never set preferences. */
export function useMatchmakingPreferences() {
  return useQuery<MatchmakingPreferencesDto | null, Error>({
    queryKey: MM_PREFS_QUERY_KEY,
    queryFn: fetchMatchmakingPreferences,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateMatchmakingPreferences() {
  const queryClient = useQueryClient();
  return useMutation<MatchmakingPreferencesDto, Error, MatchmakingPreferencesPayload>({
    mutationFn: updateMatchmakingPreferences,
    onSuccess: (data) => {
      queryClient.setQueryData<MatchmakingPreferencesDto | null>(MM_PREFS_QUERY_KEY, data);
    },
  });
}
