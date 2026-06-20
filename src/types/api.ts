export type OnboardingStep =
  | 'BASIC_PROFILE'
  | 'ADD_LOCATION'
  | 'ADD_PHOTO'
  | 'SET_PREFERENCES'
  | 'COMPLETE'
  | 'DONE';

export type OnboardingData = {
  has_profile: boolean;
  is_onboarded: boolean;
  next_step: OnboardingStep;
  can_enter_discovery: boolean;
};

export type MeResponse = {
  user_id: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  preferred_language: string;
  profile: null | Record<string, unknown>;
  onboarding: OnboardingData;
};

export type OnboardingStatus = {
  is_onboarded: boolean;
  next_step: OnboardingStep;
  steps: {
    basic_profile: boolean;
    location: boolean;
    photo: boolean;
    preferences: boolean;
  };
  can_complete_onboarding: boolean;
  can_enter_discovery: boolean;
  blocking_reasons: string[];
};

export type CompleteOnboardingResponse = {
  is_onboarded: boolean;
  profile_completion_score: number;
  can_enter_discovery: boolean;
  blocking_reasons: string[];
};

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type ResidencyType = 'ETHIOPIA' | 'ERITREA' | 'DIASPORA';
export type RelationshipIntention =
  | 'MARRIAGE'
  | 'SERIOUS_RELATIONSHIP'
  | 'LONG_TERM'
  | 'FRIENDSHIP'
  | 'NOT_SURE_YET';

export type BasicProfilePayload = {
  display_name: string;
  gender: Gender;
  date_of_birth: string;
  residency_type: ResidencyType;
  relationship_intention: RelationshipIntention;
};

export type GpsLocationPayload = {
  location_source: 'GPS';
  latitude: number;
  longitude: number;
  country_code?: string;
  country_name?: string;
  city?: string;
  region?: string;
  formatted_address?: string;
};

export type ManualLocationPayload = {
  location_source: 'MANUAL';
  place_id: string;
};

export type LocationSearchItem = {
  place_id: string;
  display_name: string;
  city: string;
  region?: string;
  country_code: string;
  country_name: string;
};

export type LocationSearchResponse = {
  items: LocationSearchItem[];
};

export type InterestedInGender = 'MALE' | 'FEMALE' | 'ALL';

export type DiscoveryPreferencesPayload = {
  interested_in_gender: InterestedInGender;
  min_age: number;
  max_age: number;
  max_distance_km: number;
};

export type ProfileMeResponse = {
  display_name: string;
  gender: Gender;
  date_of_birth: string;
  residency_type: ResidencyType;
  relationship_intention: RelationshipIntention;
  is_onboarded: boolean;
  profile_completion_score: number;
};

export type ProfileLocationResponse = {
  location_source: 'GPS' | 'MANUAL';
  display_name?: string;
  city?: string;
  region?: string;
  country_code?: string;
  country_name?: string;
  formatted_address?: string;
  place_id?: string;
  location_precision?: string;
};

export type DiscoveryPreferencesResponse = {
  interested_in_gender: InterestedInGender;
  min_age: number;
  max_age: number;
  max_distance_km: number;
};
