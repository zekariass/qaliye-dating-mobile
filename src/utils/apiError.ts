// ─── API Error Utilities ───────────────────────────────────────────────────────
// The backend returns a unified error envelope for all endpoints:
//   { "error": { "code": "PHOTO_REJECTED", "message": "..." } }
//
// This module provides a single extraction function so every call site parses
// the same shape rather than duplicating property access chains.

export type ApiErrorDetail = {
  /** Machine-readable error code from the backend, e.g. "PHOTO_REJECTED". */
  code: string;
  /** Human-readable message — safe to show directly to the user for photo errors. */
  message: string;
  /** Raw HTTP status code, if available. */
  status?: number;
};

type AxiosLikeError = {
  response?: {
    status?: number;
    data?: {
      error?: { code?: string; message?: string } | string;
      message?: string;
      detail?: string;
    };
  };
  message?: string;
};

/**
 * Extract a structured `{ code, message, status }` from any axios-style error.
 * Handles the canonical `{ error: { code, message } }` envelope as primary format,
 * with fallbacks for legacy flat shapes and network-level errors.
 */
export function extractApiError(err: unknown): ApiErrorDetail {
  const e = err as AxiosLikeError;
  const status = e?.response?.status;
  const errorField = e?.response?.data?.error;

  if (errorField && typeof errorField === 'object') {
    return {
      code: errorField.code ?? 'UNKNOWN',
      message: errorField.message ?? 'Something went wrong.',
      status,
    };
  }

  if (typeof errorField === 'string') {
    return {
      code: errorField,
      message: e?.response?.data?.message ?? e?.response?.data?.detail ?? 'Something went wrong.',
      status,
    };
  }

  return {
    code: 'UNKNOWN',
    message: e?.message ?? 'Something went wrong. Please try again.',
    status,
  };
}

// ─── Per-code user-facing titles ──────────────────────────────────────────────

export const API_ERROR_TITLES: Record<string, string> = {
  PHOTO_REJECTED: 'Photo not approved',
  PHOTO_LIMIT_EXCEEDED: 'Photo limit reached',
  PHOTO_NOT_FOUND: 'Photo not found',
  INVALID_PRIMARY_PHOTO: 'Cannot set as primary',
  NO_QUALIFIED_PRIMARY_PHOTO: 'Primary photo required',
  VOICE_DURATION_REQUIRED: 'Voice message error',
  VOICE_DURATION_EXCEEDED: 'Voice message too long',
  UNSUPPORTED_AUDIO_TYPE: 'Unsupported audio format',
  VOICE_EXTENSION_DISALLOWED: 'Unsupported file type',
  VOICE_FILE_TOO_LARGE: 'Voice file too large',
  VALIDATION_ERROR: 'Invalid request',
  UNAUTHORIZED: 'Session expired',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Not found',
  CONFLICT: 'Already done',
  RATE_LIMITED: 'Too many requests',
  INTERNAL_ERROR: 'Server error',
  CONFIRMATION_REQUIRED: 'Confirmation required',
  RECENT_AUTH_REQUIRED: 'Re-authentication required',
  ACCOUNT_SUSPENDED: 'Account suspended',
  ACCOUNT_DELETED: 'Account already deleted',
};

/**
 * For error codes where the backend message equals the code (not user-friendly),
 * provide an explicit human-readable override shown to the user instead.
 */
const CUSTOM_ERROR_MESSAGES: Record<string, string> = {
  NO_QUALIFIED_PRIMARY_PHOTO:
    'You need at least one approved photo set as your primary. Set another photo as primary before removing this one.',
  INVALID_PRIMARY_PHOTO:
    'Your primary photo must be an approved photo with a clearly visible face.',
};

/**
 * Returns a user-facing title for the given error code,
 * falling back to a generic title if the code is unknown.
 */
export function getApiErrorTitle(code: string): string {
  return API_ERROR_TITLES[code] ?? 'Something went wrong';
}

/**
 * Returns a user-facing message for the given error, using the backend message
 * when it's safe to show (photo moderation errors), otherwise a generic fallback.
 */
export function getApiErrorMessage(detail: ApiErrorDetail): string {
  if (CUSTOM_ERROR_MESSAGES[detail.code]) {
    return CUSTOM_ERROR_MESSAGES[detail.code];
  }

  const SHOW_BACKEND_MESSAGE_CODES = new Set([
    'PHOTO_REJECTED',
    'PHOTO_LIMIT_EXCEEDED',
    'PHOTO_NOT_FOUND',
    'VALIDATION_ERROR',
    'RATE_LIMITED',
    'VOICE_DURATION_REQUIRED',
    'VOICE_DURATION_EXCEEDED',
    'UNSUPPORTED_AUDIO_TYPE',
    'VOICE_EXTENSION_DISALLOWED',
    'VOICE_FILE_TOO_LARGE',
  ]);

  if (SHOW_BACKEND_MESSAGE_CODES.has(detail.code)) {
    return detail.message;
  }

  if (detail.status === 429) {
    return 'You are doing that too fast. Please wait a moment and try again.';
  }
  if (detail.status === 500 || detail.code === 'INTERNAL_ERROR') {
    return 'A server error occurred. Please try again later.';
  }

  return detail.message;
}
