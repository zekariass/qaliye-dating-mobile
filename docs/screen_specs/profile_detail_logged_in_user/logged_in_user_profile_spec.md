Implement the **logged-in user profile screen** shown in the supplied visual design reference.

This screen is specifically for the **currently authenticated/logged-in user’s own profile**.

It is different from the other-user profile detail screen.

This screen must include current-user actions such as:

* Edit Profile
* Manage Photos
* Profile settings access
* Profile completion status
* Visibility status
* Onboarding status
* Verification status

Do not reuse the other-user profile screen unchanged. The logged-in user profile screen has management actions and account/profile status information that should not appear when viewing another user’s profile.

Before implementation, review:

```txt
docs\project-context.md
docs\schema.sql
docs\screen_specs\
```

Use them as follows:

* `docs\project-context.md`: understand the existing app structure, dependencies, styling conventions, navigation patterns, state patterns, folder structure, and shared components.
* `docs\schema.sql`: understand the intended user/profile data model, photo fields, verification state, profile completion fields, visibility, onboarding state, profile attributes, and future backend mapping.
* `docs\screen_specs\`: look for any relevant logged-in profile screen specifications or assets.
* Use the supplied visual reference image as the primary source for the screen’s layout, spacing, typography, cards, colors, shadows, image proportions, navigation, and interaction hierarchy.

Use generated fake current-user data for now. Do not add real API calls, database queries, backend integration, authentication work, analytics, persistence, or profile updates.

However, structure mock data, types, and screen state so they align with the relevant entities and naming in `docs\schema.sql`, making future backend integration straightforward.

Do not modify `docs\schema.sql`.

## Technology requirements

* Use React Native + Expo + TypeScript.
* Use NativeWind for styling through `className`.
* Prefer NativeWind utilities over `StyleSheet.create`.
* Use inline `style` only where runtime values are needed, including:

  * `useWindowDimensions` calculations
  * safe-area inset offsets
  * runtime card widths
  * image/gallery dimensions
  * animated values
  * unsupported NativeWind properties
  * platform-specific shadow or elevation behavior
* Reuse existing project dependencies, navigation patterns, shared UI primitives, and icon systems.
* Do not upgrade Expo, NativeWind, navigation, or dependencies unless absolutely required.
* Use the project’s existing icon library.
* Prefer `@expo/vector-icons` only when the project has no existing compatible icon system.
* Use `expo-image` for gallery images if it is already installed; otherwise use the project’s existing Expo-compatible image component.
* Use `react-native-safe-area-context` for safe-area handling.
* Add accessible `Pressable` interactions with real existing navigation where available, otherwise use placeholder handlers or `console.log`.

## Existing project structure

Follow the existing project structure, feature boundaries, naming conventions, import aliases, component patterns, navigation architecture, and theme system.

* Do not introduce a new folder structure where an existing convention already exists.
* Put new screens, types, mock data, components, and theme additions alongside similar existing features.
* Reuse existing shared components, icon wrappers, navigation utilities, layout primitives, theme helpers, and image components before creating new ones.
* Create reusable components only where they fit the established architecture.
* Keep fake data separate from presentational components when this matches the existing codebase pattern.
* Avoid broad refactors.
* If the project has no established pattern, use a minimal and maintainable approach.

## Theme architecture: required

Use semantic theme tokens rather than raw color values inside reusable components.

Create or extend the project’s existing NativeWind-compatible theme setup using the currently installed NativeWind version.

Required semantic tokens:

```txt
background
surface
surfaceMuted
surfaceElevated
textPrimary
textSecondary
textMuted
border
accent
accentSoft
accentStrong
success
navigationBackground
navigationInactive
shadow
```

Implement:

* A light theme closely matching the supplied visual reference.
* A dark theme with equivalent hierarchy, contrast, and readability.
* System theme support by default.
* A structure that supports a future manual theme toggle.
* Theme-aware colors for text, icons, surfaces, cards, borders, action buttons, badges, progress indicators, shadows, and navigation.
* No raw color literals inside reusable components except where unavoidable for icon-library props.

Suggested light-theme direction:

```txt
Background: warm white with a faint lavender/pink tint
Surface: pure white
Surface muted: very pale lavender
Primary text: deep navy
Secondary text: muted blue-gray/lavender
Accent: vivid violet-purple
Accent soft: pale lavender
Success: fresh green for status dots
Navigation background: nearly black with a subtle navy tone
Border: soft cool-gray/lilac
```

Use NativeWind semantic token classes, CSS variables, `dark:` utilities, or the project’s existing theme approach.

## Screen hierarchy

Build a vertically scrollable logged-in profile screen with a fixed floating bottom navigation bar.

```txt
SafeAreaView
  ProfileGallery
    Settings button
    Pagination dots
  ScrollView
    Overlapping profile content sheet
      Name, age, verification badge
      Edit Profile action
      Manage Photos action
      Location
      Bio
      Account/profile status cards
      Profile completion card
      Two-column profile details grid
  Floating bottom navigation
    Home
    Matches
    Center chat action
    Likes
    Profile
```

The bottom navigation must remain fixed while profile content scrolls.

Add sufficient bottom padding so the final detail cards are never covered by the floating navigation.

## Hero profile gallery

Build a full-width current-user photo gallery at the top of the screen.

Requirements:

* Large hero image occupying roughly 30–36% of the visible screen.
* Use 5 generated fake remote profile image URLs.
* Use horizontal paging through `ScrollView` or another performant Expo-compatible list.
* Use `pagingEnabled`.
* Use `useWindowDimensions` to calculate image widths.
* Track the active image index with `onMomentumScrollEnd`.
* Display five pagination dots near the lower center of the gallery image.
* Active dot uses the accent purple.
* Inactive dots use white or soft white with reduced opacity.
* Gallery images use `resizeMode="cover"` and must never stretch.
* Avoid visible layout shifts while images load.
* Use cached images and a smooth transition if supported by the existing image component.

## Settings action

Place a single circular settings button over the top-right of the hero image.

Requirements:

* Position below the top safe area.
* White circular elevated button.
* Purple outlined settings/gear icon.
* Approximately 52–60px accessible touch target.
* Use `Pressable` pressed feedback.
* `accessibilityLabel="Profile settings"`.
* If an existing settings route exists, navigate to it.
* Otherwise log `Open profile settings`.

Do not include a back button because this is a main logged-in user profile tab screen.

## Overlapping profile sheet

Create a white content sheet overlapping the lower section of the hero gallery.

Requirements:

* Large rounded top corners, approximately 34–42px.
* Slight upward overlap onto the gallery.
* White elevated surface.
* Spacious horizontal padding, approximately 20–24px.
* Maintain the layered premium visual design from the reference.
* Respect safe-area and bottom-navigation spacing.

## Fake current-user profile data

Use generated fake current-user data aligned with the schema where possible.

Use a type similar to:

```ts
type CurrentUserProfile = {
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
  details: Array<{
    id: string;
    label: string;
    value: string;
    icon: string;
  }>;
};
```

Use example fake content similar to:

```ts
const currentUserProfile = {
  id: 'current-liam-27',
  name: 'Liam',
  age: 27,
  verified: true,
  visibility: 'everyone',
  onboardingStatus: 'completed',
  verificationStatus: 'verified',
  profileCompletionPercent: 92,
  location: 'Bole, Addis Ababa, Ethiopia',
  bio: 'Product designer who loves solving problems and creating beautiful experiences. Coffee lover, travel enthusiast, and always up for meaningful conversations.',
  address: 'Bole, Addis Ababa, Ethiopia',
  images: [
    'https://...',
    'https://...',
    'https://...',
    'https://...',
    'https://...',
  ],
};
```

Use generated fake detail values:

```txt
Address: Bole, Addis Ababa, Ethiopia
Gender: Male
Date of Birth: Jun 12, 1998 (27)
Height: 180 cm
Residency Type: Ethiopia
Ethnicity: Tigrinya
Nationality: Ethiopian
Religion: Orthodox Christian
Education Level: Master’s Degree
Occupation: Product Designer
Relationship Intention: Serious relationship
Marital Status: Single
Has Children: No
Wants Children: Yes
Smoking: No
Drinking: Occasionally
```

## Profile header and actions

At the top of the content sheet, create a flexible layout matching the reference.

Left side:

* Large name: `Liam`
* Age: `27`
* Small blue verified badge directly after the name and age.
* Purple outlined location pin followed by `Bole, Addis Ababa, Ethiopia`.

Right side:

* Primary purple `Edit Profile` button.
* Secondary pale-lavender `Manage Photos` button.

Requirements for Edit Profile:

* Purple filled rounded rectangle.
* White edit/pencil icon.
* White `Edit Profile` text.
* Press action: navigate to the existing edit-profile flow if available; otherwise log `Edit profile`.

Requirements for Manage Photos:

* Pale lavender/white rounded rectangle.
* Purple outlined gallery/image icon.
* Purple `Manage Photos` text.
* Press action: navigate to existing photo management if available; otherwise log `Manage photos`.

Responsive behavior:

* Keep actions aligned to the right on wider screens.
* Stack actions below the profile title on smaller widths or large font scaling.
* Do not clip name, location, or button text.

## Bio section

Below the title/location/action region, show a multi-line biography.

Requirements:

* Comfortable line height.
* Theme-aware secondary text color.
* Keep the content visually calm and readable.
* Use the fake biography from the current user profile object.
* Avoid excessive truncation.

## Profile status cards

Below the bio, create three compact status cards and one profile-completion card, matching the reference.

Status cards:

```txt
Visible
Everyone

Onboarded
Completed

Verified
Identity
```

Requirements:

* Three compact cards aligned in a row when space allows.
* Each card has:

  * Purple icon
  * Main label
  * Smaller descriptive value
  * Small green status dot
* Use appropriate icons:

  * Visible: eye
  * Onboarded: user/profile
  * Verified: shield-check
* Use soft muted-surface backgrounds.
* Use large rounded corners.
* Maintain accessibility text explaining the status.
* If screen width or font scaling is constrained, wrap gracefully rather than clipping.

Profile completion card:

* Separate compact card positioned to the right of status cards when space allows.
* Shows:

  * Label: `Profile completion`
  * Large percentage: `92%`
  * Purple circular progress ring
* Use a theme-aware progress indicator.
* Use a reusable component.
* Do not use color alone to convey profile completion.
* Add an accessible label such as `Profile completion, 92 percent`.

For the initial implementation, the percentage and statuses are fake local data.

## Profile details grid

Render the profile attributes in a responsive two-column grid.

Each card must include:

* Purple outline or filled icon on the left.
* Small muted label.
* Larger primary-text value.
* White theme-aware surface.
* Soft theme-aware border.
* Large rounded corners.
* Consistent padding and icon alignment.
* Enough height for text and accessibility font scaling.
* No fixed height that causes clipping.

Responsive rules:

* Two columns on standard phone widths.
* Use `useWindowDimensions` for runtime sizing.
* Fall back to one column on narrow devices or when font scaling would create clipping.
* Handle odd item counts by keeping the final card left-aligned.
* Avoid nested vertical `ScrollView` components.

Suggested icon mapping:

```txt
Address: location pin
Gender: person
Date of Birth: calendar
Height: ruler
Residency Type: home
Ethnicity: users
Nationality: flag
Religion: cross
Education Level: graduation cap
Occupation: briefcase
Relationship Intention: heart
Marital Status: user
Has Children: stroller
Wants Children: family or baby
Smoking: cigarette-off
Drinking: wine glass
```

Use the closest matching icons from the existing Expo-compatible icon library.

## Floating bottom navigation

Implement the floating bottom navigation to match the visual reference.

Requirements:

* Fixed above the safe area.
* Large near-black pill-shaped container.
* Side margins approximately 18–24px.
* Strong rounded corners.
* Soft elevated shadow.
* Four tab destinations:

  * Home
  * Matches
  * Likes
  * Profile
* Profile is the active tab on this screen.

Active Profile state:

* Accent-purple icon and label.
* Small rounded lavender/purple underline beneath the active label.
* Other tabs use muted lavender-gray icons and labels.
* Ensure active state is identifiable without color alone.

Use an existing shared bottom-navigation component if available. Otherwise create a reusable implementation that follows existing project patterns.

## Center chat action

Place a large circular chat action centered above the floating navigation bar.

Requirements:

* Overlap the top-center edge of the nav bar.
* White or pale-lavender outer ring/backing.
* Vivid purple inner circle.
* White outlined messages/chat icon.
* Soft elevated shadow and subtle glow.
* Accessible touch target.
* Use existing messages navigation if available.
* Otherwise log `Open messages`.
* Must not cover tab labels or reduce usability of nearby tabs.

## NativeWind expectations

* Use NativeWind `className` for all static styles.
* Use semantic theme-aware classes, CSS variables, or the existing project theme implementation.
* Use `dark:` variants where applicable.
* Avoid large `StyleSheet.create` blocks.
* Avoid duplicated long utility strings across cards and status components.
* Extract reusable variants, class constants, or components when they improve maintainability.
* Use runtime styles only where NativeWind cannot cleanly express the requirement.
* Do not use unsupported web-only Tailwind utilities.

## Performance, responsiveness, and accessibility

* Respect safe-area insets.
* Use `useWindowDimensions` instead of hard-coded device widths.
* Support iOS and Android.
* Avoid nested vertical scrolling containers.
* Keep gallery and profile-detail rendering performant.
* Memoize gallery items and profile detail card renderers where appropriate.
* Use stable keys.
* Use `Pressable` feedback for all interactive elements.
* Add accessibility labels to every icon-only button.
* Ensure larger font scaling does not clip profile data, action labels, or status cards.
* Support reduced-motion preferences if animations are added.
* Ensure readable contrast in light and dark themes.
* Do not rely only on color for verified, active, or completion states.

## Deliverables

Implement the logged-in user profile screen and supporting reusable components following the current project structure.

At the end, provide:

1. A concise list of created or modified files.
2. A short explanation of the semantic theme-token implementation.
3. Any dependency assumptions.
4. Notes on generated fake data and placeholder interactions.
5. Confirmation that no backend, database, or API integration was added.
