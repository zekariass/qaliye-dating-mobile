import type { ApiErrorDetail } from './apiError';

// Error codes from the backend that indicate a content-moderation rejection.
// These are not retryable — the user must choose a different photo.
const MODERATION_ERROR_CODES = new Set([
  'PHOTO_REJECTED',
  'PHOTO_MODERATION_REJECTED',
  'CONTENT_MODERATION_REJECTED',
]);

// Keywords in rejection_reason / message that indicate nudity or sexual content.
const NUDITY_KEYWORDS = [
  'nudity',
  'nude',
  'sexual',
  'explicit',
  'pornograph',
  'intimate',
  'suggestive',
  'indecent',
  'obscene',
];

/**
 * Determines whether an upload error is a content-moderation rejection
 * (nudity / sexual content) that should NOT offer a Retry button.
 */
export function isModerationRejection(detail: ApiErrorDetail): boolean {
  if (MODERATION_ERROR_CODES.has(detail.code)) return true;
  const lower = (detail.message ?? '').toLowerCase();
  return NUDITY_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Returns a user-friendly, neutral, non-judgmental message for moderation
 * rejections, replacing any backend-provided wording that may be overly blunt.
 */
export function getModerationMessage(): string {
  return 'This photo could not be approved. Please choose a different photo that follows our community guidelines.';
}
