# Qaliye Mobile App — AI Agent Project Context

## Project Overview

Qaliye is a modern dating mobile app built with React Native Expo. The app helps users create meaningful romantic connections through discovery, likes, matches, messages, profile browsing, onboarding, and preference-based matching.

The design direction is romantic, premium, soft, modern, and culturally warm. The app should feel trustworthy, safe, elegant, and emotionally inviting from the first screen.

The first screen to implement is the Splash Screen.

The app must be scalable, maintainable, multilingual, and suitable for production development.

---

## App Name

Qaliye

---

## Core Product Flow

The user creates or logs into an account using:

* Phone number
* Google
* Apple
* Email

After authentication:

* If the user has not completed onboarding, open the onboarding flow.
* If the user is already onboarded, open the Discovery screen.

---

## Main App Screens

The app includes the following main screens:

* Splash screen
* Login / Create Account screen
* Onboarding screen
* Discovery screen
* Likes screen
* Matches screen
* Messages list screen
* Chat screen
* Other user profile screen
* Current logged-in user profile screen
* Edit Profile screen
* Edit Profile Photos tab
* Edit Profile Preferences tab
* Settings screen

---

## Core Tech Stack

### Core

* Expo Managed Workflow
* React Native
* TypeScript

### Navigation

* React Navigation
* Bottom Tab Navigation
* Stack Navigation for nested flows

### State Management

* Zustand for client/local state only
* React Query for server state only

### Networking

* Axios
* Axios interceptors
* expo-secure-store for sensitive tokens
* AsyncStorage for non-sensitive lightweight preferences

### Forms and Validation

* react-hook-form
* Zod

### Internationalisation

* i18next
* react-i18next
* Expo Localization

### UI

* NativeWind
* Reusable design system components
* Safe area handling
* Responsive mobile layouts

### Animations

* react-native-reanimated
* Reanimated must be used for splash screen animations, onboarding transitions, button interactions, tab animations, card gestures, and micro-interactions.

### Notifications and Analytics

* Expo Notifications
* Firebase Analytics

### Crash Reporting

* Sentry for Expo

### Build and Deployment

* EAS Build
* EAS Submit
* Expo Updates may be used later if needed.

### Testing

* Jest
* React Native Testing Library
* Detox

---

## Architecture Rules

### React Query Rule

Use React Query only for server state:

* API data fetching
* Mutations
* Caching
* Pagination
* Invalidation
* Backend synchronization

Do not use React Query for:

* Selected tab state
* Theme state
* Modal state
* Form state
* Local onboarding step state
* App language state

---

### Zustand Rule

Use Zustand only for client state:

* Auth session state
* Selected language
* Theme preferences
* Onboarding local progress
* Temporary UI state
* App preferences
* Current user lightweight metadata

Do not use Zustand for API-fetched lists or backend resources that belong in React Query.

---

### Axios Rule

All backend communication must go through the API layer.

Do not call Axios directly inside screens.

Do not use fetch directly.

All API files must live under:

```txt
src/api/
```

Screens should call hooks. Hooks should call API services.

---

### Screen Rule

Screens must be thin.

Screens should only:

* Render UI
* Call hooks
* Trigger actions
* Pass data to components

Business logic must live in:

```txt
src/services/
src/hooks/
src/store/
src/api/
```

---

### Reusable Component Rule

Avoid duplicated UI.

Create reusable components for:

* App buttons
* Text inputs
* Select fields
* Toggle fields
* Cards
* Profile cards
* Photo cards
* Preference controls
* Screen headers
* Bottom tab bar
* Empty states
* Loading states
* Error states
* Language switcher
* Animated hearts
* Gradient backgrounds

---

## Required Folder Structure

Use this structure:

```txt
src/
  api/
    auth/
    profile/
    discovery/
    likes/
    matches/
    messages/
    preferences/
  assets/
    images/
    icons/
    fonts/
  components/
    common/
    ui/
    layout/
    forms/
    profile/
    discovery/
    messages/
    animations/
    language-switcher/
  config/
  constants/
    colors.ts
    theme.ts
    routes.ts
    storageKeys.ts
    queryKeys.ts
    locales.ts
  hooks/
    auth/
    profile/
    discovery/
    messages/
    preferences/
  i18n/
    locales/
      en/
      am/
      ti/
      om/
    index.ts
  navigation/
    RootNavigator.tsx
    AuthNavigator.tsx
    AppTabs.tsx
    ProfileNavigator.tsx
    MessagesNavigator.tsx
  screens/
    splash/
    auth/
    onboarding/
    discovery/
    likes/
    matches/
    messages/
    profile/
    preferences/
    settings/
  services/
    auth/
    storage/
    location/
    analytics/
    notifications/
  store/
    auth/
    app/
    language/
    onboarding/
    theme/
  types/
    auth.ts
    profile.ts
    address.ts
    discovery.ts
    messages.ts
    navigation.ts
  utils/
    date.ts
    age.ts
    distance.ts
    validation.ts
    formatting.ts
  providers/
    AppProviders.tsx
    QueryProvider.tsx
    ThemeProvider.tsx
```

Do not create random folders outside this structure unless clearly justified.

---

## Internationalisation Requirements

Qaliye must support four initial languages:

* English: `en`
* Amharic: `am`
* Tigrinya: `ti`
* Oromo: `om`

Rules:

* No hardcoded user-facing strings.
* All visible static strings must use translation keys.
* Language files must be easy to extend.
* Adding more languages later should only require adding a new locale folder and registering the language.
* Selected language must persist locally.
* Expo Localization should be used to detect the device language.
* English should be the fallback language.
* The language switcher must be reusable.

Example structure:

```txt
src/i18n/locales/en.json
src/i18n/locales/am.json
src/i18n/locales/ti.json
src/i18n/locales/om.json
```

Example key style:

```json
{
  "app": {
    "name": "Qaliye"
  },
  "auth": {
    "login": "Log In",
    "createAccount": "Create Account"
  },
  "splash": {
    "tagline": "Where hearts connect"
  }
}
```

---

## Brand Theme

Qaliye uses a romantic purple-pink visual identity with soft pastel backgrounds, glowing hearts, smooth curves, rounded cards, and premium spacing.

The theme should feel:

* Romantic
* Elegant
* Trustworthy
* Soft
* Premium
* Modern
* Culturally warm
* Friendly

---

## Brand Colors

Use the following theme as the design foundation.

### Primary Colors

```ts
primary: '#8A2CFF'
primaryDark: '#5B18D6'
primaryLight: '#B777FF'
```

Primary purple is used for:

* Main CTA buttons
* Active bottom tab icons
* Active segmented controls
* Progress indicators
* Important icons
* Focused input borders

---

### Secondary / Romantic Colors

```ts
heartPink: '#FF4FA3'
heartRose: '#FF7ABF'
softPink: '#FFE4F3'
```

Use pink tones for:

* Hearts
* Splash highlights
* Romantic accents
* Small decorative glows
* Like indicators

---

### Gradient Colors

Main brand gradients:

```ts
purpleGradientStart: '#A020F0'
purpleGradientEnd: '#6D35FF'

romanticGradientStart: '#FF4FA3'
romanticGradientEnd: '#8A2CFF'

backgroundGradientTop: '#FFF6FB'
backgroundGradientMiddle: '#F7EEFF'
backgroundGradientBottom: '#EFE7FF'
```

Use gradients for:

* Splash screen background
* Primary CTA buttons
* Floating message button
* Active central tab button
* Heart logo
* Onboarding progress
* Premium cards

---

### Neutral Colors

```ts
textPrimary: '#111827'
textSecondary: '#6B7280'
textMuted: '#9CA3AF'
border: '#E9DDF8'
surface: '#FFFFFF'
surfaceSoft: '#FAF7FF'
blackTab: '#06070D'
```

Use neutral colors for:

* Body text
* Secondary labels
* Form placeholders
* Card borders
* Bottom navigation background

---

### Status Colors

```ts
success: '#22C55E'
verifiedBlue: '#2F80ED'
warning: '#F59E0B'
danger: '#EF4444'
online: '#22C55E'
```

Use status colors for:

* Verified badge
* Online dot
* Error states
* Success states
* Warning states

---

## Typography

Use clean, rounded, modern typography.

Preferred style:

* Large elegant headings
* Clear readable body text
* Strong button labels
* Soft secondary labels

Suggested font strategy:

* Use system fonts first for implementation speed.
* Add custom fonts later if needed.
* Splash screen and brand logo may use an elegant serif-like visual style if implemented as an image or SVG asset.

Typography scale:

```ts
fontSize: {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 22,
  xl: 28,
  '2xl': 36,
  '3xl': 48
}
```

---

## Border Radius

Qaliye should use soft rounded shapes.

```ts
radius: {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  full: 999
}
```

Use large rounded cards for profile photos, modal cards, input containers, and bottom navigation.

---

## Shadows

Use soft shadows only.

Cards should feel elevated but not heavy.

```ts
shadowSoft: {
  shadowColor: '#8A2CFF',
  shadowOpacity: 0.12,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6
}
```

---

## Bottom Navigation Design

The app uses a custom rounded black bottom navigation bar consistent across the main app.

Tabs:

* Home
* Matches
* Center Messages button
* Likes
* Profile

Rules:

* The center Messages button is circular, purple gradient, larger than other tabs, and sits slightly above the tab bar.
* Active tab icon and label use primary purple.
* Inactive tab icons use muted gray.
* The bottom nav background is near black.
* Keep the same shape across Discovery, Likes, Matches, Messages, and Profile screens.
* Do not replace the bottom navigation with a default tab bar.

---

## Splash Screen Direction

The Splash screen is the first impression of the app.

It must be visually polished and animated.

Design style:

* Full-screen soft purple/pink gradient
* Qaliye logo centered
* Heart-shaped brand mark
* Floating hearts
* Subtle sparkle particles
* Elegant tagline
* Smooth entrance animation
* Loading indicator near the bottom

Splash text:

```txt
Qaliye
Where hearts connect
```

Suggested animation using react-native-reanimated:

* Background gradient fades in.
* Heart logo scales from 0.75 to 1.0 with spring animation.
* Floating hearts gently move upward and fade.
* Logo text fades and slides upward.
* Tagline fades in after logo.
* Loading dots pulse in sequence.
* After app bootstrap completes, navigate to:

  * Onboarding if the authenticated user is not onboarded
  * Discovery if onboarded
  * Login/Create Account if unauthenticated

The splash screen should not contain business logic directly. It should call a hook such as:

```ts
useBootstrapApp()
```

The hook decides the next route based on auth state and onboarding state.

---

## Authentication Flow

Supported account methods:

* Phone number
* Google
* Apple
* Email

Rules:

* Tokens must be stored in SecureStore.
* Non-sensitive app preferences may use AsyncStorage.
* Do not store sensitive data in AsyncStorage.
* Auth state should be restored on app launch.
* After login/signup, check whether the user is onboarded.
* If `is_onboarded` is false, navigate to onboarding.
* If `is_onboarded` is true, navigate to Discovery.

---

## Onboarding Flow

The onboarding flow collects all required profile information.

Step 1: Location

Ask:

```txt
Where do you live now?
```

Options:

* Use my location
* Ethiopia
* Eritrea
* Diaspora / Abroad

If the user selects “Use my location”:

* Ask for location permission.
* Infer country and city.
* Set address fields.
* Set `residency_type` automatically:

  * Ethiopia -> `ETHIOPIA`
  * Eritrea -> `ERITREA`
  * Any other country -> `DIASPORA`

Step 2: Confirm Country and City

The user confirms:

* Country
* City
* Region if available
* Formatted address if available

Step 3: Gender

Ask:

```txt
Are you?
```

Options:

* Male
* Female

No same-gender dating.

Set discovery preference automatically:

* If gender is `MALE`, set `interested_in_gender` to `FEMALE`.
* If gender is `FEMALE`, set `interested_in_gender` to `MALE`.

Step 4: Profile Details

Collect:

* Date of birth
* Bio
* Height in cm
* Ethnicity
* Nationality
* Religion
* Education level
* Occupation
* Relationship intention
* Marital status
* Has children
* Wants children
* Smoking
* Drinking

Step 5: Photos

User uploads or selects profile photos.

Rules:

* At least one profile photo is required.
* User can reorder photos.
* User can choose a primary photo.
* Photo dots should be shown when a user has multiple photos.

After onboarding completion:

* Set `is_onboarded` to true.
* Navigate to Discovery.

---

## Profile Schema Context

The app profile data is based on this model:

```ts
type Profile = {
  userId: string;
  addressId?: string | null;
  displayName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string;
  bio?: string | null;
  heightCm?: number | null;
  residencyType: 'ETHIOPIA' | 'ERITREA' | 'DIASPORA';
  ethnicity?: string | null;
  nationality?: string | null;
  religion?: string | null;
  educationLevel?: string | null;
  occupation?: string | null;
  relationshipIntention?: string | null;
  maritalStatus?: string | null;
  hasChildren: boolean;
  wantsChildren?: boolean | null;
  smoking: boolean;
  drinking: boolean;
  isVisible: boolean;
  isOnboarded: boolean;
  isVerified: boolean;
  profileCompletionScore: number;
  createdAt: string;
  updatedAt: string;
};
```

Address data should include:

```ts
type Address = {
  id: string;
  countryCode: string;
  countryName: string;
  city: string;
  region?: string | null;
  formattedAddress?: string | null;
  locationSource: 'GPS' | 'MANUAL' | 'IP';
};
```

---

## Discovery Preferences Schema Context

Discovery preferences are based on:

```ts
type DiscoveryPreferences = {
  userId: string;
  discoveryMode: 'STANDARD' | 'GLOBAL' | 'INCOGNITO';
  preferredResidencyTypes: Array<'ETHIOPIA' | 'ERITREA' | 'DIASPORA'>;
  interestedInGender: 'MALE' | 'FEMALE' | 'ALL';
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  openToLongDistance: boolean;
  openToRelocation: boolean;
  showVerifiedOnly: boolean;
  createdAt: string;
  updatedAt: string;
};
```

---

## Profile and Edit Profile Rules

The current logged-in user profile screen should show:

* Main profile photo
* Multiple photo dots if multiple photos exist
* Display name
* Age
* Verified badge
* Address
* Bio
* Profile completion score
* Visibility status
* Onboarding status
* Verification status
* All profile fields
* Edit Profile button
* Manage Photos button

Edit Profile screen tabs:

* Basics
* Personal
* Lifestyle
* Preferences
* Photos

Important:

* `is_onboarded` and `is_verified` are read-only.
* Onboarded Completed and Verified Identity must not appear as editable switches.
* Show them as read-only status rows or badges.
* Use a lock/read-only note if needed.

---

## Discovery Screen Rules

Discovery screen shows one profile card at a time.

Top bar:

* User avatar on the left
* Center dropdown title: Nearby
* Settings icon on the right

Profile card:

* Large photo
* Horizontal photo dots at the top-right inside the photo
* Name, verified badge, age
* Distance in km
* Relationship intention
* Action buttons:

  * Rewind / undo
  * Pass
  * Like / super-like visual

Bottom navigation:

* Home active on discovery screen
* Matches
* Center Messages
* Likes
* Profile

---

## Likes Screen Rules

Likes screen contains:

* Top tabs:

  * Received Likes
  * Sent Likes

Grid:

* 2x2 profile grid
* Each item has a photo covering around 75% of the card height.
* Below the image show:

  * Name
  * Location: country and city
  * Distance in km
  * Relationship intention
* Heart icon should remain on the profile photo.
* Likes tab should be active in bottom navigation.

---

## Matches Screen Rules

Matches screen uses the same grid style as Likes.

Differences:

* No top tabs.
* Photo icon should be a message/chat icon instead of heart.
* Matches tab should be active in bottom navigation.

---

## Messages Screen Rules

Messages screen shows conversations sorted by created date or latest message date descending.

Rules:

* Do not show a horizontal story/list under the Messages title.
* Do not show search icon.
* Do not show pencil/compose icon.
* Do not show Groups tab.
* Show only:

  * Messages title
  * Subtitle
  * All / Unread segmented filter
  * Message list
  * Shared bottom navigation

Each message row should show:

* Avatar
* Online status if available
* Display name
* Verified badge if available
* Last message preview
* Last message date/time
* Unread count badge if unread

Messages bottom nav:

* Center Messages button should be active.

---

## Chat Screen Rules

Chat screen shows a conversation with another user.

Top header:

* Back icon
* User avatar
* User display name
* Verified badge
* Online status

Do not show:

* Call icon
* Three-dot menu icon

Chat content:

* Date separator
* Incoming bubbles on the left
* Outgoing bubbles on the right
* Incoming bubbles use soft lavender/gray
* Outgoing bubbles use purple gradient
* Timestamps
* Delivered/read state if available

Input area:

* Plus icon
* Text input
* Emoji icon
* Send button

---

## API and Data Rules

Do not invent API endpoints.

Create typed API services, but keep endpoint paths configurable.

Example:

```ts
src/api/profile/profileApi.ts
src/api/messages/messagesApi.ts
src/api/discovery/discoveryApi.ts
```

React Query hooks should live in:

```ts
src/hooks/profile/
src/hooks/messages/
src/hooks/discovery/
```

Example hook names:

```ts
useCurrentProfile()
useUpdateProfile()
useDiscoveryProfiles()
useLikes()
useMatches()
useMessages()
useChatMessages()
useDiscoveryPreferences()
useUpdateDiscoveryPreferences()
```

---

## Error Handling Standards

Every major screen must support:

* Loading state
* Empty state
* Error state
* Offline state
* Retry action

Create reusable components:

```txt
NetworkErrorState
GenericErrorState
EmptyState
LoadingState
ScreenLoader
```

No silent failures.

No hidden loading.

---

## Accessibility Rules

* Buttons must have accessibility labels.
* Inputs must have accessible labels.
* Icon-only buttons must have labels.
* Color should not be the only way to communicate status.
* Text must be readable on gradient backgrounds.
* Touch targets should be at least 44x44.

---

## Implementation Priority

Build one feature at a time.

Current priority:

1. Foundation theme and project setup
2. Splash screen
3. Login/Create Account screen
4. Onboarding flow
5. Discovery screen
6. Likes screen
7. Matches screen
8. Messages screen
9. Chat screen
10. Other user profile screen
11. Current user profile screen
12. Edit Profile screen
13. Preferences screen
14. Settings screen

Do not implement multiple major systems at once.

---

## Current Task

Start with the Splash Screen.

The AI agent should:

1. Create the theme constants.
2. Configure NativeWind usage.
3. Set up i18n foundations for English, Amharic, Tigrinya, and Oromo.
4. Create reusable animated heart components.
5. Create the Qaliye splash screen using react-native-reanimated.
6. Implement bootstrap routing placeholder logic.
7. Keep the splash screen visually aligned with the generated design:

   * Soft lavender-pink gradient
   * Large heart brand mark
   * Qaliye wordmark
   * Tagline
   * Floating animated hearts
   * Sparkles or soft glowing particles
   * Pulsing loading dots

The splash screen must be production-quality, not a static placeholder.

---

## Code Quality Standards

Required:

* Strict TypeScript
* Small focused files
* Reusable components
* Clear naming
* No duplicated logic
* No business logic inside screens
* No hardcoded user-facing strings
* No random folders
* No direct API calls inside components
* No direct storage calls inside components
* No inline magic colors; use theme constants
* No giant files

Always prioritize:

* Scalability over speed
* Maintainability over quick hacks
* Architecture over shortcuts
* Long-term quality over temporary fixes
