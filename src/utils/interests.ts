import { INTEREST_OPTIONS, type Interest } from '@/screens/profile/mockEditProfile';

const VALID_SET = new Set<string>(INTEREST_OPTIONS);

export const MAX_INTERESTS = 8;
export const INTERESTS_INITIAL_PREVIEW_COUNT = 20;
export const DISCOVERY_CARD_INTEREST_PREVIEW = 3;

export function isValidInterest(value: string): value is Interest {
  return VALID_SET.has(value);
}

export function sanitizeInterests(
  raw: string[] | undefined | null,
  max = MAX_INTERESTS,
): string[] {
  if (!raw || raw.length === 0) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (!VALID_SET.has(trimmed)) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= max) break;
  }
  return result;
}

export function canSelectMore(selected: string[], max = MAX_INTERESTS): boolean {
  return selected.length < max;
}

export function getDiscoveryInterests(interests: string[] | undefined | null): {
  visible: string[];
  remaining: number;
} {
  const clean = sanitizeInterests(interests);
  const visible = clean.slice(0, DISCOVERY_CARD_INTEREST_PREVIEW);
  const remaining = Math.max(0, clean.length - DISCOVERY_CARD_INTEREST_PREVIEW);
  return { visible, remaining };
}
