/**
 * Extracts the server-provided retry delay (seconds) from an axios error.
 *
 * Priority: `error.details.retry_after_seconds` in the body → the standard
 * `Retry-After` header (axios lower-cases header names) → "retry after N
 * seconds" phrasing in the error message. Returns null when the response
 * carries no hint — callers must never guess a duration since cooldowns
 * are server-configured.
 */
export function extractRetryAfterSeconds(err: unknown): number | null {
  const response = (err as { response?: any })?.response;

  const parse = (v: unknown): number | null => {
    const n = Number.parseInt(String(v ?? ''), 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const details = response?.data?.error?.details;
  const fromDetails = parse(
    details?.retry_after_seconds ?? details?.retryAfterSeconds ?? details?.next_remind_in_seconds,
  );
  if (fromDetails != null) return fromDetails;

  const header = response?.headers?.['retry-after'];
  const fromHeader = parse(Array.isArray(header) ? header[0] : header);
  if (fromHeader != null) return fromHeader;

  const message: unknown =
    response?.data?.error?.message ?? response?.data?.message;
  if (typeof message === 'string') {
    const match = message.match(/retry after (\d+)\s*seconds?/i);
    if (match) return parse(match[1]);
  }

  return null;
}
