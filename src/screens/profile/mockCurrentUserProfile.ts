export type ProfileDetail = {
  id: string;
  label: string;
  value: string;
  icon: string;
};

export type CurrentUserProfile = {
  id: string;
  name: string;
  age: number;
  verified: boolean;
  visibility: 'everyone' | 'matches_only' | 'hidden';
  onboardingStatus: 'completed' | 'in_progress';
  verificationStatus: 'verified' | 'pending' | 'unverified';
  profileCompletionPercent: number;
  location: string;
  bio: string;
  images: string[];
  address: string;
  details: ProfileDetail[];
};

export const CURRENT_USER_PROFILE: CurrentUserProfile = {
  id: 'current-liam-27',
  name: 'Liam',
  age: 27,
  verified: true,
  visibility: 'everyone',
  onboardingStatus: 'completed',
  verificationStatus: 'verified',
  profileCompletionPercent: 92,
  location: 'Bole, Addis Ababa, Ethiopia',
  bio: 'Product designer who loves solving hard problems and crafting beautiful experiences. Coffee addict, weekend hiker, and always up for a meaningful conversation over injera.',
  address: 'Bole, Addis Ababa, Ethiopia',
  images: [
    'https://picsum.photos/seed/qaliye-me1/480/800',
    'https://picsum.photos/seed/qaliye-me2/480/800',
    'https://picsum.photos/seed/qaliye-me3/480/800',
    'https://picsum.photos/seed/qaliye-me4/480/800',
    'https://picsum.photos/seed/qaliye-me5/480/800',
  ],
  details: [
    { id: 'address',    label: 'Address',               icon: 'location-outline',      value: 'Bole, Addis Ababa' },
    { id: 'gender',     label: 'Gender',                icon: 'person-outline',        value: 'Male' },
    { id: 'dob',        label: 'Date of Birth',         icon: 'calendar-outline',      value: 'Jun 12, 1998 · 27' },
    { id: 'height',     label: 'Height',                icon: 'resize-outline',        value: '180 cm' },
    { id: 'residency',  label: 'Residency Type',        icon: 'home-outline',          value: 'Ethiopia' },
    { id: 'ethnicity',  label: 'Ethnicity',             icon: 'people-outline',        value: 'Tigrinya' },
    { id: 'nation',     label: 'Nationality',           icon: 'flag-outline',          value: 'Ethiopian' },
    { id: 'religion',   label: 'Religion',              icon: 'leaf-outline',          value: 'Orthodox Christian' },
    { id: 'edu',        label: 'Education Level',       icon: 'school-outline',        value: "Master's Degree" },
    { id: 'occ',        label: 'Occupation',            icon: 'briefcase-outline',     value: 'Product Designer' },
    { id: 'rel',        label: 'Relationship Goal',     icon: 'heart-outline',         value: 'Serious relationship' },
    { id: 'marital',    label: 'Marital Status',        icon: 'person-circle-outline', value: 'Single' },
    { id: 'children',   label: 'Has Children',          icon: 'people-circle-outline', value: 'No' },
    { id: 'wchildren',  label: 'Wants Children',        icon: 'happy-outline',         value: 'Yes' },
    { id: 'smoking',    label: 'Smoking',               icon: 'ban-outline',           value: 'No' },
    { id: 'drinking',   label: 'Drinking',              icon: 'wine-outline',          value: 'Occasionally' },
  ],
};
