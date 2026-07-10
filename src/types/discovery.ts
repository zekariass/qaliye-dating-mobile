import type { ActivityStatus } from './activity';
import type { EthnicityOption, LanguageOption } from './catalog';

export type LocationFilter = 'NEARBY' | 'ETHIOPIA' | 'ERITREA' | 'DIASPORA' | 'ANYWHERE';

export type DiscoveryPhotoDto = {
  id: string;
  photoOrder: number;
  isPrimary: boolean;
  signedUrl: string;
  expiresAt: string;
};

export type DiscoveryPromptAnswerDto = {
  promptId: string;
  promptText: string;
  answerText: string;
};

export type DiscoveryProfileDto = {
  userId: string;
  displayName: string;
  age: number;
  gender: string;
  bio: string | null;
  residencyType: string;
  city: string | null;
  region: string | null;
  countryName: string | null;
  distanceKm: number | null;
  isVerified: boolean;
  relationshipIntention: string | null;
  heightCm: number | null;
  nationality: string | null;
  religion: string | null;
  educationLevel: string | null;
  occupation: string | null;
  maritalStatus: string | null;
  hasChildren: boolean;
  wantsChildren: boolean | null;
  smoking: boolean;
  drinking: boolean;
  smokingDetail: string | null;
  drinkingDetail: string | null;
  activityLevel: string | null;
  interests: string[];
  ethnicities: EthnicityOption[];
  ethnicityOtherText: string | null;
  languages: LanguageOption[];
  photos: DiscoveryPhotoDto[];
  promptAnswers: DiscoveryPromptAnswerDto[];
  isBoosted: boolean;
  discoveryScore: number;
  activity_status?: ActivityStatus;
};

export type DiscoveryFeedResponse = {
  profiles: DiscoveryProfileDto[];
  nextCursor: string | null;
  hasMore: boolean;
  totalEligible: number;
  locationFilter: LocationFilter;
  batchSize: number;
  cursorReset: boolean;
};

export type MatchedUserSummaryDto = {
  userId: string;
  displayName: string;
  primaryPhotoUrl: string;
};

export type MatchSummaryDto = {
  matchId: string;
  matchedAt: string;
  rewindEligibleUntil: string;
  otherUser: MatchedUserSummaryDto;
};

export type SwipeActionResponse = {
  actionId: string;
  actionType: 'LIKE' | 'PASS' | 'SUPER_LIKE';
  status: string;
  isMatch: boolean;
  match: MatchSummaryDto | null;
  dailyLikesRemaining: number | null;
  dailySuperLikesRemaining: number | null;
  superLikeCreditsRemaining: number | null;
  createdAt: string;
  idempotent: boolean;
};

export type RewindResponse = {
  reversedActionId: string;
  reversedActionType: string;
  reversedTargetUserId: string;
  matchCancelled: boolean;
  matchId: string | null;
  dailyRewindsRemaining: number;
  restoredProfile: DiscoveryProfileDto | null;
  reversedAt: string;
};

export type DiscoveryPreferencesDto = {
  interestedInGender: string;
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  showVerifiedOnly: boolean;
  locationMode: 'nearby' | 'diaspora' | 'specific_countries' | 'anywhere';
  specificCountryCodes: string[];
  expandSearchWhenLimited: boolean;
  hasChildrenPreference: 'any' | 'yes' | 'no';
  wantsChildrenPreference: 'any' | 'yes' | 'no' | 'not_sure' | 'open_to_discussion';
  religionPreferences: string[];
  languagePreferences: LanguageOption[];
  ethnicityPreferences: EthnicityOption[];
  preferencesVersion: number;
};

export type UpdateDiscoveryPreferencesPayload = {
  interestedInGender: string;
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  showVerifiedOnly?: boolean;
  locationMode?: string;
  specificCountryCodes?: string[];
  expandSearchWhenLimited?: boolean;
  hasChildrenPreference?: string;
  wantsChildrenPreference?: string;
  religionPreferences?: string[];
  languagePreferenceIds?: string[];
  ethnicityPreferenceIds?: string[];
  preferencesVersion?: number;
};

export type UpdateDiscoveryPreferencesResponse = {
  preferences: DiscoveryPreferencesDto;
  onboarding: {
    next_step: string;
    can_complete_onboarding: boolean;
  };
};

// ─── Matches list ───────────────────────────────────────────────────────────

export type MatchItemDto = {
  match_id: string;
  user_id: string;
  display_name: string;
  age: number;
  is_verified: boolean;
  primary_photo_url: string | null;
  matched_at: string;
  rewind_eligible_until: string | null;
  first_message_at: string | null;
  last_message_at: string | null;
  has_conversation: boolean;
  is_unread: boolean;
  distance_km: number | null;
  city: string | null;
  region: string | null;
  country_name: string | null;
  activity_status?: ActivityStatus;
};

export type MatchesPageResponse = {
  items: MatchItemDto[];
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

// ─── Likes list ─────────────────────────────────────────────────────────────

export type LikeDirection = 'RECEIVED' | 'SENT';

export type LikeItemDto = {
  action_id: string;
  user_id: string;
  display_name: string;
  age: number;
  is_verified: boolean;
  primary_photo_url: string | null;
  action_type: 'LIKE' | 'SUPERLIKE';
  liked_at: string;
  distance_km: number | null;
  city: string | null;
  region: string | null;
  country_name: string | null;
  activity_status?: ActivityStatus;
};

export type LikesPageResponse = {
  items: LikeItemDto[];
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  direction: LikeDirection;
};

export type RevisitCount = 10 | 20 | 30;

export type RevisitPassedProfilesResponse = {
  success: boolean;
  reopenedCount: number;
};
