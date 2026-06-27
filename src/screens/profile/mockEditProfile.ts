/**
 * Mock data and types for the Edit Profile flow.
 * Field names align with schema.sql entities (profiles, discovery_preferences, profile_photos).
 */

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
    residencyType: string;
    address: string;
  };
  personal: {
    bio: string;
    ethnicity: string;
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
    languages: string[];
  };
};

export type DiscoveryPrefDraft = {
  discoveryMode: 'PUBLIC' | 'INCOGNITO';
  interestedIn: 'MALE' | 'FEMALE';
  residencyTypes: string[];
  minAge: number;
  maxAge: number;
  maximumDistanceKm: number;
  openToLongDistance: boolean;
  openToRelocation: boolean;
  verifiedProfilesOnly: boolean;
};

// ─── Option arrays ──────────────────────────────────────────────────────────────

export const GENDER_OPTIONS = ['MALE', 'FEMALE'] as const;

export const RESIDENCY_OPTIONS = ['ETHIOPIA', 'ERITREA', 'DIASPORA'] as const;

export const ETHNICITY_OPTIONS = [
  'Amhara', 'Oromo', 'Tigrinya', 'Somali', 'Sidama', 'Gurage',
  'Wolayta', 'Afar', 'Hadiya', 'Gamo', 'Other',
] as const;

export const NATIONALITY_OPTIONS = [
  'Ethiopian', 'Eritrean', 'Dual Citizen', 'Other',
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
export const ACTIVITY_OPTIONS = ['Sedentary', 'Light', 'Moderate', 'Active', 'Very active'] as const;

export const INTEREST_OPTIONS = [
  'Travel', 'Reading', 'Cooking', 'Fitness', 'Music', 'Art',
  'Photography', 'Dancing', 'Hiking', 'Coffee', 'Movies', 'Volunteering',
  'Yoga', 'Gaming', 'Writing', 'Languages', 'Tech', 'Fashion',
] as const;

export const LANGUAGE_OPTIONS = [
  'Amharic', 'Tigrinya', 'Oromo', 'English', 'Arabic', 'French', 'Italian', 'Spanish',
] as const;

// ─── Initial mock data ──────────────────────────────────────────────────────────

export const INITIAL_DRAFT: EditProfileDraft = {
  basics: {
    displayName: 'Selam Tesfaye',
    gender: 'FEMALE',
    dateOfBirth: '14 Nov 1995',
    heightCm: '165',
    residencyType: 'ETHIOPIA',
    address: 'Addis Ababa, Ethiopia',
  },
  personal: {
    bio: 'Coffee lover ☕, travel enthusiast ✈️ and believer in meaningful conversations.',
    ethnicity: 'Oromo',
    nationality: 'Ethiopian',
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
    activityLevel: 'Moderate',
    interests: ['Travel', 'Coffee', 'Reading', 'Fitness', 'Music'],
    languages: ['Amharic', 'English', 'Oromo'],
  },
};

export const INITIAL_PREFS: DiscoveryPrefDraft = {
  discoveryMode: 'PUBLIC',
  interestedIn: 'MALE',
  residencyTypes: ['ETHIOPIA', 'DIASPORA'],
  minAge: 24,
  maxAge: 34,
  maximumDistanceKm: 50,
  openToLongDistance: true,
  openToRelocation: false,
  verifiedProfilesOnly: true,
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

  // Basics (6 fields)
  const b = draft.basics;
  total += 6;
  if (b.displayName) filled++;
  if (b.gender) filled++;
  if (b.dateOfBirth) filled++;
  if (b.heightCm) filled++;
  if (b.residencyType) filled++;
  if (b.address) filled++;

  // Personal (10 fields)
  const p = draft.personal;
  total += 10;
  if (p.bio) filled++;
  if (p.ethnicity) filled++;
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
  if (l.languages.length > 0) filled++;

  // Preferences (treated as 1 segment)
  total += 1;
  if (prefs.minAge && prefs.maxAge) filled++;

  // Photos (treated as 1 segment)
  total += 1;
  if (photoCount >= 1) filled++;

  return Math.round((filled / total) * 100);
}
