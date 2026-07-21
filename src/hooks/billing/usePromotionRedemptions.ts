import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { fetchPromotionRedemptions } from '@/api/billing/billingApi';
import type { UserRedemptionDto } from '@/types/billing';

export const REDEMPTIONS_KEY = ['billing', 'promotions', 'redemptions'] as const;

export function usePromotionRedemptions(enabled = true) {
  const qc = useQueryClient();

  const query = useQuery<UserRedemptionDto[]>({
    queryKey: REDEMPTIONS_KEY,
    queryFn: () => fetchPromotionRedemptions({ page: 1, page_size: 50 }),
    staleTime: 2 * 60_000,
    retry: 1,
    enabled,
  });

  const refreshRedemptions = useCallback(
    () => qc.invalidateQueries({ queryKey: REDEMPTIONS_KEY }),
    [qc],
  );

  return {
    ...query,
    redemptions: query.data ?? [],
    refreshRedemptions,
  };
}
