export type RelationStatus = 'matched' | 'like_sent' | 'like_received' | null;

export type ProfileDetail = {
  id: string;
  label: string;
  value: string;
  icon: string;
};

export type OtherUserProfile = {
  id: string;
  name: string;
  age: number;
  verified: boolean;
  location: string;
  bio: string;
  images: string[];
  address: string;
  details: ProfileDetail[];
  status: RelationStatus;
  distanceKm: number;
};

export const MOCK_OTHER_USER: OtherUserProfile = {
  id: 'liam-27',
  name: 'Liam',
  age: 27,
  verified: true,
  location: 'Bole, Addis Ababa, Ethiopia',
  bio: 'Product designer who loves solving problems and crafting beautiful experiences. Coffee lover, travel enthusiast, and always up for a meaningful conversation.',
  address: 'Bole Sub-City, Addis Ababa, Ethiopia',
  status: 'matched',
  distanceKm: 3,
  images: [
    'https://picsum.photos/seed/liam1/480/800',
    'https://picsum.photos/seed/liam2/480/800',
    'https://picsum.photos/seed/liam3/480/800',
    'https://picsum.photos/seed/liam4/480/800',
    'https://picsum.photos/seed/liam5/480/800',
  ],
  details: [
    { id: 'gender',    label: 'Gender',               icon: 'person-outline',        value: 'Male' },
    { id: 'dob',       label: 'Date of Birth',        icon: 'calendar-outline',      value: 'Jun 12, 1997' },
    { id: 'height',    label: 'Height',               icon: 'resize-outline',        value: '180 cm' },
    { id: 'residency', label: 'Residency Type',       icon: 'home-outline',          value: 'Ethiopia' },
    { id: 'ethnicity', label: 'Ethnicity',            icon: 'people-outline',        value: 'Tigrinya' },
    { id: 'nation',    label: 'Nationality',          icon: 'flag-outline',          value: 'Ethiopian' },
    { id: 'religion',  label: 'Religion',             icon: 'leaf-outline',          value: 'Orthodox Christian' },
    { id: 'edu',       label: 'Education Level',      icon: 'school-outline',        value: "Master's Degree" },
    { id: 'occ',       label: 'Occupation',           icon: 'briefcase-outline',     value: 'Product Designer' },
    { id: 'rel',       label: 'Relationship Goal',    icon: 'heart-outline',         value: 'Serious relationship' },
    { id: 'marital',   label: 'Marital Status',       icon: 'person-circle-outline', value: 'Single' },
    { id: 'children',  label: 'Has Children',         icon: 'people-circle-outline', value: 'No' },
    { id: 'wchildren', label: 'Wants Children',       icon: 'happy-outline',         value: 'Yes' },
    { id: 'smoking',   label: 'Smoking',              icon: 'ban-outline',           value: 'Non-smoker' },
    { id: 'drinking',  label: 'Drinking',             icon: 'water-outline',         value: 'Occasionally' },
  ],
};
