import type { TFunction } from 'i18next';

/**
 * Maps canonical profile option values (stored/sent to the backend in English)
 * to i18n keys so they render in the user's language at display time.
 * Keys reuse existing namespaces (onboarding.basicProfile.options.*,
 * profile.prefsEdit.*, discovery.preferences.*) wherever the meaning matches.
 */

const PROFILE_OPTION_TO_KEY: Record<string, string> = {
  // Shared
  'Yes': 'common.yes',
  'No': 'common.no',
  'Other': 'onboarding.basicProfile.options.other',
  'Prefer not to say': 'onboarding.basicProfile.options.preferNotToSay',

  // Gender / interested-in
  'MALE': 'profile.edit.male',
  'FEMALE': 'profile.edit.female',
  'Male': 'profile.edit.male',
  'Female': 'profile.edit.female',

  // Religion
  'Orthodox Christian': 'onboarding.basicProfile.options.religion.orthodoxChristian',
  'Protestant': 'onboarding.basicProfile.options.religion.protestant',
  'Catholic': 'onboarding.basicProfile.options.religion.catholic',
  'Muslim': 'onboarding.basicProfile.options.religion.muslim',
  'Traditional': 'onboarding.basicProfile.options.religion.traditional',

  // Education
  'High School': 'onboarding.basicProfile.options.education.highSchool',
  'Diploma': 'onboarding.basicProfile.options.education.diploma',
  "Bachelor's Degree": 'onboarding.basicProfile.options.education.bachelors',
  "Master's Degree": 'onboarding.basicProfile.options.education.masters',
  'Doctorate': 'onboarding.basicProfile.options.education.doctorate',

  // Relationship intention (display labels)
  'Marriage': 'profile.options.intention.marriage',
  'Serious relationship': 'profile.options.intention.seriousRelationship',
  'Long-term relationship': 'profile.options.intention.longTermRelationship',
  'Friendship': 'profile.options.intention.friendship',
  'Not sure yet': 'profile.options.intention.notSureYet',
  // Relationship intention (backend enum values)
  'MARRIAGE': 'profile.options.intention.marriage',
  'SERIOUS_RELATIONSHIP': 'profile.options.intention.seriousRelationship',
  'LONG_TERM_RELATIONSHIP': 'profile.options.intention.longTermRelationship',
  'FRIENDSHIP': 'profile.options.intention.friendship',
  'NOT_SURE_YET': 'profile.options.intention.notSureYet',

  // Marital status
  'Never married': 'profile.options.maritalStatus.neverMarried',
  'Divorced': 'profile.options.maritalStatus.divorced',
  'Widowed': 'profile.options.maritalStatus.widowed',
  'Separated': 'profile.options.maritalStatus.separated',
  'Single': 'profile.options.maritalStatus.single',

  // Smoking / drinking
  'Occasionally': 'onboarding.basicProfile.options.occasionally',
  'Trying to quit': 'onboarding.basicProfile.options.tryingToQuit',
  'Socially': 'onboarding.basicProfile.options.socially',

  // Activity level
  'Active: Exercises 4+ times a week': 'onboarding.basicProfile.options.activity.active',
  'Moderate: Exercises a few times a week': 'onboarding.basicProfile.options.activity.moderate',
  'Occasional: Exercises once in a while': 'onboarding.basicProfile.options.activity.occasional',
  'Rarely: Prefers non-physical activities': 'onboarding.basicProfile.options.activity.rarely',

  // Nationality
  'Ethiopian': 'profile.options.nationality.ethiopian',
  'Eritrean': 'profile.options.nationality.eritrean',

  // Residency type (backend enum + display label)
  'ETHIOPIA': 'profile.options.residency.ethiopia',
  'ERITREA': 'profile.options.residency.eritrea',
  'DIASPORA': 'profile.options.residency.diaspora',
  'Ethiopia': 'profile.options.residency.ethiopia',
  'Eritrea': 'profile.options.residency.eritrea',
  'Diaspora': 'profile.options.residency.diaspora',

  // Discovery mode (backend enum)
  'STANDARD': 'discovery.preferences.standard',
  'PUBLIC': 'discovery.preferences.standard',
  'INCOGNITO': 'discovery.preferences.incognito',

  // Location mode (stored enum)
  'nearby': 'profile.prefsEdit.nearMe',
  'diaspora': 'profile.prefsEdit.diaspora',
  'specific_countries': 'profile.prefsEdit.specific',
  'anywhere': 'profile.prefsEdit.anywhere',

  // Children preferences (stored enum)
  'any': 'profile.prefsEdit.any',
  'yes': 'common.yes',
  'no': 'common.no',
  'not_sure': 'profile.prefsEdit.notSure',
  'open_to_discussion': 'profile.prefsEdit.openToDiscuss',
};

export function translateProfileOption(value: string, t: TFunction): string {
  const key = PROFILE_OPTION_TO_KEY[value];
  if (!key) return value;
  return t(key, { defaultValue: value });
}
