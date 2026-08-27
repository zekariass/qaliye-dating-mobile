// ---------------------------------------------------------------------------
// App Version API
// ---------------------------------------------------------------------------
//
// Unauthenticated endpoint — uses a dedicated lightweight axios instance so
// that it never requires a Supabase session, never triggers auth-error
// interceptors, and can be called before the user has logged in.
// ---------------------------------------------------------------------------

import axios from 'axios';
import { Platform } from 'react-native';

// Minimal client — no auth headers, no interceptors.
const versionClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppVersionResponse = {
  platform: string;
  latest_version: string;
  minimum_version: string;
  force_update: boolean;
  store_url: string;
};

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidAppVersionResponse(data: unknown): data is AppVersionResponse {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.platform === 'string' &&
    typeof d.latest_version === 'string' &&
    typeof d.minimum_version === 'string' &&
    typeof d.force_update === 'boolean' &&
    typeof d.store_url === 'string'
  );
}

// ─── API call ─────────────────────────────────────────────────────────────────

/**
 * Fetch the current app version configuration from the backend.
 *
 * @param platform - 'android' or 'ios'. Defaults to the current device's
 *   platform via `Platform.OS`. Exposed as a parameter for testability.
 *
 * Throws when:
 *  - the network is unreachable or the server returns an error, OR
 *  - the response is missing required fields.
 *
 * Callers should catch and treat all errors as "fail-open" (no update prompt).
 */
export async function fetchAppVersion(
  platform: 'android' | 'ios' = Platform.OS === 'ios' ? 'ios' : 'android',
): Promise<AppVersionResponse> {
  const response = await versionClient.get<unknown>('/api/v1/app/version', {
    params: { platform },
  });

  if (!isValidAppVersionResponse(response.data)) {
    throw new Error('[AppVersion] Invalid or incomplete response from server');
  }

  return response.data;
}
