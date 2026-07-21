import { INTEREST_OPTIONS, type Interest } from '@/screens/profile/mockEditProfile';
import type { TFunction } from 'i18next';

const VALID_SET = new Set<string>(INTEREST_OPTIONS);

export const MAX_INTERESTS = 8;
export const INTERESTS_INITIAL_PREVIEW_COUNT = 20;
export const DISCOVERY_CARD_INTEREST_PREVIEW = 3;

const INTEREST_TO_KEY: Record<string, string> = {
  'Travel': 'travel',
  'Reading': 'reading',
  'Cooking': 'cooking',
  'Baking': 'baking',
  'Fitness': 'fitness',
  'Running': 'running',
  'Cycling': 'cycling',
  'Swimming': 'swimming',
  'Yoga': 'yoga',
  'Meditation': 'meditation',
  'Sports': 'sports',
  'Football': 'football',
  'Basketball': 'basketball',
  'Tennis': 'tennis',
  'Hiking': 'hiking',
  'Camping': 'camping',
  'Nature': 'nature',
  'Gardening': 'gardening',
  'Music': 'music',
  'Concerts': 'concerts',
  'Singing': 'singing',
  'Dancing': 'dancing',
  'Movies': 'movies',
  'TV Shows': 'tvShows',
  'Theatre': 'theatre',
  'Comedy': 'comedy',
  'Podcasts': 'podcasts',
  'Gaming': 'gaming',
  'Art': 'art',
  'Photography': 'photography',
  'Writing': 'writing',
  'Poetry': 'poetry',
  'Design': 'design',
  'Fashion': 'fashion',
  'Crafts': 'crafts',
  'DIY': 'diy',
  'Coffee': 'coffee',
  'Tea': 'tea',
  'Food': 'food',
  'Restaurants': 'restaurants',
  'Brunch': 'brunch',
  'Tech': 'tech',
  'Science': 'science',
  'History': 'history',
  'Languages': 'languages',
  'Business': 'business',
  'Entrepreneurship': 'entrepreneurship',
  'Volunteering': 'volunteering',
  'Animals': 'animals',
  'Pets': 'pets',
  'Sustainability': 'sustainability',
  'Spirituality': 'spirituality',
  'Family': 'family',
  'Nightlife': 'nightlife',
  'Festivals': 'festivals',
  'Board Games': 'boardGames',
  'Shopping': 'shopping',
  'Cars': 'cars',
};

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
