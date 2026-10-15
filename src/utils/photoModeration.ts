
import i18n from '@/i18n';

import type { ApiErrorDetail } from './apiError';

// Error codes from the backend that indicate a content-moderation rejection.
// These are not retryable — the user must choose a different photo.
const MODERATION_ERROR_CODES = new Set([
  'PHOTO_REJECTED',
  'PHOTO_MODERATION_REJECTED',
  'CONTENT_MODERATION_REJECTED',
]);

// Error codes that indicate an AI-generated image hard rejection.
const AI_REJECTION_CODES = new Set([
  'AI_GENERATED_REJECTED',
  'PHOTO_AI_GENERATED',
]);

// Keywords in message/code that indicate an AI-generated image rejection.
const AI_KEYWORDS = [
  'ai-generated',
  'ai generated',
  'artificial intelligence',
  'machine generated',
  'synthetically generated',
  'generated image',
];

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
 * Determines whether an upload error is specifically an AI-generated image
 * hard rejection (422). These show a distinct modal with no retry or
 * "choose another" option — only Remove and Close.
 */
export function isAiGeneratedRejection(detail: ApiErrorDetail): boolean {
  if (AI_REJECTION_CODES.has(detail.code)) return true;
  const lower = (detail.message ?? '').toLowerCase();
  return AI_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Returns a user-friendly, neutral, non-judgmental message for moderation
 * rejections, replacing any backend-provided wording that may be overly blunt.
 */
export function getModerationMessage(): string {
  return i18n.t(
    'onboarding.photo.moderationRejected',
    'This photo could not be approved. It may contain nudity or sexual content — please choose a different photo that follows our community guidelines.',
  );
}
