// ─── LikeProfile type ─────────────────────────────────────────────────────────
// Mirrors the relevant schema.sql concepts:
//   profile_likes (liker_user_id, liked_user_id, created_at)
//   profiles      (display_name, date_of_birth, relationship_intention, is_verified)
//   addresses     (country_name, city)
//   profile_photos (photo_url, is_primary)
// "type" reflects which side the current user is on for this entry.

export type LikeProfile = {
  id: string;
  name: string;
  age: number;
  location: string;
  distance: string;
  intention: string;
  image: string;
  verified: boolean;
  type: 'received' | 'sent';
};

// ─── Received likes ───────────────────────────────────────────────────────────
// Users who liked the currently logged-in user.

export const RECEIVED_LIKES: LikeProfile[] = [
  {
    id: 'received-emma',
    name: 'Emma',
    age: 25,
    location: 'Ireland, Dublin',
    distance: '3 km',
    intention: 'Long-term relationship',
    verified: true,
    type: 'received',
    image: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    id: 'received-sophie',
    name: 'Sophie',
    age: 28,
    location: 'Ireland, Galway',
    distance: '12 km',
    intention: 'Serious relationship',
    verified: true,
    type: 'received',
    image: 'https://randomuser.me/api/portraits/women/45.jpg',
  },
  {
    id: 'received-olivia',
    name: 'Olivia',
    age: 24,
    location: 'Ireland, Cork',
    distance: '25 km',
    intention: 'Long-term relationship',
    verified: true,
    type: 'received',
    image: 'https://randomuser.me/api/portraits/women/46.jpg',
  },
  {
    id: 'received-mia',
    name: 'Mia',
    age: 27,
    location: 'Ireland, Limerick',
    distance: '38 km',
    intention: 'Serious relationship',
    verified: true,
    type: 'received',
    image: 'https://randomuser.me/api/portraits/women/47.jpg',
  },
  {
    id: 'received-chloe',
    name: 'Chloe',
    age: 23,
    location: 'Ireland, Kilkenny',
    distance: '5 km',
    intention: 'Open to dating',
    verified: true,
    type: 'received',
    image: 'https://randomuser.me/api/portraits/women/48.jpg',
  },
  {
    id: 'received-ava',
    name: 'Ava',
    age: 26,
    location: 'Ireland, Waterford',
    distance: '14 km',
    intention: 'Casual, see where it goes',
    verified: false,
    type: 'received',
    image: 'https://randomuser.me/api/portraits/women/49.jpg',
  },
  {
    id: 'received-isabella',
    name: 'Isabella',
    age: 29,
    location: 'Ireland, Sligo',
    distance: '7 km',
    intention: 'Serious relationship',
    verified: true,
    type: 'received',
    image: 'https://randomuser.me/api/portraits/women/50.jpg',
  },
  {
    id: 'received-lily',
    name: 'Lily',
    age: 22,
    location: 'Ireland, Wexford',
    distance: '19 km',
    intention: 'Long-term relationship',
    verified: false,
    type: 'received',
    image: 'https://randomuser.me/api/portraits/women/51.jpg',
  },
  {
    id: 'received-charlotte',
    name: 'Charlotte',
    age: 27,
    location: 'Ireland, Tralee',
    distance: '31 km',
    intention: 'Serious relationship',
    verified: true,
    type: 'received',
    image: 'https://randomuser.me/api/portraits/women/52.jpg',
  },
  {
    id: 'received-amelia',
    name: 'Amelia',
    age: 24,
    location: 'Ireland, Athlone',
    distance: '44 km',
    intention: 'Long-term relationship',
    verified: true,
    type: 'received',
    image: 'https://randomuser.me/api/portraits/women/53.jpg',
  },
];

// ─── Sent likes ───────────────────────────────────────────────────────────────
// Users the currently logged-in user has liked.

export const SENT_LIKES: LikeProfile[] = [
  {
    id: 'sent-grace',
    name: 'Grace',
    age: 26,
    location: 'Ireland, Dublin',
    distance: '2 km',
    intention: 'Long-term relationship',
    verified: true,
    type: 'sent',
    image: 'https://randomuser.me/api/portraits/women/11.jpg',
  },
  {
    id: 'sent-zoe',
    name: 'Zoe',
    age: 24,
    location: 'Ireland, Galway',
    distance: '9 km',
    intention: 'Serious relationship',
    verified: true,
    type: 'sent',
    image: 'https://randomuser.me/api/portraits/women/12.jpg',
  },
  {
    id: 'sent-hannah',
    name: 'Hannah',
    age: 27,
    location: 'Ireland, Cork',
    distance: '18 km',
    intention: 'Open to dating',
    verified: false,
    type: 'sent',
    image: 'https://randomuser.me/api/portraits/women/13.jpg',
  },
  {
    id: 'sent-ella',
    name: 'Ella',
    age: 23,
    location: 'Ireland, Limerick',
    distance: '27 km',
    intention: 'Casual, see where it goes',
    verified: true,
    type: 'sent',
    image: 'https://randomuser.me/api/portraits/women/14.jpg',
  },
  {
    id: 'sent-scarlett',
    name: 'Scarlett',
    age: 29,
    location: 'Ireland, Kilkenny',
    distance: '6 km',
    intention: 'Long-term relationship',
    verified: true,
    type: 'sent',
    image: 'https://randomuser.me/api/portraits/women/15.jpg',
  },
  {
    id: 'sent-violet',
    name: 'Violet',
    age: 25,
    location: 'Ireland, Waterford',
    distance: '11 km',
    intention: 'Serious relationship',
    verified: false,
    type: 'sent',
    image: 'https://randomuser.me/api/portraits/women/16.jpg',
  },
  {
    id: 'sent-aurora',
    name: 'Aurora',
    age: 28,
    location: 'Ireland, Sligo',
    distance: '22 km',
    intention: 'Long-term relationship',
    verified: true,
    type: 'sent',
    image: 'https://randomuser.me/api/portraits/women/17.jpg',
  },
  {
    id: 'sent-luna',
    name: 'Luna',
    age: 22,
    location: 'Ireland, Wexford',
    distance: '35 km',
    intention: 'Open to dating',
    verified: true,
    type: 'sent',
    image: 'https://randomuser.me/api/portraits/women/18.jpg',
  },
  {
    id: 'sent-stella',
    name: 'Stella',
    age: 30,
    location: 'Ireland, Tralee',
    distance: '8 km',
    intention: 'Serious relationship',
    verified: false,
    type: 'sent',
    image: 'https://randomuser.me/api/portraits/women/19.jpg',
  },
  {
    id: 'sent-aria',
    name: 'Aria',
    age: 26,
    location: 'Ireland, Ennis',
    distance: '16 km',
    intention: 'Casual, see where it goes',
    verified: true,
    type: 'sent',
    image: 'https://randomuser.me/api/portraits/women/20.jpg',
  },
];
