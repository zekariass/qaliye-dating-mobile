import { useQuery } from '@tanstack/react-query';

import { fetchBlindDateConfiguration } from '@/api/blindDate/blindDateApi';
import type { BlindDateConfigurationDto } from '@/types/blindDate';

export const BLIND_DATE_CONFIG_KEY = ['blindDate', 'configuration'] as const;

export function useBlindDateConfiguration() {
  const query = useQuery<BlindDateConfigurationDto>({
    queryKey: BLIND_DATE_CONFIG_KEY,
    queryFn: fetchBlindDateConfiguration,
    staleTime: 60_000,
    retry: 2,
  });

  return { ...query, configuration: query.data ?? null };
}
