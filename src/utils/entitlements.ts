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

// ── Action-cost helpers for the insufficient-credits modal ───────────────────

export const ACTION_CODE_LIMIT_KEY: Record<string, string | undefined> = {
  LIKES: LIMIT_KEYS.LIKES,
  LIKE: LIMIT_KEYS.LIKES,
  SUPER_LIKE: LIMIT_KEYS.SUPER_LIKES,
  SUPERLIKES: LIMIT_KEYS.SUPER_LIKES,
  REWIND: LIMIT_KEYS.REWINDS,
  REWINDS: LIMIT_KEYS.REWINDS,
  BOOST: LIMIT_KEYS.BOOSTS,
  BOOSTS: LIMIT_KEYS.BOOSTS,
  VOICE_MESSAGE: LIMIT_KEYS.VOICE_CHAT_MSGS,
  IMAGE_MESSAGE: LIMIT_KEYS.IMAGE_CHAT_MSGS,
};

export type ActionCostSummary = {
  actionName: string;
  creditBalance: number;
  /** Credit cost that should be displayed, or null if credits cannot help. */
  cost: number | null;
  /** Whether a credit cost applies for this action right now. */
  hasCreditCost: boolean;
  /** True when the user's balance is enough that the modal should not have appeared. */
  isStale: boolean;
  /** Human-readable message to show in the modal. */
  message: string;
};

export function getActionName(actionCode: string | null | undefined): string {
  if (!actionCode) return 'This Action';
  const map: Record<string, string> = {
    LIKE: 'Like',
    LIKES: 'Like',
    SUPER_LIKE: 'Super Like',
    SUPERLIKES: 'Super Like',
    REWIND: 'Rewind',
    REWINDS: 'Rewind',
    BOOST: 'Boost',
    BOOSTS: 'Boost',
    VOICE_MESSAGE: 'Voice Message',
    IMAGE_MESSAGE: 'Image Message',
    SEE_WHO_LIKED_YOU: 'Reveal Profile',
    RETURN_PASSED_PROFILE: 'Revisit Profile',
    SUPER_MESSAGE: 'Super Message',
    INCOGNITO_MODE: 'Incognito Mode',
    CHANGE_ADDRESS: 'Change Address',
  };
  return map[actionCode] ?? actionCode.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getLimitRemaining(entitlements: EntitlementResponse | null, actionCode: string): number | null {
  const limitKey = ACTION_CODE_LIMIT_KEY[actionCode] ?? actionCode;
  const limit = entitlements?.limits?.[limitKey];
  return limit?.remaining ?? null;
}

export function getActionCostSummary(
  actionCode: string | null | undefined,
  entitlements: EntitlementResponse | null,
): ActionCostSummary {
  const actionName = getActionName(actionCode);
  const creditBalance = entitlements?.credits?.credit_balance ?? 0;
  const costInfo = actionCode ? entitlements?.costs?.[actionCode] : undefined;

  if (!costInfo) {
    return {
      actionName,
      creditBalance,
      cost: null,
      hasCreditCost: false,
      isStale: false,
      message: `Upgrade to use ${actionName.toLowerCase()}.`,
    };
  }

  const limitValue: number | null = costInfo.limit_value ?? null;
  const remaining = getLimitRemaining(entitlements, actionCode ?? '');
  const isUnlimited = limitValue === null;

  // Determine which cost to display based on the user's situation:
  //  1. Unlimited plan (limit_value = null) → member_credit_cost
  //  2. Has remaining free quota → member_credit_cost (what they'd pay)
  //  3. Free quota exhausted, credits apply after limit → actual_credit_cost
  //  4. Free quota exhausted, credits don't apply → no cost (upgrade only)
  // Note: use ?? not || because member_credit_cost can legitimately be 0 (free)
  let cost: number | null = null;

  if (isUnlimited) {
    cost = costInfo.member_credit_cost ?? costInfo.actual_credit_cost ?? null;
  } else if ((remaining ?? 0) > 0) {
    cost = costInfo.member_credit_cost ?? costInfo.actual_credit_cost ?? null;
  } else if (costInfo.apply_credit_after_limit) {
    cost = costInfo.actual_credit_cost ?? costInfo.member_credit_cost ?? null;
  } else {
    // apply_credit_after_limit = false → credits can't help, upgrade only
    cost = null;
  }

  const hasCreditCost = cost !== null;
  const isStale = hasCreditCost && cost !== null && creditBalance >= cost;

  if (hasCreditCost) {
    return {
      actionName,
      creditBalance,
      cost,
      hasCreditCost,
      isStale,
      message: `You need ${cost} credits to perform this action.`,
    };
  }

  return {
    actionName,
    creditBalance,
    cost: null,
    hasCreditCost: false,
    isStale,
    message: `Your free ${actionName.toLowerCase()}s for this period have been used. Upgrade to ${actionName.toLowerCase()} more.`,
  };
}

export function getCostForAction(
  actionCode: string,
  entitlements: EntitlementResponse | null,
): number | null {
  return getActionCostSummary(actionCode, entitlements).cost;
}


