import { useQuery } from '@tanstack/react-query';

import { fetchCountrySettings } from '@/api/billing/billingApi';
import type { CountrySettings } from '@/types/billing';

export const COUNTRY_SETTINGS_KEY = ['billing', 'country-settings'] as const;

export function useCountrySettings() {
  const query = useQuery<CountrySettings>({
    queryKey: COUNTRY_SETTINGS_KEY,
    queryFn: fetchCountrySettings,
    staleTime: 5 * 60_000,
    retry: 2,
  });

  return {
    ...query,
    country_settings: query.data ?? null,
    identity_verification_required: query.data?.identity_verification_required ?? false,
  };
}
