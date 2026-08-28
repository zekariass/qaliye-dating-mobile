/**
 * Mock data and types for the Edit Profile flow.
 * Field names align with schema.sql entities (profiles, discovery_preferences, profile_photos).
 */

import type { EthnicityOption, LanguageOption } from '@/types/catalog';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type EditableProfilePhoto = {
  id: string;
  uri: string;
  order: number;
  isPrimary: boolean;
};

export type EditProfileDraft = {
  basics: {
    displayName: string;
    gender: string;
    dateOfBirth: string;
    heightCm: string;
    address: string;
  };
  personal: {
    bio: string;
    ethnicities: EthnicityOption[];
    ethnicityOtherText: string;
    nationality: string;
    religion: string;
    educationLevel: string;
    occupation: string;
    relationshipIntention: string;
    maritalStatus: string;
    hasChildren: string;
    wantsChildren: string;
  };
  lifestyle: {
    smoking: string;
    drinking: string;
    activityLevel: string;
    interests: string[];
    languages: LanguageOption[];
  };
};

export type LocationMode = 'nearby' | 'diaspora' | 'specific_countries' | 'anywhere';
export type HasChildrenPref = 'any' | 'yes' | 'no';
export type WantsChildrenPref = 'any' | 'yes' | 'no' | 'not_sure' | 'open_to_discussion';

export type DiscoveryPrefDraft = {
  discoveryMode: 'PUBLIC' | 'INCOGNITO';
  interestedIn: 'MALE' | 'FEMALE';
  locationMode: LocationMode;
  specificCountryCodes: string[];
  expandSearchWhenLimited: boolean;
  minAge: number;
  maxAge: number;
  maximumDistanceKm: number;
  verifiedProfilesOnly: boolean;
  hasChildrenPreference: HasChildrenPref;
  wantsChildrenPreference: WantsChildrenPref;
  religionPreferences: string[];
  languagePreferences: LanguageOption[];
  ethnicityPreferences: EthnicityOption[];
  preferencesVersion: number;
};

// ─── Option arrays ──────────────────────────────────────────────────────────────

export const GENDER_OPTIONS = ['MALE', 'FEMALE'] as const;

export const NATIONALITY_OPTIONS = [
  'Ethiopian', 'Eritrean', 'Other',
] as const;

export const RELIGION_OPTIONS = [
  'Orthodox Christian', 'Protestant', 'Catholic', 'Muslim', 'Traditional', 'Other', 'Prefer not to say',
] as const;

export const EDUCATION_OPTIONS = [
  'High School', 'Diploma', "Bachelor's Degree", "Master's Degree", 'Doctorate', 'Other',
] as const;

export const RELATIONSHIP_INTENTION_OPTIONS = [
  'Marriage', 'Serious relationship', 'Long-term relationship', 'Friendship', 'Not sure yet',
] as const;

export const MARITAL_STATUS_OPTIONS = [
  'Never married', 'Divorced', 'Widowed', 'Separated',
] as const;

export const YES_NO_OPTIONS = ['Yes', 'No', 'Prefer not to say'] as const;

export const SMOKING_OPTIONS = ['No', 'Yes', 'Occasionally', 'Trying to quit'] as const;
export const DRINKING_OPTIONS = ['No', 'Socially', 'Occasionally', 'Yes'] as const;
export const ACTIVITY_OPTIONS = [
  'Active: Exercises 4+ times a week',
  'Moderate: Exercises a few times a week',
  'Occasional: Exercises once in a while',
  'Rarely: Prefers non-physical activities',
  'Prefer not to say',
] as const;

export const INTEREST_OPTIONS = [
  'Travel',
  'Reading',
  'Cooking',
  'Baking',
  'Fitness',
  'Running',
  'Cycling',
  'Swimming',
  'Yoga',
  'Meditation',
  'Sports',
  'Football',
  'Basketball',
  'Tennis',
  'Hiking',
  'Camping',
  'Nature',
  'Gardening',
  'Music',
  'Concerts',
  'Singing',
  'Dancing',
  'Movies',
  'TV Shows',
  'Theatre',
  'Comedy',
  'Podcasts',
  'Gaming',
  'Art',
  'Photography',
  'Writing',
  'Poetry',
  'Design',
  'Fashion',
  'Crafts',
  'DIY',
  'Coffee',
  'Tea',
  'Food',
  'Restaurants',
  'Brunch',
  'Tech',
  'Science',
  'History',
  'Languages',
  'Business',
  'Entrepreneurship',
  'Volunteering',
  'Animals',
  'Pets',
  'Sustainability',
  'Spirituality',
  'Family',
  'Nightlife',
  'Festivals',
  'Board Games',
  'Shopping',
  'Cars',
] as const;

export type Interest = typeof INTEREST_OPTIONS[number];


// ─── Initial mock data ──────────────────────────────────────────────────────────

export const INITIAL_DRAFT: EditProfileDraft = {
  basics: {
    displayName: 'Selam Tesfaye',
    gender: 'FEMALE',
    dateOfBirth: '14 Nov 1995',
    heightCm: '165',
    address: 'Addis Ababa, Ethiopia',
  },
  personal: {
    bio: 'Coffee lover ☕, travel enthusiast ✈️ and believer in meaningful conversations.',
    ethnicities: [],
    ethnicityOtherText: '',
    nationality: 'ET',
    religion: 'Orthodox Christian',
    educationLevel: "Bachelor's Degree",
    occupation: 'Software Engineer',
    relationshipIntention: 'Long-term relationship',
    maritalStatus: 'Never married',
    hasChildren: 'No',
    wantsChildren: 'Yes',
  },
  lifestyle: {
    smoking: 'No',
    drinking: 'Socially',
    activityLevel: 'Moderate: Exercises a few times a week',
    interests: ['Travel', 'Coffee', 'Reading', 'Fitness', 'Music'],
    languages: [],
  },
};

export const INITIAL_PREFS: DiscoveryPrefDraft = {
  discoveryMode: 'PUBLIC',
  interestedIn: 'MALE',
  locationMode: 'anywhere',
  specificCountryCodes: [],
  expandSearchWhenLimited: false,
  minAge: 24,
  maxAge: 34,
  maximumDistanceKm: 50,
  verifiedProfilesOnly: true,
  hasChildrenPreference: 'any',
  wantsChildrenPreference: 'any',
  religionPreferences: [],
  languagePreferences: [],
  ethnicityPreferences: [],
  preferencesVersion: 0,
};

export const MOCK_PHOTOS: EditableProfilePhoto[] = [
  { id: 'ph-1', uri: 'https://picsum.photos/seed/qaliye-ep1/600/900', order: 0, isPrimary: true },
  { id: 'ph-2', uri: 'https://picsum.photos/seed/qaliye-ep2/600/900', order: 1, isPrimary: false },
  { id: 'ph-3', uri: 'https://picsum.photos/seed/qaliye-ep3/600/900', order: 2, isPrimary: false },
  { id: 'ph-4', uri: 'https://picsum.photos/seed/qaliye-ep4/600/900', order: 3, isPrimary: false },
  { id: 'ph-5', uri: 'https://picsum.photos/seed/qaliye-ep5/600/900', order: 4, isPrimary: false },
];

export const EXTRA_MOCK_IMAGES = [
  'https://picsum.photos/seed/qaliye-extra1/600/900',
  'https://picsum.photos/seed/qaliye-extra2/600/900',
  'https://picsum.photos/seed/qaliye-extra3/600/900',
];

// ─── Completion calculation ─────────────────────────────────────────────────────

export function computeCompletionPercent(draft: EditProfileDraft, prefs: DiscoveryPrefDraft, photoCount: number): number {
  let filled = 0;
  let total = 0;

  // Basics (5 fields)
  const b = draft.basics;
  total += 5;
  if (b.displayName) filled++;
  if (b.gender) filled++;
  if (b.dateOfBirth) filled++;
  if (b.heightCm) filled++;
  if (b.address) filled++;

  // Personal (10 fields)
  const p = draft.personal;
  total += 10;
  if (p.bio) filled++;
  if (p.ethnicities.length > 0) filled++;
  if (p.nationality) filled++;
  if (p.religion) filled++;
  if (p.educationLevel) filled++;
  if (p.occupation) filled++;
  if (p.relationshipIntention) filled++;
  if (p.maritalStatus) filled++;
  if (p.hasChildren) filled++;
  if (p.wantsChildren) filled++;

  // Lifestyle (5 fields)
  const l = draft.lifestyle;
  total += 5;
  if (l.smoking) filled++;
  if (l.drinking) filled++;
  if (l.activityLevel) filled++;
  if (l.interests.length > 0) filled++;
  if (l.languages.length > 0) filled++;  // LanguageOption[]

  // Preferences (treated as 1 segment)
  total += 1;
  if (prefs.minAge && prefs.maxAge) filled++;

  // Photos (treated as 1 segment)
  total += 1;
  if (photoCount >= 1) filled++;

  return Math.round((filled / total) * 100);
}
