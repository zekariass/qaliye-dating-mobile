Implement the **other-user profile detail screen** shown in the visual design reference.

This screen is for viewing **another user’s profile**, not the currently logged-in user’s own profile.

Do not include current-user-only actions or UI such as:

* Edit profile
* Account settings
* Profile photo management
* Subscription controls
* Personal preference controls
* Logout
* Delete account
* Profile completion prompts

The visual design reference is located at:

`docs\screen_specs\profile_detail_other_users\profile-screen-design-other-users.png`

Also review any relevant written specifications inside:

`docs\screen_specs\profile_detail_other_users\`

Use the visual reference as the primary source for layout, spacing, image proportions, typography hierarchy, card styles, shadows, overlapping content sheet, action buttons, and floating bottom navigation behavior.

Use generated fake profile data for now. Do not add backend, APIs, authentication, analytics, persistence, or real user data.

## Technology requirements

* Use React Native + Expo + TypeScript.
* Use NativeWind for styling with `className`.
* Prefer NativeWind utilities over `StyleSheet.create`.
* Use inline `style` only where runtime values are required, such as:

  * `useWindowDimensions` calculations
  * safe-area inset offsets
  * animated values
  * unsupported NativeWind properties
  * platform-specific shadow/elevation edge cases
* Reuse existing project dependencies and patterns.
* Do not upgrade Expo, NativeWind, navigation, or other dependencies unless absolutely necessary.
* Use the project’s existing icon library. Prefer `@expo/vector-icons` only if no icon system already exists.
* Use `expo-image` for gallery images if it already exists in the project. Otherwise use the project’s existing Expo-compatible image component.
* Use `react-native-safe-area-context` for safe-area handling.
* Add accessible `Pressable` interactions with placeholder actions or `console.log` statements where navigation or backend behavior is not yet connected.

## Existing project structure

Follow the project’s existing folder structure, feature boundaries, naming conventions, import aliases, component patterns, navigation architecture, and theme setup.

* Do not introduce a new folder structure if an established one already exists.
* Place new screen, component, type, mock-data, and theme files beside equivalent existing features where possible.
* Reuse existing shared UI primitives, theme utilities, icon wrappers, navigation components, and layout helpers before creating new ones.
* Create reusable components only when they fit the project’s existing component organization.
* Keep fake data separate from presentation components when that matches the current codebase approach.
* If the project has no clear convention, use a minimal maintainable structure without broad refactoring.

## Theme architecture: required

Use semantic theme tokens instead of raw hex values inside reusable components.

Create or extend the existing NativeWind-compatible theme setup using the project’s installed NativeWind version.

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
navigationBackground
navigationInactive
shadow
```

Implement:

* A light theme closely matching the supplied visual reference.
* A dark theme with equivalent hierarchy, contrast, and readability.
* System theme support by default.
* A structure that allows a future manual theme toggle.
* Theme-aware colors for icons, cards, text, borders, navigation, and shadows.
* No direct color literals in reusable screen components except when unavoidable for icon-library APIs.

Suggested light theme direction:

```txt
Background: warm off-white with a subtle lavender tint
Surface: white
Primary text: dark navy
Secondary text: muted slate/lavender gray
Accent: vivid violet-purple
Accent soft: pale lavender
Bottom navigation: near-black with subtle navy tone
Border: very soft cool gray
```

Use NativeWind semantic token classes, CSS variables, `dark:` variants, or the project’s existing theming approach.

## Screen layout

Build a vertically scrollable profile detail screen with a fixed floating bottom navigation bar.

Screen hierarchy:

```txt
SafeAreaView
  ProfileGallery
    Back button
    More-options button
    Pagination dots
  ScrollView
    Overlapping profile content sheet
      Name, age, verification badge
      Location
      Bio
      Full-width address card
      Two-column profile details grid
  Floating bottom navigation
    Home
    Matches
    Center chat action
    Likes
    Profile
```

The bottom navigation must remain fixed while profile content scrolls.

Add enough bottom padding so the last detail card is never hidden behind the floating navigation.

## Hero profile gallery

Build a full-width image gallery at the top.

Requirements:

* Large hero image occupying roughly 35–40% of the visible screen.
* Use 5 generated fake remote image URLs for the profile gallery.
* Use horizontal paging with `ScrollView` or another performant Expo-compatible list.
* Use `pagingEnabled`.
* Calculate image/page width with `useWindowDimensions`.
* Track the active image index using `onMomentumScrollEnd`.
* Show five pagination dots near the bottom center of the hero image.
* Active pagination dot uses the accent purple.
* Inactive dots use white or soft white with reduced opacity.
* Gallery images use `resizeMode="cover"` and must never stretch.
* Avoid image layout shifts while loading.
* Use image caching and transitions when supported by the existing image component.

## Hero actions

Place two circular action buttons over the hero image.

### Back button

* Position at the top-left below the safe area.
* White circular elevated surface.
* Dark back-arrow icon.
* Use existing navigation back behavior if available.
* Otherwise log a placeholder action.
* Include `accessibilityLabel="Go back"`.

### More-options button

* Position at the top-right below the safe area.
* White circular elevated surface.
* Purple horizontal three-dot icon.
* Use an existing action-sheet pattern if available.
* Otherwise log a placeholder action.
* Include `accessibilityLabel="More profile options"`.

Both action buttons must:

* Be approximately 52–60px touch targets.
* Have full-circle styling.
* Include soft shadow/elevation.
* Use `Pressable` feedback.
* Remain visually above the gallery image.

## Overlapping profile sheet

Create a white content sheet overlapping the bottom of the hero gallery.

Requirements:

* Large rounded top corners, approximately 34–42px.
* Slight upward overlap onto the hero image.
* White elevated surface.
* Spacious horizontal padding, approximately 20–24px.
* Respect safe-area and bottom-navigation spacing.
* Preserve the layered premium appearance from the reference image.

## Fake profile data

Use generated fake data for a profile similar to the supplied visual reference.

Use this general type:

```ts
type OtherUserProfile = {
  id: string;
  name: string;
  age: number;
  verified: boolean;
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

Use data similar to:

```ts
const profile = {
  id: 'liam-27',
  name: 'Liam',
  age: 27,
  verified: true,
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

Use generated fake details:

```txt
Gender: Male
Date of Birth: Jun 12, 1998
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

## Profile intro section

Display:

* `Liam, 27` in large bold dark text.
* A small blue verified badge directly after the name and age.
* Purple outlined location-pin icon followed by the location text.
* A multi-line bio underneath.
* Comfortable line height and muted dark-gray text.
* Proper accessibility semantics for verified status.

Preserve this hierarchy:

```txt
Large name and age
Location row
Bio paragraph
```

## Address card

Below the bio, render a full-width highlighted address card.

Requirements:

* Pale lavender or softly tinted surface.
* Large rounded corners.
* Purple filled location icon on the left.
* Small muted label: `Address`
* Larger dark text value: `Bole, Addis Ababa, Ethiopia`
* Soft border or subtle elevation.
* Reusable component if it fits existing code patterns.

## Profile details grid

Render a two-column grid of profile information cards below the address card.

Each detail card must include:

* Purple outline icon on the left.
* Small muted label.
* Larger dark value.
* White surface.
* Soft theme-aware border.
* Large rounded corners.
* Consistent padding and alignment.
* Sufficient minimum height for readable content.
* No fixed height that clips long labels, translated text, or larger accessibility font sizes.

Responsive behavior:

* Two columns on standard phone widths.
* Use responsive calculations from `useWindowDimensions`.
* Fall back to one column on narrow screens or where accessibility font scaling would cause clipping.
* When the number of items is odd, leave the final item left-aligned.
* Avoid nested vertical scroll views.

Suggested icon mapping:

```txt
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

Implement the floating bottom navigation matching the supplied reference.

Requirements:

* Fixed near the bottom of the screen, above the safe area.
* Large pill-shaped container.
* Side margins approximately 18–24px.
* Near-black theme-aware navigation background.
* Strong rounded corners.
* Soft elevated shadow.
* Four tab destinations:

  * Home
  * Matches
  * Likes
  * Profile
* Profile is the active tab on this screen.

Active Profile state:

* Purple or light-violet icon and label.
* Small rounded purple underline beneath the label.
* Other tabs use muted lavender-gray icons and labels.

Use an existing shared bottom-navigation component if available. Otherwise create a reusable implementation following project conventions.

## Center chat action

Place a large circular chat button centered above the floating bottom navigation.

Requirements:

* Overlap the top-center edge of the navigation.
* Use a white or pale-lavender outer ring/backing.
* Use a vivid purple inner circular button.
* White outlined messages/chat icon.
* Soft glow and elevated shadow.
* Accessible press target.
* Press behavior should log `Open messages` or use existing message navigation if available.
* Do not cover bottom-navigation labels or reduce usability of surrounding tabs.

## NativeWind expectations

* Use NativeWind `className` for static styles.
* Use theme-aware utility classes, semantic tokens, CSS variables, or the project’s existing NativeWind theme pattern.
* Use `dark:` variants where appropriate.
* Avoid large `StyleSheet.create` objects.
* Avoid repeating long class strings across profile detail cards.
* Extract repeated variants or shared class constants where useful.
* Use runtime styles only for values NativeWind cannot handle well.
* Do not use unsupported web-only Tailwind utilities.

## Responsiveness, performance, and accessibility

* Respect safe-area insets.
* Use `useWindowDimensions` instead of fixed device-specific dimensions.
* Support iOS and Android.
* Avoid nested vertical `ScrollView` components.
* Keep gallery and profile-detail rendering performant.
* Memoize gallery items and detail-card rendering where useful.
* Use stable keys.
* Use `Pressable` feedback for all interactive elements.
* Add accessibility labels to all icon-only buttons.
* Ensure increased font scaling does not clip important text.
* Support reduced-motion preferences if animations are added.
* Ensure adequate text contrast in light and dark themes.
* Do not rely on color alone to communicate active state or verification.

## Deliverables

Implement the screen and any supporting reusable components following the project’s existing structure.

At the end, provide:

1. A concise list of created or modified files.
2. A short explanation of the theme-token implementation.
3. Any dependency assumptions.
4. Notes on placeholder interactions and fake data.
5. Confirmation that no backend or API work was added.
