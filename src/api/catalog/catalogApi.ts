import { apiClient } from '@/api/apiClient';
import type {
    CatalogQuery,
    EthnicityCatalogResponse,
    EthnicityOption,
    LanguageCatalogResponse,
    LanguageOption,
} from '@/types/catalog';

// ─── Languages Catalog ───────────────────────────────────────────────────────

export async function fetchLanguagesCatalog(
  query: CatalogQuery = {},
): Promise<LanguageCatalogResponse> {
  const params: Record<string, string | number> = {};
  if (query.countryCode) params.countryCode = query.countryCode;
  if (query.q) params.q = query.q;
  if (query.limit != null) params.limit = query.limit;
  if (query.offset != null) params.offset = query.offset;

  // Backend returns a plain array, not a wrapped object
  const response = await apiClient.get<LanguageOption[]>(
    '/api/v1/catalog/languages',
    { params },
  );
  const items = Array.isArray(response.data) ? response.data : [];
  return { items, total: items.length };
}

// ─── Ethnicities Catalog ─────────────────────────────────────────────────────

export async function fetchEthnicitiesCatalog(
  query: CatalogQuery = {},
): Promise<EthnicityCatalogResponse> {
  const params: Record<string, string | number> = {};
  if (query.countryCode) params.countryCode = query.countryCode;
  if (query.q) params.q = query.q;
  if (query.limit != null) params.limit = query.limit;
  if (query.offset != null) params.offset = query.offset;

  // Backend returns a plain array, not a wrapped object
  const response = await apiClient.get<EthnicityOption[]>(
    '/api/v1/catalog/ethnicities',
    { params },
  );
  const items = Array.isArray(response.data) ? response.data : [];
  return { items, total: items.length };
}
