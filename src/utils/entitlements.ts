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
    { label: 'Likes per day', icon: 'heart', value: pl?.LIKES ?? null, formatted: formatLimit(pl?.LIKES) },
    { label: 'Super Likes per day', icon: 'star', value: pl?.SUPERLIKES ?? null, formatted: formatLimit(pl?.SUPERLIKES) },
    { label: 'Rewinds per day', icon: 'arrow-undo', value: pl?.REWINDS ?? null, formatted: formatLimit(pl?.REWINDS) },
    { label: 'Boosts per month', icon: 'rocket', value: pl?.BOOSTS ?? null, formatted: formatLimit(pl?.BOOSTS) },
    { label: 'Voice messages per day', icon: 'mic', value: voiceLimit, formatted: formatLimit(voiceLimit) },
    { label: 'Image messages per day', icon: 'image', value: imageLimit, formatted: formatLimit(imageLimit) },
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
  const credits = entitlements?.credits.super_likes_available ?? 0;
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
  const credits = entitlements?.credits.rewinds_available ?? 0;
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
  const credits = entitlements?.credits.boosts_available ?? 0;
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

export const QUOTA_ERROR_CODES = {
  LIKES: 'DAILY_LIKE_LIMIT_EXCEEDED',
  SUPER_LIKES: 'DAILY_SUPERLIKE_LIMIT_EXCEEDED',
  REWINDS: 'DAILY_REWIND_LIMIT_EXCEEDED',
  VOICE_CHAT_MSGS: 'DAILY_VOICE_CHAT_MSG_LIMIT_EXCEEDED',
  IMAGE_CHAT_MSGS: 'DAILY_IMAGE_CHAT_MSG_LIMIT_EXCEEDED',
} as const;

export function isQuotaError(error: unknown): boolean {
  const status = (error as any)?.response?.status;
  const code: string = (error as any)?.response?.data?.error?.code ?? (error as any)?.response?.data?.error ?? (error as any)?.response?.data?.code ?? '';
  if (status === 429 || status === 402) return true;
  return code === QUOTA_ERROR_CODES.LIKES ||
    code === QUOTA_ERROR_CODES.SUPER_LIKES ||
    code === QUOTA_ERROR_CODES.REWINDS ||
    code === QUOTA_ERROR_CODES.VOICE_CHAT_MSGS ||
    code === QUOTA_ERROR_CODES.IMAGE_CHAT_MSGS;
}

export function getQuotaErrorType(error: unknown): 'LIKES' | 'SUPER_LIKES' | 'REWINDS' | 'VOICE_CHAT_MSGS' | 'IMAGE_CHAT_MSGS' | null {
  const code: string = (error as any)?.response?.data?.error?.code ?? (error as any)?.response?.data?.error ?? (error as any)?.response?.data?.code ?? '';
  if (code === QUOTA_ERROR_CODES.LIKES) return 'LIKES';
  if (code === QUOTA_ERROR_CODES.SUPER_LIKES) return 'SUPER_LIKES';
  if (code === QUOTA_ERROR_CODES.REWINDS) return 'REWINDS';
  if (code === QUOTA_ERROR_CODES.VOICE_CHAT_MSGS) return 'VOICE_CHAT_MSGS';
  if (code === QUOTA_ERROR_CODES.IMAGE_CHAT_MSGS) return 'IMAGE_CHAT_MSGS';
  return null;
}
