import type { EthnicityOption, LanguageOption } from '@/types/catalog';

export type ProfileDetail = {
  id: string;
  label: string;
  value: string;
  icon: string;
};

export type ProfilePhoto = {
  id: string;
  uri: string;
  order: number;
  isPrimary: boolean;
};

export type CurrentUserProfile = {
  id: string;
  displayName: string;
  age: number;
  isVerified: boolean;
  location: string;
  avatarUri: string;

  // Bio tab — profiles.bio
  bio: string;

  // Details tab — profiles + addresses
  address: string;
  gender: string;
  dateOfBirth: string;
  heightCm: number | null;
  residencyType: string;
  ethnicities: EthnicityOption[];
  ethnicityOtherText: string | null;
  nationality: string | null;
  religion: string | null;
  educationLevel: string | null;
  occupation: string | null;
  relationshipIntention: string;
  maritalStatus: string | null;
  hasChildren: boolean;
  wantsChildren: boolean | null;

  // Photo tab — profile_photos
  photos: ProfilePhoto[];

  // Lifestyle tab — profiles (smoking, drinking, languages, activity, interests)
  smoking: boolean;
  drinking: boolean;
  languages: LanguageOption[];
  activityLevel: string | null;
  interests: string[];

  // Status tab — profiles (is_visible, is_onboarded, is_verified, profile_completion_score)
  isVisible: boolean;
  isOnboarded: boolean;
  profileCompletionScore: number;

  // Preferences tab — discovery_preferences
  discoveryMode: string;
  interestedInGender: string;
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  locationMode: string;
  specificCountryCodes: string[];
  expandSearchWhenLimited: boolean;
  showVerifiedOnly: boolean;
  hasChildrenPreference: string;
  wantsChildrenPreference: string;
  religionPreferences: string[];
  languagePreferences: LanguageOption[];
  ethnicityPreferences: EthnicityOption[];
};

export const CURRENT_USER_PROFILE: CurrentUserProfile = {
  id: 'current-liam-27',
  displayName: 'Liam',
  age: 27,
  isVerified: true,
  location: 'Bole, Addis Ababa, Ethiopia',
  avatarUri: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=480&h=480&fit=crop&crop=face',

  bio: 'Product designer who loves solving problems and creating beautiful experiences. Coffee lover, travel enthusiast, and always up for meaningful conversations.',

  address: 'Bole, Addis Ababa, Ethiopia',
  gender: 'MALE',
  dateOfBirth: '1998-06-12',
  heightCm: 180,
  residencyType: 'ETHIOPIA',
  ethnicities: [],
  ethnicityOtherText: null,
  nationality: 'Ethiopian',
  religion: 'Orthodox Christian',
  educationLevel: "Master's Degree",
  occupation: 'Product Designer',
  relationshipIntention: 'SERIOUS_RELATIONSHIP',
  maritalStatus: 'Single',
  hasChildren: false,
  wantsChildren: true,

  photos: [
    { id: 'p1', uri: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=480&h=720&fit=crop', order: 0, isPrimary: true },
    { id: 'p2', uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=480&h=720&fit=crop', order: 1, isPrimary: false },
    { id: 'p3', uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=480&h=720&fit=crop', order: 2, isPrimary: false },
    { id: 'p4', uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=480&h=720&fit=crop', order: 3, isPrimary: false },
  ],

  smoking: false,
  drinking: false,
  languages: [],
  activityLevel: 'Moderate',
  interests: ['Travel', 'Coffee', 'Reading', 'Fitness', 'Music'],

  isVisible: true,
  isOnboarded: true,
  profileCompletionScore: 92,

  discoveryMode: 'STANDARD',
  interestedInGender: 'FEMALE',
  minAge: 22,
  maxAge: 35,
  maxDistanceKm: 50,
  locationMode: 'anywhere',
  specificCountryCodes: [],
  expandSearchWhenLimited: false,
  showVerifiedOnly: false,
  hasChildrenPreference: 'any',
  wantsChildrenPreference: 'any',
  religionPreferences: [],
  languagePreferences: [],
  ethnicityPreferences: [],
};
