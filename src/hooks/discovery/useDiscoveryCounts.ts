import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { fetchDiscoveryCounts } from '@/api/discovery/discoveryApi';
import type { DiscoveryCountsDto } from '@/types/discovery';

export const DISCOVERY_COUNTS_KEY = ['discovery', 'counts'] as const;

const POLL_INTERVAL_MS = 60_000;

/**
 * Polls `GET /api/v1/discovery/counts` every 60 s while the app is in the
 * foreground. Stops polling when the app is backgrounded.
 */
export function useDiscoveryCounts() {
  const [isActive, setIsActive] = useState(
    AppState.currentState === 'active',
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setIsActive(state === 'active');
    });
    return () => sub.remove();
  }, []);

  return useQuery<DiscoveryCountsDto, Error>({
    queryKey: DISCOVERY_COUNTS_KEY,
    queryFn: fetchDiscoveryCounts,
    refetchInterval: isActive ? POLL_INTERVAL_MS : false,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}
