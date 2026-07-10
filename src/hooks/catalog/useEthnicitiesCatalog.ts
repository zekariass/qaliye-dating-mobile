import { useQuery } from '@tanstack/react-query';

import { fetchEthnicitiesCatalog } from '@/api/catalog/catalogApi';
import type { CatalogQuery, EthnicityCatalogResponse } from '@/types/catalog';

export function ethnicitiesCatalogKey(query: CatalogQuery) {
  return ['catalog', 'ethnicities', query] as const;
}

export function useEthnicitiesCatalog(query: CatalogQuery = {}) {
  return useQuery<EthnicityCatalogResponse, Error>({
    queryKey: ethnicitiesCatalogKey(query),
    queryFn: () => fetchEthnicitiesCatalog(query),
    staleTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
  });
}
