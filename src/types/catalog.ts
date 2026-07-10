// ─── Catalog Types ────────────────────────────────────────────────────────────
// Shared types for country-scoped language and ethnicity catalog entries.

export type LanguageOption = {
  id: string;           // UUID from backend
  code: string;         // BCP-47 language code, e.g. "am", "ti", "om"
  country_code: string; // ISO 3166-1 alpha-2, e.g. "ET", "ER"
  name: string;         // English display name, e.g. "Amharic"
  native_name: string | null; // Native name, e.g. "አማርኛ"
};

export type EthnicityOption = {
  id: string;           // UUID from backend
  code: string;         // Stable code, e.g. "AMHARA", "TIGRINYA"
  country_code: string; // ISO 3166-1 alpha-2, e.g. "ET", "ER"
  name: string;         // English display name, e.g. "Amhara"
  region: string | null; // Optional sub-region label
};

export type CatalogQuery = {
  countryCode?: string; // URL query param — camelCase per Spring Boot @RequestParam
  q?: string;
  limit?: number;
  offset?: number;
};

export type LanguageCatalogResponse = {
  items: LanguageOption[];
  total: number;
};

export type EthnicityCatalogResponse = {
  items: EthnicityOption[];
  total: number;
};
