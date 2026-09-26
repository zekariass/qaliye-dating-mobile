import { useQuery } from '@tanstack/react-query';

import { fetchCatalogCategories, fetchCatalogQuestions } from '@/api/blindDate/blindDateApi';
import type {
    BlindDateCatalogCategoryDto,
    BlindDateCatalogQuestionDto,
} from '@/types/blindDate';
import { extractApiError } from '@/utils/apiError';

export const BLIND_DATE_CATALOG_KEY = ['blindDate', 'catalog'] as const;

/**
 * Catalog is language-scoped. If the server rejects a language with
 * `unsupported_language`, fall back to 'en' for the next fetch.
 */
export function useCatalogCategories(language: string, enabled = true) {
  const query = useQuery<BlindDateCatalogCategoryDto[]>({
    queryKey: [...BLIND_DATE_CATALOG_KEY, 'categories', language],
    queryFn: async () => {
      try {
        return await fetchCatalogCategories(language);
      } catch (err) {
        if (extractApiError(err).code.toLowerCase() === 'unsupported_language') {
          return fetchCatalogCategories('en');
        }
        throw err;
      }
    },
    staleTime: 5 * 60_000,
    enabled,
  });
  return { ...query, categories: query.data ?? [] };
}

export function useCatalogQuestions(
  language: string,
  categoryId: string | null,
  enabled = true,
) {
  const query = useQuery<BlindDateCatalogQuestionDto[]>({
    queryKey: [...BLIND_DATE_CATALOG_KEY, 'questions', language, categoryId ?? 'all'],
    queryFn: async () => {
      try {
        return await fetchCatalogQuestions(language, categoryId ?? undefined);
      } catch (err) {
        if (extractApiError(err).code.toLowerCase() === 'unsupported_language') {
          return fetchCatalogQuestions('en', categoryId ?? undefined);
        }
        throw err;
      }
    },
    staleTime: 5 * 60_000,
    enabled,
  });
  return { ...query, questions: query.data ?? [] };
}
