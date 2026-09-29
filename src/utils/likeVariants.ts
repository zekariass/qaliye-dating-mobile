import i18n from '@/i18n';
import type { LikeActionVariantDto } from '@/types/discovery';

/** Show a "N left" badge on a like variant once this few remain. */
export const LOW_REMAINING_THRESHOLD = 2;

/**
 * The variant a "plain" like sends — the one flagged `is_default` by the
 * backend. `is_default` is absent on older payloads, which is treated as
 * false; when nothing is flagged the first variant (lowest sort_order) is
 * used. Returns null when the catalog is empty or not yet loaded — callers
 * should then fall back to DEFAULT_LIKE_VARIANT_CODE.
 */
export function defaultLikeVariant(
  variants: LikeActionVariantDto[] | null | undefined,
): LikeActionVariantDto | null {
  if (!variants || variants.length === 0) return null;
  return variants.find((v) => v.is_default === true) ?? variants[0];
}

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
        ? i18n.t('billing.balances.resetsAtTime', { time: validDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) })
        : i18n.t('billing.balances.resetsMidnight');
    case 'MONTH':
      return validDate
        ? i18n.t('billing.balances.resetsOnDate', { date: validDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })
        : i18n.t('billing.balances.resetsNextMonth');
    case 'BILLING_CYCLE':
      return validDate
        ? i18n.t('billing.balances.resetsOnDate', { date: validDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })
        : i18n.t('billing.balances.resetsWithSubscription');
    case 'LIFETIME':
      return i18n.t('billing.balances.limitReached');
    default:
      return validDate
        ? i18n.t('billing.balances.resetsOnDate', { date: validDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })
        : i18n.t('billing.balances.limitReached');
  }
}
