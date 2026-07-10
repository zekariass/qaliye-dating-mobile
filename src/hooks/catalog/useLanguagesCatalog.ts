import { useQuery } from '@tanstack/react-query';

import { fetchLanguagesCatalog } from '@/api/catalog/catalogApi';
import type { CatalogQuery, LanguageCatalogResponse } from '@/types/catalog';

export function languagesCatalogKey(query: CatalogQuery) {
  return ['catalog', 'languages', query] as const;
}

export function useLanguagesCatalog(query: CatalogQuery = {}) {
  return useQuery<LanguageCatalogResponse, Error>({
    queryKey: languagesCatalogKey(query),
    queryFn: () => fetchLanguagesCatalog(query),
    staleTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
  });
}
