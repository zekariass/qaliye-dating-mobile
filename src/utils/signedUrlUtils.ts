// ─── Signed URL Utilities ─────────────────────────────────────────────────────
// Supabase Storage signed URLs are time-limited (TTL set by SIGNED_URL_TTL_SECONDS
// on the backend, e.g. 2 hours). These utilities keep React Query staleTime aligned
// with the actual URL expiry so the cache never serves an expired photo URL.

/** Safety buffer before a URL expires during which we consider it already stale. */
export const SIGNED_URL_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

/** Minimum staleTime so we never trigger an immediate unnecessary refetch. */
const MIN_STALE_MS = 30_000; // 30 seconds

/**
 * Compute a React Query `staleTime` value that keeps cached data fresh until
 * the earliest signed URL in the list is about to expire.
 *
 * Pass `query.state.data?.photos?.map(p => p.expires_at)` (or equivalent)
 * from a React Query v5 `staleTime` function.
 *
 * @param expiresAtList  ISO-8601 expiry strings from the API response.
 * @param bufferMs       How many ms before expiry to consider the URL stale (default 5 min).
 * @param fallbackMs     Returned when no valid expiry is found (default 5 min).
 */
export function computePhotoStaleTime(
  expiresAtList: (string | null | undefined)[],
  bufferMs: number = SIGNED_URL_BUFFER_MS,
  fallbackMs: number = 5 * 60 * 1000,
): number {
  const timestamps = expiresAtList
    .filter(Boolean)
    .map((s) => new Date(s!).getTime())
    .filter((t) => !isNaN(t));

  if (!timestamps.length) return fallbackMs;

  const minExpiry = Math.min(...timestamps);
  const timeUntilExpiry = minExpiry - Date.now() - bufferMs;
  return Math.max(MIN_STALE_MS, timeUntilExpiry);
}

/**
 * Returns true when a signed URL is at or within `bufferMs` of its expiry.
 */
export function isSignedUrlNearExpiry(
  expiresAt: string,
  bufferMs: number = SIGNED_URL_BUFFER_MS,
): boolean {
  const expiry = new Date(expiresAt).getTime();
  return isNaN(expiry) || expiry - Date.now() < bufferMs;
}
