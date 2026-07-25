import { getCountryName } from '@/constants/countries';
import type { CurrentUserProfile } from '@/screens/profile/mockCurrentUserProfile';
import type {
    DiscoveryPrefDraft,
    EditProfileDraft,
} from '@/screens/profile/mockEditProfile';
import type {
    OtherUserProfileDto,
    ProfileAddressDto,
    ProfileDiscoveryPreferencesDto,
    ProfileMeDto,
    ProfilePreferencesUpdateRequest,
    ProfileUpdateRequest,
} from '@/types/profile';
import { sanitizeInterests } from '@/utils/interests';

// ─── Enum → Display Label ──────────────────────────────────────────────────────

const ETHNICITY_API_TO_LABEL: Record<string, string> = {
  AMHARA: 'Amhara',
  OROMO: 'Oromo',
  TIGRINYA: 'Tigrinya',
  SOMALI: 'Somali',
  SIDAMA: 'Sidama',
  GURAGE: 'Gurage',
  WOLAYTA: 'Wolayta',
  AFAR: 'Afar',
  HADIYA: 'Hadiya',
  GAMO: 'Gamo',
  OTHER: 'Other',
};

// Legacy nationality enum → ISO 3166-1 alpha-2 code (for backward compatibility)
const LEGACY_NATIONALITY_TO_CODE: Record<string, string> = {
  ETHIOPIAN: 'ET',
  ERITREAN: 'ER',
};

// Convert any nationality value (ISO code or legacy enum) to a display name
function nationalityToDisplay(val: string | null | undefined): string | null {
  if (!val) return null;
  // ISO 2-letter code
  if (/^[A-Z]{2}$/.test(val)) return getCountryName(val) || val;
  // Legacy enum
  const code = LEGACY_NATIONALITY_TO_CODE[val];
  if (code) return getCountryName(code);
  // Unknown — return as-is
  return val;
}

// Convert any nationality value (ISO code or legacy enum) to an ISO code for editing
function nationalityToCode(val: string | null | undefined): string {
  if (!val) return '';
  if (/^[A-Z]{2}$/.test(val)) return val;
  return LEGACY_NATIONALITY_TO_CODE[val] ?? '';
}

export const RELIGION_API_TO_LABEL: Record<string, string> = {
  ORTHODOX_CHRISTIAN: 'Orthodox Christian',
  PROTESTANT: 'Protestant',
  CATHOLIC: 'Catholic',
  MUSLIM: 'Muslim',
  TRADITIONAL: 'Traditional',
  OTHER: 'Other',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
};

export const EDUCATION_API_TO_LABEL: Record<string, string> = {
  HIGH_SCHOOL: 'High School',
  DIPLOMA: 'Diploma',
  BACHELORS: "Bachelor's Degree",
  MASTERS: "Master's Degree",
  DOCTORATE: 'Doctorate',
  OTHER: 'Other',
};

const RELATIONSHIP_API_TO_LABEL: Record<string, string> = {
  MARRIAGE: 'Marriage',
  SERIOUS_RELATIONSHIP: 'Serious relationship',
  LONG_TERM: 'Long-term relationship',
  FRIENDSHIP: 'Friendship',
  NOT_SURE_YET: 'Not sure yet',
};

const MARITAL_API_TO_LABEL: Record<string, string> = {
  NEVER_MARRIED: 'Never married',
  DIVORCED: 'Divorced',
  WIDOWED: 'Widowed',
  SEPARATED: 'Separated',
};

export const SMOKING_API_TO_LABEL: Record<string, string> = {
  NO: 'No',
  YES: 'Yes',
  OCCASIONALLY: 'Occasionally',
  TRYING_TO_QUIT: 'Trying to quit',
};

export const DRINKING_API_TO_LABEL: Record<string, string> = {
  NO: 'No',
  SOCIALLY: 'Socially',
  OCCASIONALLY: 'Occasionally',
  YES: 'Yes',
};

export const ACTIVITY_API_TO_LABEL: Record<string, string> = {
  SEDENTARY: 'Sedentary',
  LIGHT: 'Light',
  MODERATE: 'Moderate',
  ACTIVE: 'Active',
  VERY_ACTIVE: 'Very active',
};

const GENDER_API_TO_LABEL: Record<string, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
};

const RESIDENCY_API_TO_LABEL: Record<string, string> = {
  ETHIOPIA: 'Ethiopia',
  ERITREA: 'Eritrea',
  DIASPORA: 'Diaspora',
};

// ─── Display Label → Enum ──────────────────────────────────────────────────────

function invertMap(m: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]));
}

const ETHNICITY_LABEL_TO_API = invertMap(ETHNICITY_API_TO_LABEL);
export const RELIGION_LABEL_TO_API = invertMap(RELIGION_API_TO_LABEL);
export const EDUCATION_LABEL_TO_API = invertMap(EDUCATION_API_TO_LABEL);
const RELATIONSHIP_LABEL_TO_API = invertMap(RELATIONSHIP_API_TO_LABEL);
const MARITAL_LABEL_TO_API = invertMap(MARITAL_API_TO_LABEL);
export const SMOKING_LABEL_TO_API = invertMap(SMOKING_API_TO_LABEL);
export const DRINKING_LABEL_TO_API = invertMap(DRINKING_API_TO_LABEL);
export const ACTIVITY_LABEL_TO_API = invertMap(ACTIVITY_API_TO_LABEL);

// ─── Helper: format ISO date → 'DD MMM YYYY' ──────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function formatIsoToDisplay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Helper: parse 'DD MMM YYYY' or 'YYYY-MM-DD' → ISO 'YYYY-MM-DD' ──────────

export function parseDisplayToIso(display: string): string {
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(display)) return display;
  // Try DD MMM YYYY
  const parts = display.trim().split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const monthIdx = MONTHS.findIndex((m) => m.toLowerCase() === parts[1].toLowerCase());
    if (monthIdx >= 0) {
      return `${parts[2]}-${String(monthIdx + 1).padStart(2, '0')}-${day}`;
    }
  }
  return display;
}

// ─── Helper: boolean → 'Yes' / 'No' / 'Prefer not to say' ────────────────────

function boolToDisplay(val: boolean | null | undefined, allowNull = false): string {
  if (val === null || val === undefined) return allowNull ? 'Prefer not to say' : 'No';
  return val ? 'Yes' : 'No';
}

function displayToBool(val: string): boolean | null {
  if (val === 'Yes') return true;
  if (val === 'No') return false;
  return null;
}

// ─── ProfileMeDto → CurrentUserProfile ────────────────────────────────────────

export function mapProfileMeDtoToCurrentUserProfile(dto: ProfileMeDto): CurrentUserProfile {
  const address =
    dto.address?.formatted_address ??
    [dto.address?.city, dto.address?.country_name].filter(Boolean).join(', ') ??
    '';

  return {
    id: dto.user_id,
    displayName: dto.display_name,
    age: dto.age,
    isVerified: dto.is_verified,
    location: address,
    avatarUri: dto.photos.find((p) => p.is_primary)?.signed_url ?? dto.primary_photo_url ?? '',

    bio: dto.bio ?? '',

    address,
    gender: dto.gender,
    dateOfBirth: dto.date_of_birth,
    heightCm: dto.height_cm,
    residencyType: dto.residency_type,
    ethnicities: dto.ethnicities ?? [],
    ethnicityOtherText: dto.ethnicity_other_text ?? null,
    nationality: nationalityToDisplay(dto.nationality),
    religion: dto.religion ? (RELIGION_API_TO_LABEL[dto.religion] ?? dto.religion) : null,
    educationLevel: dto.education_level ? (EDUCATION_API_TO_LABEL[dto.education_level] ?? dto.education_level) : null,
    occupation: dto.occupation,
    relationshipIntention: dto.relationship_intention,
    maritalStatus: dto.marital_status ? (MARITAL_API_TO_LABEL[dto.marital_status] ?? dto.marital_status) : null,
    hasChildren: dto.has_children,
    wantsChildren: dto.wants_children,

    photos: dto.photos.map((p) => ({
      id: p.id,
      uri: p.signed_url,
      order: p.photo_order,
      isPrimary: p.is_primary,
    })),

    smoking: dto.smoking,
    drinking: dto.drinking,
    languages: dto.languages ?? [],
    activityLevel: dto.activity_level ? (ACTIVITY_API_TO_LABEL[dto.activity_level] ?? dto.activity_level) : null,
    interests: sanitizeInterests(dto.interests),

    isVisible: dto.is_visible,
    isOnboarded: dto.is_onboarded,
    profileCompletionScore: dto.profile_completion_score,

    discoveryMode: dto.discovery_mode,
    interestedInGender: dto.discovery_preferences.interested_in_gender,
    minAge: dto.discovery_preferences.min_age,
    maxAge: dto.discovery_preferences.max_age,
    maxDistanceKm: dto.discovery_preferences.max_distance_km,
    locationMode: dto.discovery_preferences.location_mode ?? 'anywhere',
    specificCountryCodes: dto.discovery_preferences.specific_country_codes ?? [],
    expandSearchWhenLimited: dto.discovery_preferences.expand_search_when_limited ?? false,
    showVerifiedOnly: dto.discovery_preferences.show_verified_only,
    hasChildrenPreference: dto.discovery_preferences.has_children_preference ?? 'any',
    wantsChildrenPreference: dto.discovery_preferences.wants_children_preference ?? 'any',
    religionPreferences: (dto.discovery_preferences.religion_preferences ?? []).map(
      (code) => RELIGION_API_TO_LABEL[code] ?? code,
    ),
    languagePreferences: dto.discovery_preferences.language_preferences ?? [],
    ethnicityPreferences: dto.discovery_preferences.ethnicity_preferences ?? [],
  };
}

// ─── ProfileMeDto → EditProfileDraft ──────────────────────────────────────────

export function mapProfileMeDtoToEditDraft(dto: ProfileMeDto): EditProfileDraft {
  const address =
    dto.address?.formatted_address ??
    [dto.address?.city, dto.address?.country_name].filter(Boolean).join(', ') ??
    '';

  const smokingLabel =
    dto.smoking_detail ? (SMOKING_API_TO_LABEL[dto.smoking_detail] ?? 'No') :
    dto.smoking ? 'Yes' : 'No';

  const drinkingLabel =
    dto.drinking_detail ? (DRINKING_API_TO_LABEL[dto.drinking_detail] ?? 'No') :
    dto.drinking ? 'Yes' : 'No';

  return {
    basics: {
      displayName: dto.display_name,
      gender: dto.gender,
      dateOfBirth: formatIsoToDisplay(dto.date_of_birth),
      heightCm: dto.height_cm != null ? String(dto.height_cm) : '',
      address,
    },
    personal: {
      bio: dto.bio ?? '',
      ethnicities: dto.ethnicities ?? [],
      ethnicityOtherText: dto.ethnicity_other_text ?? '',
      nationality: nationalityToCode(dto.nationality),
      religion: dto.religion ? (RELIGION_API_TO_LABEL[dto.religion] ?? dto.religion) : '',
      educationLevel: dto.education_level ? (EDUCATION_API_TO_LABEL[dto.education_level] ?? dto.education_level) : '',
      occupation: dto.occupation ?? '',
      relationshipIntention: RELATIONSHIP_API_TO_LABEL[dto.relationship_intention] ?? dto.relationship_intention,
      maritalStatus: dto.marital_status ? (MARITAL_API_TO_LABEL[dto.marital_status] ?? dto.marital_status) : '',
      hasChildren: boolToDisplay(dto.has_children),
      wantsChildren: boolToDisplay(dto.wants_children, true),
    },
    lifestyle: {
      smoking: smokingLabel,
      drinking: drinkingLabel,
      activityLevel: dto.activity_level ? (ACTIVITY_API_TO_LABEL[dto.activity_level] ?? dto.activity_level) : '',
      interests: dto.interests ?? [],
      languages: dto.languages ?? [],
    },
  };
}


// ─── EditProfileDraft → ProfileUpdateRequest ───────────────────────────────────

export function mapEditDraftToUpdateRequest(
  draft: EditProfileDraft,
): ProfileUpdateRequest {
  const { basics, personal, lifestyle } = draft;

  const smokingDetail = SMOKING_LABEL_TO_API[lifestyle.smoking] ?? null;
  const drinkingDetail = DRINKING_LABEL_TO_API[lifestyle.drinking] ?? null;

  return {
    display_name: basics.displayName || undefined,
    gender: basics.gender || undefined,
    date_of_birth: basics.dateOfBirth ? parseDisplayToIso(basics.dateOfBirth) : undefined,
    height_cm: basics.heightCm ? Number(basics.heightCm) : null,
    bio: personal.bio || null,
    nationality: personal.nationality || null,
    religion: personal.religion ? (RELIGION_LABEL_TO_API[personal.religion] ?? personal.religion) : null,
    education_level: personal.educationLevel ? (EDUCATION_LABEL_TO_API[personal.educationLevel] ?? personal.educationLevel) : null,
    occupation: personal.occupation || null,
    relationship_intention: personal.relationshipIntention
      ? (RELATIONSHIP_LABEL_TO_API[personal.relationshipIntention] ?? personal.relationshipIntention)
      : undefined,
    marital_status: personal.maritalStatus ? (MARITAL_LABEL_TO_API[personal.maritalStatus] ?? personal.maritalStatus) : null,
    has_children: displayToBool(personal.hasChildren) ?? false,
    wants_children: displayToBool(personal.wantsChildren),
    smoking_detail: smokingDetail,
    drinking_detail: drinkingDetail,
    smoking: smokingDetail ? smokingDetail !== 'NO' : undefined,
    drinking: drinkingDetail ? drinkingDetail !== 'NO' : undefined,
    activity_level: lifestyle.activityLevel ? (ACTIVITY_LABEL_TO_API[lifestyle.activityLevel] ?? lifestyle.activityLevel) : null,
    interests: lifestyle.interests.length > 0 ? sanitizeInterests(lifestyle.interests) : undefined,
    language_ids: lifestyle.languages.length > 0 ? lifestyle.languages.map((l) => l.id) : undefined,
    ethnicity_ids: personal.ethnicities.length > 0 ? personal.ethnicities.map((e) => e.id) : undefined,
    ethnicity_other_text: personal.ethnicityOtherText || null,
  };
}

// ─── ProfileDiscoveryPreferencesDto → DiscoveryPrefDraft ──────────────────────

export function mapApiPrefsToDiscoveryPrefDraft(
  dto: ProfileDiscoveryPreferencesDto,
  discoveryMode: 'PUBLIC' | 'INCOGNITO' = 'PUBLIC',
  userGender?: string,
): DiscoveryPrefDraft {
  const interestedIn: 'MALE' | 'FEMALE' =
    userGender === 'MALE' ? 'FEMALE' :
    userGender === 'FEMALE' ? 'MALE' :
    (dto.interested_in_gender as 'MALE' | 'FEMALE');
  return {
    discoveryMode,
    interestedIn,
    locationMode: dto.location_mode ?? 'anywhere',
    specificCountryCodes: dto.specific_country_codes ?? [],
    expandSearchWhenLimited: dto.expand_search_when_limited ?? false,
    minAge: dto.min_age,
    maxAge: dto.max_age,
    maximumDistanceKm: dto.max_distance_km,
    verifiedProfilesOnly: dto.show_verified_only,
    hasChildrenPreference: dto.has_children_preference ?? 'any',
    wantsChildrenPreference: dto.wants_children_preference ?? 'any',
    religionPreferences: (dto.religion_preferences ?? []).map(
      (code) => RELIGION_API_TO_LABEL[code] ?? code,
    ),
    languagePreferences: dto.language_preferences ?? [],
    ethnicityPreferences: dto.ethnicity_preferences ?? [],
    preferencesVersion: dto.preferences_version ?? 0,
  };
}

// ─── DiscoveryPrefDraft → ProfilePreferencesUpdateRequest ─────────────────────

export function mapDiscoveryPrefDraftToUpdateRequest(
  prefs: DiscoveryPrefDraft,
): ProfilePreferencesUpdateRequest {
  return {
    interested_in_gender: prefs.interestedIn,
    min_age: prefs.minAge,
    max_age: prefs.maxAge,
    max_distance_km: prefs.maximumDistanceKm,
    show_verified_only: prefs.verifiedProfilesOnly,
    location_mode: prefs.locationMode,
    specific_country_codes: prefs.specificCountryCodes,
    expand_search_when_limited: prefs.expandSearchWhenLimited,
    has_children_preference: prefs.hasChildrenPreference,
    wants_children_preference: prefs.wantsChildrenPreference,
    religion_preferences: prefs.religionPreferences.map(
      (label) => RELIGION_LABEL_TO_API[label] ?? label,
    ),
    language_preference_ids: prefs.languagePreferences.map((l) => l.id),
    ethnicity_preference_ids: prefs.ethnicityPreferences.map((e) => e.id),
    preferences_version: prefs.preferencesVersion,
  };
}

// ─── Other-user profile view model ────────────────────────────────────────────

export type OtherUserDetailItem = {
  id: string;
  label: string;
  value: string;
  icon: string;
};

export type OtherUserDetailGroup = {
  title: string;
  items: OtherUserDetailItem[];
};

export type OtherUserRelationStatus = 'matched' | 'like_sent' | 'like_received' | null;

export type OtherUserProfileView = {
  userId: string;
  name: string;
  age: number | null;
  verified: boolean;
  location: string;
  bio: string | null;
  address: string | null;
  images: string[];
  status: OtherUserRelationStatus;
  matchId: string | null;
  details: OtherUserDetailItem[];
  detailGroups: OtherUserDetailGroup[];
  interests: string[];
  languages: string[];
};

function buildOtherUserLocation(address: ProfileAddressDto | null): string {
  if (!address) return '';
  if (address.formatted_address) return address.formatted_address;
  return [address.city, address.region, address.country_name].filter(Boolean).join(', ');
}

function buildOtherUserAddress(address: ProfileAddressDto | null): string | null {
  if (!address) return null;
  const text =
    address.formatted_address ??
    [address.city, address.region, address.country_name].filter(Boolean).join(', ');
  return text || null;
}

function mapApiRelationStatus(status: string): OtherUserRelationStatus {
  switch (status) {
    case 'MATCHED':   return 'matched';
    case 'LIKED':     return 'like_sent';
    case 'LIKED_YOU': return 'like_received';
    default:          return null;
  }
}

function buildOtherUserDetails(dto: OtherUserProfileDto): OtherUserDetailItem[] {
  const items: OtherUserDetailItem[] = [];

  if (dto.gender) {
    items.push({ id: 'gender', label: 'Gender', icon: 'person-outline', value: GENDER_API_TO_LABEL[dto.gender] ?? dto.gender });
  }
  if (dto.height_cm != null) {
    items.push({ id: 'height', label: 'Height', icon: 'resize-outline', value: `${dto.height_cm} cm` });
  }
  if (dto.residency_type) {
    items.push({ id: 'residency', label: 'Residency Type', icon: 'home-outline', value: RESIDENCY_API_TO_LABEL[dto.residency_type] ?? dto.residency_type });
  }
  if (dto.ethnicities && dto.ethnicities.length > 0) {
    items.push({ id: 'ethnicity', label: 'Ethnicity', icon: 'people-outline', value: dto.ethnicities.map((e) => e.name).join(', ') });
  }
  if (dto.nationality) {
    items.push({ id: 'nation', label: 'Nationality', icon: 'flag-outline', value: nationalityToDisplay(dto.nationality) ?? dto.nationality });
  }
  if (dto.religion) {
    items.push({ id: 'religion', label: 'Religion', icon: 'leaf-outline', value: RELIGION_API_TO_LABEL[dto.religion] ?? dto.religion });
  }
  if (dto.education_level) {
    items.push({ id: 'edu', label: 'Education Level', icon: 'school-outline', value: EDUCATION_API_TO_LABEL[dto.education_level] ?? dto.education_level });
  }
  if (dto.occupation) {
    items.push({ id: 'occ', label: 'Occupation', icon: 'briefcase-outline', value: dto.occupation });
  }
  if (dto.relationship_intention) {
    items.push({ id: 'rel', label: 'Relationship Goal', icon: 'heart-outline', value: RELATIONSHIP_API_TO_LABEL[dto.relationship_intention] ?? dto.relationship_intention });
  }
  if (dto.marital_status) {
    items.push({ id: 'marital', label: 'Marital Status', icon: 'person-circle-outline', value: MARITAL_API_TO_LABEL[dto.marital_status] ?? dto.marital_status });
  }
  if (dto.has_children != null) {
    items.push({ id: 'children', label: 'Has Children', icon: 'people-circle-outline', value: dto.has_children ? 'Yes' : 'No' });
  }
  if (dto.wants_children != null) {
    items.push({ id: 'wchildren', label: 'Wants Children', icon: 'happy-outline', value: dto.wants_children ? 'Yes' : 'No' });
  }
  if (dto.activity_level) {
    items.push({ id: 'activity', label: 'Activity Level', icon: 'walk-outline', value: ACTIVITY_API_TO_LABEL[dto.activity_level] ?? dto.activity_level });
  }

  return items;
}

function buildOtherUserDetailGroups(dto: OtherUserProfileDto): OtherUserDetailGroup[] {
  const groups: OtherUserDetailGroup[] = [];

  const basic: OtherUserDetailItem[] = [];
  if (dto.gender)        basic.push({ id: 'gender',    label: 'Gender',    icon: 'person-outline',  value: GENDER_API_TO_LABEL[dto.gender] ?? dto.gender });
  if (dto.height_cm != null) basic.push({ id: 'height', label: 'Height',  icon: 'resize-outline',  value: `${dto.height_cm} cm` });
  if (dto.residency_type) basic.push({ id: 'residency', label: 'Residency', icon: 'home-outline',  value: RESIDENCY_API_TO_LABEL[dto.residency_type] ?? dto.residency_type });
  if (basic.length > 0) groups.push({ title: 'Basic Information', items: basic });

  const heritage: OtherUserDetailItem[] = [];
  if (dto.ethnicities && dto.ethnicities.length > 0)
    heritage.push({ id: 'ethnicity', label: 'Ethnicity',   icon: 'people-outline',   value: dto.ethnicities.map((e) => e.name).join(', ') });
  if (dto.nationality)
    heritage.push({ id: 'nation',    label: 'Nationality', icon: 'flag-outline',     value: nationalityToDisplay(dto.nationality) ?? dto.nationality });
  if (dto.languages && dto.languages.length > 0)
    heritage.push({ id: 'languages', label: 'Languages',   icon: 'language-outline', value: dto.languages.map((l) => l.name).join(', ') });
  if (dto.religion)
    heritage.push({ id: 'religion',  label: 'Religion',    icon: 'leaf-outline',     value: RELIGION_API_TO_LABEL[dto.religion] ?? dto.religion });
  if (heritage.length > 0) groups.push({ title: 'Heritage', items: heritage });

  const work: OtherUserDetailItem[] = [];
  if (dto.education_level) work.push({ id: 'edu', label: 'Education', icon: 'school-outline',    value: EDUCATION_API_TO_LABEL[dto.education_level] ?? dto.education_level });
  if (dto.occupation)      work.push({ id: 'occ', label: 'Work',      icon: 'briefcase-outline', value: dto.occupation });
  if (work.length > 0) groups.push({ title: 'Education & Work', items: work });

  const rel: OtherUserDetailItem[] = [];
  if (dto.relationship_intention)
    rel.push({ id: 'rel',      label: 'Intention',      icon: 'heart-outline',          value: RELATIONSHIP_API_TO_LABEL[dto.relationship_intention] ?? dto.relationship_intention });
  if (dto.marital_status)
    rel.push({ id: 'marital',  label: 'Marital status', icon: 'person-circle-outline',  value: MARITAL_API_TO_LABEL[dto.marital_status] ?? dto.marital_status });
  if (dto.has_children != null)
    rel.push({ id: 'children', label: 'Has children',   icon: 'people-circle-outline',  value: dto.has_children ? 'Yes' : 'No' });
  if (dto.wants_children != null)
    rel.push({ id: 'wchildren',label: 'Wants children', icon: 'happy-outline',          value: dto.wants_children ? 'Yes' : 'No' });
  if (rel.length > 0) groups.push({ title: 'Relationship', items: rel });

  const lifestyle: OtherUserDetailItem[] = [];
  if (dto.activity_level)
    lifestyle.push({ id: 'activity',  label: 'Activity level', icon: 'fitness-outline',       value: ACTIVITY_API_TO_LABEL[dto.activity_level] ?? dto.activity_level });
  if (dto.interests && dto.interests.length > 0)
    lifestyle.push({ id: 'interests', label: 'Interests',      icon: 'color-palette-outline', value: '' });
  if (lifestyle.length > 0) groups.push({ title: 'Lifestyle', items: lifestyle });

  return groups;
}

export function mapOtherUserProfileDtoToView(dto: OtherUserProfileDto): OtherUserProfileView {
  const sortedPhotos = [...dto.photos].sort((a, b) => a.photo_order - b.photo_order);
  return {
    userId: dto.user_id,
    name: dto.display_name,
    age: dto.age,
    verified: dto.is_verified,
    location: buildOtherUserLocation(dto.address),
    bio: dto.bio,
    address: buildOtherUserAddress(dto.address),
    images: sortedPhotos.map((p) => p.signed_url),
    status: mapApiRelationStatus(dto.relation_status),
    matchId: dto.match_id ?? null,
    details: buildOtherUserDetails(dto),
    detailGroups: buildOtherUserDetailGroups(dto),
    interests: sanitizeInterests(dto.interests),
    languages: (dto.languages ?? []).map((l) => l.name),
  };
}
