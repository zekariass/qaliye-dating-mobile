import type { LikeActionVariantDto } from '@/types/discovery';

/** Show a "N left" badge on a like variant once this few remain. */
export const LOW_REMAINING_THRESHOLD = 2;

/** True when the variant has a period limit at all (limit null/undefined → unlimited). */
export function isLikeVariantLimited(variant: LikeActionVariantDto): boolean {
  return variant.limit != null;
}

/** True when a "N left" badge should be shown. */
export function showLikeVariantRemaining(variant: LikeActionVariantDto): boolean {
  return (
    !variant.blocked &&
    variant.remaining != null &&
    variant.remaining > 0 &&
    variant.remaining <= LOW_REMAINING_THRESHOLD
  );
}

/**
 * Human-readable reset hint for a blocked like variant, driven by
 * `period_type` + `resets_at` (both may be absent on older payloads).
 */
export function likeVariantResetHint(variant: LikeActionVariantDto): string {
  const resetsAt = variant.resets_at ? new Date(variant.resets_at) : null;
  const validDate = resetsAt && !Number.isNaN(resetsAt.getTime()) ? resetsAt : null;
  switch (variant.period_type) {
    case 'DAY':
      return validDate
        ? `Resets at ${validDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
        : 'Resets at midnight';
    case 'MONTH':
      return validDate
        ? `Resets on ${validDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
        : 'Resets next month';
    case 'BILLING_CYCLE':
      return validDate
        ? `Resets on ${validDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
        : 'Resets with your subscription';
    case 'LIFETIME':
      return 'Limit reached';
    default:
      return validDate
        ? `Resets on ${validDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
        : 'Limit reached';
  }
}
