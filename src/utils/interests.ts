import { INTEREST_OPTIONS, type Interest } from '@/screens/profile/mockEditProfile';
import type { TFunction } from 'i18next';

const VALID_SET = new Set<string>(INTEREST_OPTIONS);

export const MAX_INTERESTS = 8;
export const INTERESTS_INITIAL_PREVIEW_COUNT = 20;
export const DISCOVERY_CARD_INTEREST_PREVIEW = MAX_INTERESTS;

const INTEREST_TO_KEY: Record<string, string> = {
  'Habesha Culture': 'habeshaCulture',
  'Coffee Ceremony': 'coffeeCeremony',
  'Habesha Food': 'habeshaFood',
  'Habesha Music': 'habeshaMusic',
  'Traditional Dance': 'traditionalDance',
  'Cultural Celebrations': 'culturalCelebrations',
  'Family-Oriented': 'familyOriented',
  'Marriage & Commitment': 'marriageCommitment',
  'Community': 'community',
  'Traditional Values': 'traditionalValues',
  'Faith': 'faith',
  'Proud of My Roots': 'proudOfMyRoots',
  'Connected to Home': 'connectedToHome',
  'Christianity': 'christianity',
  'Islam': 'islam',
  'Faith & Spirituality': 'faithSpirituality',
  'God': 'god',
  'Allah': 'allah',
  'Halal Lifestyle': 'halalLifestyle',
  'Prayer & Worship': 'prayerWorship',
  'Fasting': 'fasting',
  'Community & Togetherness': 'communityTogetherness',
  'Connected to My Roots': 'connectedToMyRoots',
  'Career & Business': 'careerBusiness',
  'Travel': 'travel',
  'Fitness': 'fitness',
  'Cooking': 'cooking',
  'Music': 'music',
  'Sports': 'sports',
  'Movies': 'movies',
  'Reading': 'reading',
};

// ─── Interest → emoji mapping ────────────────────────────────────────────────

const INTEREST_EMOJI: Record<string, string> = {
  'Coffee Ceremony': '☕',
  'Habesha Food': '🍲',
  'Habesha Music': '🎶',
  'Traditional Dance': '💃',
  'Cultural Celebrations': '🎉',
  'Family-Oriented': '👨‍👩‍👧‍👦',
  'Marriage & Commitment': '❤️',
  'Community': '🤝',
  'Traditional Values': '🏡',
  'Faith': '🙏',
  'Proud of My Roots': '🌍',
  'Connected to Home': '✈️',
  'Christianity': '✝️',
  'Islam': '☪️',
  'Faith & Spirituality': '🙏',
  'God': '❤️',
  'Allah': '☪️',
  'Halal Lifestyle': '🍽️',
  'Prayer & Worship': '🙏',
  'Fasting': '🕊️',
  'Community & Togetherness': '🤝',
  'Connected to My Roots': '🌍',
  'Career & Business': '💼',
  'Travel': '✈️',
  'Fitness': '🏋️',
  'Cooking': '🍳',
  'Music': '🎵',
  'Sports': '⚽',
  'Movies': '🎬',
  'Reading': '📚',
};

export function getInterestEmoji(value: string): string {
  return INTEREST_EMOJI[value] ?? '✨';
}

export function interestToKey(value: string): string | null {
  return INTEREST_TO_KEY[value] ?? null;
}

export function translateInterest(value: string, t: TFunction): string {
  const key = interestToKey(value);
  if (!key) return value;
  return t(`interests.${key}`, { defaultValue: value });
}

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
