// ---------------------------------------------------------------------------
// Links API
// ---------------------------------------------------------------------------
//
// Public (unauthenticated) endpoint for fetching configurable app links
// (terms, privacy, App Store, Play Store). Uses a dedicated lightweight
// axios instance — no Supabase session, no auth interceptors.
//
// Links are fetched on demand (when the user taps a link) and cached briefly
// in memory so repeated taps don't re-hit the network.
// ---------------------------------------------------------------------------

import axios from 'axios';

// Minimal client — no auth headers, no interceptors.
const linksClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Types ────────────────────────────────────────────────────────────────────

/** Canonical link keys understood by the backend. */
export type LinkKey = 'terms' | 'privacy' | 'ios_app_store' | 'play_store';

export type LinksResponse = {
  terms: string;
  privacy: string;
  ios_app_store: string;
  play_store: string;
};

export type SingleLinkResponse = {
  key: string;
  url: string;
};

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidSingleLinkResponse(data: unknown): data is SingleLinkResponse {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return typeof d.key === 'string' && typeof d.url === 'string';
}

// ─── In-memory cache (short TTL) ──────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, { url: string; expiresAt: number }>();

function getCached(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.url;
}

function setCached(key: string, url: string): void {
  cache.set(key, { url, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * Fetch a single link by key from the backend.
 *
 * Results are cached in memory for `CACHE_TTL_MS` so repeated taps within
 * the TTL window don't re-hit the network.
 *
 * Throws when the network is unreachable, the server returns an error,
 * or the response is malformed. Callers should catch and show a fallback.
 */
export async function fetchLink(key: LinkKey): Promise<string> {
  const cached = getCached(key);
  if (cached) return cached;

  const response = await linksClient.get<unknown>('/api/v1/links', {
    params: { key },
  });

  if (!isValidSingleLinkResponse(response.data)) {
    throw new Error('[Links] Invalid or incomplete response from server');
  }

  const url = response.data.url;
  setCached(key, url);
  return url;
}

/**
 * Fetch all links at once. Useful when multiple links are needed
 * simultaneously (e.g., a screen showing both Terms and Privacy).
 */
export async function fetchAllLinks(): Promise<LinksResponse> {
  const response = await linksClient.get<unknown>('/api/v1/links');

  if (!response.data || typeof response.data !== 'object') {
    throw new Error('[Links] Invalid or incomplete response from server');
  }

  const d = response.data as Record<string, unknown>;
  if (
    typeof d.terms !== 'string' ||
    typeof d.privacy !== 'string' ||
    typeof d.ios_app_store !== 'string' ||
    typeof d.play_store !== 'string'
  ) {
    throw new Error('[Links] Invalid or incomplete response from server');
  }

  // Populate cache for individual fetches
  setCached('terms', d.terms);
  setCached('privacy', d.privacy);
  setCached('ios_app_store', d.ios_app_store);
  setCached('play_store', d.play_store);

  return d as LinksResponse;
}
