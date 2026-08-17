import type { EntitlementResponse, PlanLimits, QuotaInfo } from '@/types/billing';
import { LIMIT_KEYS } from '@/types/billing';

export function formatLimit(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Unlimited';
  return value.toString();
}

export function getPlanLimit(entitlements: EntitlementResponse | null, key: keyof PlanLimits): number | null {
  return entitlements?.plan_limits?.[key] ?? null;
}

export type PlanLimitDisplay = {
  label: string;
  icon: React.ComponentProps<typeof import('@expo/vector-icons').Ionicons>['name'];
  value: number | null;
  formatted: string;
};

export function getPlanLimitDisplays(entitlements: EntitlementResponse | null): PlanLimitDisplay[] {
  const pl = entitlements?.plan_limits;
  const limits = entitlements?.limits;
  const voiceLimit = pl?.VOICE_CHAT_MSGS ?? limits?.[LIMIT_KEYS.VOICE_CHAT_MSGS]?.limit ?? null;
  const imageLimit = pl?.IMAGE_CHAT_MSGS ?? limits?.[LIMIT_KEYS.IMAGE_CHAT_MSGS]?.limit ?? null;
  return [
    { label: 'Likes', icon: 'heart', value: pl?.LIKES ?? null, formatted: formatLimit(pl?.LIKES) },
    { label: 'Super Likes', icon: 'star', value: pl?.SUPERLIKES ?? null, formatted: formatLimit(pl?.SUPERLIKES) },
    { label: 'Rewinds', icon: 'arrow-undo', value: pl?.REWINDS ?? null, formatted: formatLimit(pl?.REWINDS) },
    { label: 'Boosts', icon: 'rocket', value: pl?.BOOSTS ?? null, formatted: formatLimit(pl?.BOOSTS) },
    { label: 'Voice messages', icon: 'mic', value: voiceLimit, formatted: formatLimit(voiceLimit) },
    { label: 'Image messages', icon: 'image', value: imageLimit, formatted: formatLimit(imageLimit) },
  ];
}

export type LimitStatus = {
  available: number;
  remaining: number | null;
  isUnlimited: boolean;
  isExhausted: boolean;
  resetsAt?: string;
};

function getLimit(entitlements: EntitlementResponse | null, key: string): QuotaInfo | null {
  if (!entitlements?.limits) return null;
  return entitlements.limits[key] ?? null;
}

export function getLikesStatus(entitlements: EntitlementResponse | null): LimitStatus {
  const limit = getLimit(entitlements, LIMIT_KEYS.LIKES);
  const remaining = limit?.remaining ?? null;
  const isUnlimited = remaining === null;
  return {
    available: isUnlimited ? Infinity : (remaining ?? 0),
    remaining,
    isUnlimited,
    isExhausted: !isUnlimited && remaining === 0,
    resetsAt: limit?.resets_at,
  };
}

export function canLike(entitlements: EntitlementResponse | null): boolean {
  const status = getLikesStatus(entitlements);
  return status.isUnlimited || status.available > 0;
}

export type TwoTierStatus = {
  dailyRemaining: number | null;
  creditsAvailable: number;
  totalAvailable: number;
  isUnlimited: boolean;
  isExhausted: boolean;
  usingCredits: boolean;
  resetsAt?: string;
};

export function getSuperLikesStatus(entitlements: EntitlementResponse | null): TwoTierStatus {
  const limit = getLimit(entitlements, LIMIT_KEYS.SUPER_LIKES);
  const dailyRemaining = limit?.remaining ?? null;
  const isUnlimited = dailyRemaining === null;
  const credits = entitlements?.credits.credit_balance ?? 0;
  const dailyNum = isUnlimited ? Infinity : (dailyRemaining ?? 0);
  const totalAvailable = isUnlimited ? Infinity : dailyNum + credits;
  const usingCredits = !isUnlimited && dailyNum === 0 && credits > 0;
  return {
    dailyRemaining,
    creditsAvailable: credits,
    totalAvailable,
    isUnlimited,
    isExhausted: !isUnlimited && dailyNum === 0 && credits === 0,
    usingCredits,
    resetsAt: limit?.resets_at,
  };
}

export function canSuperLike(entitlements: EntitlementResponse | null): boolean {
  const status = getSuperLikesStatus(entitlements);
  return status.isUnlimited || status.totalAvailable > 0;
}

export function getRewindsStatus(entitlements: EntitlementResponse | null): TwoTierStatus {
  const limit = getLimit(entitlements, LIMIT_KEYS.REWINDS);
  const dailyRemaining = limit?.remaining ?? null;
  const isUnlimited = dailyRemaining === null;
  const credits = entitlements?.credits.credit_balance ?? 0;
  const dailyNum = isUnlimited ? Infinity : (dailyRemaining ?? 0);
  const totalAvailable = isUnlimited ? Infinity : dailyNum + credits;
  const usingCredits = !isUnlimited && dailyNum === 0 && credits > 0;
  return {
    dailyRemaining,
    creditsAvailable: credits,
    totalAvailable,
    isUnlimited,
    isExhausted: !isUnlimited && dailyNum === 0 && credits === 0,
    usingCredits,
    resetsAt: limit?.resets_at,
  };
}

export function canRewind(entitlements: EntitlementResponse | null): boolean {
  const status = getRewindsStatus(entitlements);
  return status.isUnlimited || status.totalAvailable > 0;
}

export type BoostStatus = {
  dailyRemaining: number | null;
  creditsAvailable: number;
  totalAvailable: number;
  isUnlimited: boolean;
  isActive: boolean;
  remainingSeconds: number;
  durationMinutes: number;
  canActivate: boolean;
  isExhausted: boolean;
  resetsAt?: string;
};

export function getBoostStatus(entitlements: EntitlementResponse | null): BoostStatus {
  const limit = getLimit(entitlements, LIMIT_KEYS.BOOSTS);
  const dailyRemaining = limit?.remaining ?? null;
  const isUnlimited = dailyRemaining === null;
  const credits = entitlements?.credits.credit_balance ?? 0;
  const dailyNum = isUnlimited ? Infinity : (dailyRemaining ?? 0);
  const totalAvailable = isUnlimited ? Infinity : dailyNum + credits;
  const activeBoost = entitlements?.active_boost ?? null;
  const isActive = activeBoost !== null;
  return {
    dailyRemaining,
    creditsAvailable: credits,
    totalAvailable,
    isUnlimited,
    isActive,
    remainingSeconds: activeBoost?.remaining_seconds ?? 0,
    durationMinutes: entitlements?.boost_duration_minutes ?? 30,
    canActivate: !isActive && (isUnlimited || totalAvailable > 0),
    isExhausted: !isActive && !isUnlimited && dailyNum === 0 && credits === 0,
    resetsAt: limit?.resets_at,
  };
}

export function canBoost(entitlements: EntitlementResponse | null): boolean {
  return getBoostStatus(entitlements).canActivate;
}

export function hasFeature(entitlements: EntitlementResponse | null, feature: keyof EntitlementResponse['features']): boolean {
  return entitlements?.features?.[feature] ?? false;
}

// ── Chat message quota helpers ─────────────────────────────────────────────

export function getVoiceChatMsgsStatus(entitlements: EntitlementResponse | null): LimitStatus {
  const limit = getLimit(entitlements, LIMIT_KEYS.VOICE_CHAT_MSGS);
  const remaining = limit?.remaining ?? null;
  const isUnlimited = remaining === null;
  return {
    available: isUnlimited ? Infinity : (remaining ?? 0),
    remaining,
    isUnlimited,
    isExhausted: !isUnlimited && remaining === 0,
    resetsAt: limit?.resets_at,
  };
}

export function canSendVoiceChatMsg(entitlements: EntitlementResponse | null): boolean {
  const status = getVoiceChatMsgsStatus(entitlements);
  return status.isUnlimited || status.available > 0;
}

export function getImageChatMsgsStatus(entitlements: EntitlementResponse | null): LimitStatus {
  const limit = getLimit(entitlements, LIMIT_KEYS.IMAGE_CHAT_MSGS);
  const remaining = limit?.remaining ?? null;
  const isUnlimited = remaining === null;
  return {
    available: isUnlimited ? Infinity : (remaining ?? 0),
    remaining,
    isUnlimited,
    isExhausted: !isUnlimited && remaining === 0,
    resetsAt: limit?.resets_at,
  };
}

export function canSendImageChatMsg(entitlements: EntitlementResponse | null): boolean {
  const status = getImageChatMsgsStatus(entitlements);
  return status.isUnlimited || status.available > 0;
}

// ── Limit-exceeded error helpers ────────────────────────────────────────────
// Backend now returns a single LIMIT_EXCEEDED code with HTTP 429 for all
// plan-limit errors. HTTP 402 is exclusively for insufficient credits.

export type ActionType =
  | 'LIKES'
  | 'SUPER_LIKE'
  | 'REWIND'
  | 'BOOST'
  | 'VOICE_MESSAGE'
  | 'IMAGE_MESSAGE'
  | 'RETURN_PASSED_PROFILE'
  | 'SEE_WHO_LIKED_YOU'
  | 'SUPER_MESSAGE';

export type PeriodType = 'DAY' | 'MONTH' | 'BILLING_CYCLE';

/** Maps a PeriodType to a human-readable adjective for use in messages. */
export function periodTypeLabel(periodType: string | undefined | null): string {
  switch (periodType) {
    case 'MONTH':
      return 'monthly';
    case 'BILLING_CYCLE':
      return 'billing cycle';
    case 'DAY':
    default:
      return 'daily';
  }
}

export type LimitExceededDetails = {
  action_type: ActionType | string;
  period_type: PeriodType | string;
};

export type LimitExceededError = {
  code: 'LIMIT_EXCEEDED';
  message: string;
  details: LimitExceededDetails;
};

export function isLimitExceededError(error: unknown): boolean {
  const status = (error as any)?.response?.status;
  const code: string = (error as any)?.response?.data?.error?.code ?? '';
  return status === 429 && code === 'LIMIT_EXCEEDED';
}

export function isInsufficientCreditsError(error: unknown): boolean {
  if ((error as any)?.isInsufficientCredits === true) return true;
  const status = (error as any)?.response?.status;
  const code: string = (error as any)?.response?.data?.error?.code ?? '';
  return status === 402 && code.toLowerCase() === 'insufficient_credits';
}

/** @deprecated Use isLimitExceededError or isInsufficientCreditsError instead */
export function isQuotaError(error: unknown): boolean {
  return isLimitExceededError(error) || isInsufficientCreditsError(error);
}

export function getLimitExceededDetails(error: unknown): LimitExceededError | null {
  const err = (error as any)?.response?.data?.error;
  if (!err || err.code !== 'LIMIT_EXCEEDED') return null;
  return {
    code: 'LIMIT_EXCEEDED',
    message: err.message ?? '',
    details: {
      action_type: err.details?.action_type ?? '',
      period_type: err.details?.period_type ?? '',
    },
  };
}

export function getQuotaErrorType(error: unknown): ActionType | string | null {
  const details = getLimitExceededDetails(error);
  if (details) return details.details.action_type;
  // Fallback for 402 insufficient credits — treat as the action being attempted
  if (isInsufficientCreditsError(error)) return 'INSUFFICIENT_CREDITS';
  return null;
}


