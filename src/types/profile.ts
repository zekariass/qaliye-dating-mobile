// ─── Profile API DTOs ──────────────────────────────────────────────────────────
// All keys are snake_case to match the backend JSON.

import type { EthnicityOption, LanguageOption } from './catalog';

export type ProfileAddressDto = {
  id: string;
  city: string;
  region: string | null;
  country_code: string;
  country_name: string;
  formatted_address: string | null;
  location_source: 'GPS' | 'MANUAL' | 'IP';
};

export type ProfilePhotoDto = {
  id: string;
  photo_order: number;
  is_primary: boolean;
  signed_url: string;
  expires_at: string;
  moderation_status: 'PENDING' | 'APPROVED' | 'MANUAL_REVIEW' | 'REJECTED';
  rejection_reason: string | null;
};

export type ProfileDiscoveryPreferencesDto = {
  interested_in_gender: 'MALE' | 'FEMALE';
  min_age: number;
  max_age: number;
  max_distance_km: number;
  preferred_residency_types: Array<'ETHIOPIA' | 'ERITREA' | 'DIASPORA'>;
  show_verified_only: boolean;
  location_mode: 'nearby' | 'diaspora' | 'specific_countries' | 'anywhere';
  specific_country_codes: string[];
  expand_search_when_limited: boolean;
  has_children_preference: 'any' | 'yes' | 'no';
  wants_children_preference: 'any' | 'yes' | 'no' | 'not_sure' | 'open_to_discussion';
  religion_preferences: string[];
  language_preferences: LanguageOption[];
  ethnicity_preferences: EthnicityOption[];
  preferences_version: number;
};

export type ProfileMeDto = {
  user_id: string;
  display_name: string;
  age: number;
  gender: 'MALE' | 'FEMALE';
  date_of_birth: string;
  bio: string | null;
  height_cm: number | null;
  residency_type: 'ETHIOPIA' | 'ERITREA' | 'DIASPORA';
  address: ProfileAddressDto | null;
  nationality: string | null;
  religion: string | null;
  education_level: string | null;
  occupation: string | null;
  relationship_intention: string;
  marital_status: string | null;
  has_children: boolean;
  wants_children: boolean | null;
  smoking: boolean;
  drinking: boolean;
  smoking_detail: string | null;
  drinking_detail: string | null;
  activity_level: string | null;
  interests: string[];
  ethnicities: EthnicityOption[];
  ethnicity_other_text: string | null;
  languages: LanguageOption[];
  is_visible: boolean;
  discovery_mode: 'PUBLIC' | 'INCOGNITO';
  is_onboarded: boolean;
  is_verified: boolean;
  profile_completion_score: number;
  discovery_preferences: ProfileDiscoveryPreferencesDto;
  role: string;
  primary_photo_url: string | null;
  photos: ProfilePhotoDto[];
};

// ─── Request Payloads ──────────────────────────────────────────────────────────

export type ProfileUpdateRequest = {
  display_name?: string;
  gender?: string;
  date_of_birth?: string;
  height_cm?: number | null;
  bio?: string | null;
  nationality?: string | null;
  religion?: string | null;
  education_level?: string | null;
  occupation?: string | null;
  relationship_intention?: string;
  marital_status?: string | null;
  has_children?: boolean;
  wants_children?: boolean | null;
  smoking?: boolean;
  drinking?: boolean;
  smoking_detail?: string | null;
  drinking_detail?: string | null;
  activity_level?: string | null;
  interests?: string[];
  language_ids?: string[];
  ethnicity_ids?: string[];
  ethnicity_other_text?: string | null;
  discovery_mode?: 'PUBLIC' | 'INCOGNITO';
};

export type PhotoRegistrationRequest = {
  storage_bucket: string;
  storage_path: string;
  photo_order?: number;
  is_primary: boolean;
};

export type BatchPhotoRegistrationRequest = {
  photos: PhotoRegistrationRequest[];
};

export type PhotoReorderItem = {
  id: string;
  photo_order: number;
  is_primary: boolean;
};

export type PhotoReorderRequest = {
  photos: PhotoReorderItem[];
};

export type ProfilePhotosResponse = {
  photos: ProfilePhotoDto[];
};

export type ProfilePreferencesUpdateRequest = {
  interested_in_gender: string;
  min_age: number;
  max_age: number;
  max_distance_km: number;
  preferred_residency_types?: string[];
  show_verified_only: boolean;
  location_mode?: string;
  specific_country_codes?: string[];
  expand_search_when_limited?: boolean;
  has_children_preference?: string;
  wants_children_preference?: string;
  religion_preferences?: string[];
  language_preference_ids?: string[];
  ethnicity_preference_ids?: string[];
  preferences_version?: number;
};

export type CulturalDetailsUpdateRequest = {
  language_ids?: string[];
  ethnicity_ids?: string[];
  ethnicity_other_text?: string | null;
};

export type OtherUserProfileDto = {
  user_id: string;
  display_name: string;
  age: number | null;
  gender: string;
  bio: string | null;
  height_cm: number | null;
  residency_type: string;
  address: ProfileAddressDto | null;
  nationality: string | null;
  religion: string | null;
  education_level: string | null;
  occupation: string | null;
  relationship_intention: string;
  marital_status: string | null;
  has_children: boolean | null;
  wants_children: boolean | null;
  smoking?: boolean | null;
  drinking?: boolean | null;
  activity_level: string | null;
  interests: string[];
  ethnicities: EthnicityOption[];
  ethnicity_other_text: string | null;
  languages: LanguageOption[];
  is_verified: boolean;
  primary_photo_url: string | null;
  photos: ProfilePhotoDto[];
  relation_status: 'NONE' | 'LIKED' | 'LIKED_YOU' | 'MATCHED';
  match_id?: string | null;
  activity_status?: import('./activity').ActivityStatus;
};

export type ProfileLocationDto = {
  location_source: 'GPS' | 'MANUAL' | 'IP';
  display_name: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
  country_name: string | null;
  formatted_address: string | null;
  place_id: string | null;
  location_precision: string | null;
};
