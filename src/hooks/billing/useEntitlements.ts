import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { fetchEntitlements } from '@/api/billing/billingApi';
import type { EntitlementResponse } from '@/types/billing';

export const ENTITLEMENTS_KEY = ['billing', 'entitlements'] as const;

export function useEntitlements() {
  const qc = useQueryClient();

  const query = useQuery<EntitlementResponse>({
    queryKey: ENTITLEMENTS_KEY,
    queryFn: fetchEntitlements,
    staleTime: 30_000,
    retry: 2,
  });

  const refreshEntitlements = useCallback(
    () => qc.invalidateQueries({ queryKey: ENTITLEMENTS_KEY }),
    [qc],
  );

  return {
    ...query,
    entitlements: query.data ?? null,
    refreshEntitlements,
  };
}
