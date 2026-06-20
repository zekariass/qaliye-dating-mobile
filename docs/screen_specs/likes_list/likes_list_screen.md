Implement the **Likes list screen** shown in the visual design reference.

The screen design image is located at:

`docs\screen_specs\likes_list\likes-list-creen-design.png`

Before implementation, review these project documents:

```txt
docs\project-context.md
docs\schema.sql
docs\screen_specs\likes_list\
```

Use them as follows:

* `docs/project-context.md`: understand the existing app architecture, conventions, navigation, dependencies, styling approach, and feature boundaries.
* `docs/schema.sql`: understand the intended database entities, naming, relationships, profile fields, likes model, and how received/sent likes should eventually map to real data.
* `docs\screen_specs\likes_list\`: understand any written requirements for this specific screen.
* `likes-list-creen-design.png`: use as the primary visual source for layout, spacing, typography, image proportions, cards, segment control, shadows, and floating bottom navigation.

This screen shows profiles associated with likes:

* **Received Likes**: users who liked the currently logged-in user.
* **Sent Likes**: users the currently logged-in user has liked.

Use generated fake data for now. Do not add backend calls, database queries, authentication logic, persistence, analytics, or real user data.

However, structure mock data and UI state in a way that aligns with the existing database schema so future backend integration is straightforward.

Do not modify `docs/schema.sql`.

## Technology requirements

* Use React Native + Expo + TypeScript.
* Use NativeWind for styling with `className`.
* Prefer NativeWind utilities over `StyleSheet.create`.
* Use inline `style` only where runtime values are required, such as:

  * `useWindowDimensions` calculations
  * safe-area inset offsets
  * runtime card sizing
  * animated values
  * unsupported NativeWind properties
  * platform-specific shadow/elevation edge cases
* Reuse existing project dependencies and patterns.
* Do not upgrade Expo, NativeWind, navigation, or other dependencies unless absolutely necessary.
* Use the project’s existing icon library.
* Prefer `@expo/vector-icons` only if there is no existing icon system.
* Use `expo-image` for profile images if it already exists in the project; otherwise use the project’s existing Expo-compatible image component.
* Use `react-native-safe-area-context` for safe-area handling.
* Add accessible `Pressable` interactions with placeholder actions or `console.log` statements where navigation or backend behavior is not connected.

## Existing project structure

Follow the project’s existing folder structure, feature boundaries, naming conventions, import aliases, component patterns, navigation architecture, and theme setup.

* Do not introduce a new folder structure if an established one already exists.
* Place new screen, component, type, mock-data, and theme files beside equivalent existing features where possible.
* Reuse existing shared UI primitives, theme utilities, icon wrappers, navigation components, and layout helpers before creating new ones.
* Create reusable components only when they fit the existing project organization.
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

* A light theme closely matching the visual reference.
* A dark theme with equivalent contrast, visual hierarchy, and readability.
* System-theme support by default.
* A structure that supports a future manual theme toggle.
* Theme-aware colors for text, cards, icons, borders, chips, segmented control, shadows, and navigation.
* No raw color values inside reusable components except where unavoidable for icon-library APIs.

Suggested light-theme direction:

```txt
Background: warm off-white with a faint lavender/pink tint
Surface: white
Primary text: dark navy
Secondary text: muted slate/lavender gray
Accent: vivid violet-purple
Accent soft: pale lavender
Navigation background: near-black with subtle navy tone
Border: very soft cool gray
```

Use NativeWind semantic token classes, CSS variables, `dark:` variants, or the project’s existing theme approach.

## Screen hierarchy

Build a scrollable Likes screen with a fixed floating bottom navigation bar.

```txt
SafeAreaView
  LikesScreenContent
    Segmented likes control
      Received Likes
      Sent Likes
    Two-column profile grid
      LikeProfileCard
  Floating bottom navigation
    Home
    Matches
    Center chat action
    Likes
    Profile
```

The grid must scroll independently of the fixed bottom navigation.

Add enough bottom content padding so the final cards are never obscured by the navigation bar.

There is no top app bar or screen title in this design.

## Segmented likes control

At the top of the screen, create a wide two-option segmented control matching the visual reference.

Tabs:

```txt
Received Likes
Sent Likes
```

Requirements:

* Position below the top safe area with generous top spacing.
* Use approximately 20–28px horizontal page padding.
* The overall control should be a wide rounded capsule with a very soft white or translucent raised surface.
* The active tab should feel elevated and selected.
* Default selected tab: `Received Likes`.
* Active Received Likes styling:

  * Purple filled heart icon.
  * Purple text.
  * White raised pill/card surface.
  * Soft shadow or a subtle purple accent line near the lower edge.
* Inactive Sent Likes styling:

  * Gray outlined paper-plane/send icon.
  * Muted text.
  * Transparent or low-emphasis surface.
* Switching tabs should replace the visible grid data with fake Received Likes or fake Sent Likes data.
* Use local component state only.
* Use `Pressable` with visual pressed feedback.
* Add accessibility semantics:

  * `accessibilityRole="tab"`
  * selected-state indication
  * descriptive labels
* Ensure selected state is clear without relying only on color.

## Likes profile grid

Render a performant two-column profile grid below the segmented control.

Requirements:

* Use `FlatList` with `numColumns={2}`.
* Use a stable `keyExtractor`.
* Use generated fake data with at least:

  * 8–12 received likes
  * 8–12 sent likes
* Use responsive card widths calculated from screen width, outer gutters, and column gap.
* Do not hardcode widths for a specific device.
* Use approximately:

  * 20–24px horizontal screen padding
  * 16–20px column gap
  * 20–28px row gap
* Add enough top spacing below the segmented control.
* Add substantial bottom list padding for the floating navigation.

## Fake data structure

Use a fake data model that mirrors the relevant concepts and naming from `docs\schema.sql` as closely as practical without creating database logic.

Use a type similar to:

```ts
type LikeProfile = {
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
```

Use realistic generated profile data and varied generated portrait images.

Start the received list with profiles visually aligned to the reference:

```ts
const receivedLikes = [
  {
    id: 'received-emma',
    name: 'Emma',
    age: 25,
    location: 'Ireland, Dublin',
    distance: '3 km',
    intention: 'Long-term relationship',
    verified: true,
    type: 'received',
    image: 'https://...',
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
    image: 'https://...',
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
    image: 'https://...',
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
    image: 'https://...',
  },
];
```

Create a separate `sentLikes` array with different fake profiles.

Do not use real customer data.

## Like profile card

Create a reusable profile card matching the supplied design.

Card requirements:

* White surface.
* Large rounded corners, approximately 24–28px.
* Overflow hidden.
* Soft elevated shadow.
* Tall portrait-card proportions.
* Profile image should occupy approximately 62–66% of card height.
* Lower content section should occupy approximately 34–38%.
* Keep cards balanced on common iPhone and Android widths.
* Avoid fixed heights that clip text with larger accessibility font sizes.

### Profile image

* Full card width.
* Use `resizeMode="cover"`.
* Rounded only through parent-card clipping.
* Use high-quality generated fake portrait image URLs or the project’s existing mock image utility.
* Avoid stretched or distorted images.
* Use image placeholders or fade transitions where supported.

### Heart action button

Place a circular heart button at the top-right corner of the profile image.

Requirements:

* White circular elevated button.
* Purple filled heart icon.
* Approximately 48–54px touch target.
* Position approximately 14–16px from the top and right image edges.
* Use `Pressable` feedback.
* For Received Likes, this represents a placeholder “Like back” action.
* For Sent Likes, this represents a placeholder “Liked” state.
* Log an appropriate placeholder action until backend logic exists.
* Add a meaningful accessibility label.
* Prevent the heart button press from triggering the parent card press.

### Name and verified badge

Display a bold name and age, for example:

```txt
Emma, 25
```

Requirements:

* Dark theme-aware primary text.
* Approximately 20–22px font size.
* Strong font weight.
* Purple verified badge directly after the name and age.
* Badge must not create awkward line wrapping.
* Include accessible verified-state semantics.

### Location and distance row

Below the name row:

```txt
[purple map pin] Ireland, Dublin     [muted distance icon] 3 km
```

Requirements:

* Use `justify-between`.
* Location pin uses accent purple.
* Distance icon and text use muted theme-aware colors.
* Use approximately 14–16px text.
* Preserve alignment for longer location names.

### Relationship intention pill

At the bottom of the card content, show an intention chip.

Examples:

```txt
Long-term relationship
Serious relationship
Open to dating
Casual, see where it goes
```

Requirements:

* Pale lavender accent-soft background.
* Purple heart icon.
* Accent-colored text.
* Fully rounded pill shape.
* Approximately 34–38px tall.
* Horizontal padding around 12–16px.
* Text should truncate gracefully or wrap safely without breaking the card layout.
* Keep the chip aligned toward the lower-left area.

## Card interactions

* Tapping a profile card should open the other-user profile detail screen if that route already exists.
* The other-user profile detail screen is not the currently logged-in user profile screen.
* If the profile route does not exist, log a placeholder action such as `Open profile: <id>`.
* Tapping the heart button must not trigger the parent card action.
* Use correct nested `Pressable` handling.
* Add appropriate accessibility roles and labels.

## Floating bottom navigation

Implement the floating bottom navigation to match the design reference.

Requirements:

* Fixed near the bottom, above the safe area.
* Large near-black pill-shaped container.
* Side margins approximately 18–24px.
* Strong rounded corners.
* Soft elevated shadow.
* Four tab destinations:

  * Home
  * Matches
  * Likes
  * Profile
* Likes is the active tab on this screen.

Active Likes state:

* Purple or light-violet icon and label.
* Filled heart icon with a secondary heart or closest equivalent.
* Small rounded lavender/purple underline below the label.
* Other tabs use muted lavender-gray icons and labels.

Use an existing shared bottom-navigation component if one exists. Otherwise create a reusable implementation that follows project conventions.

## Center chat action

Place a large circular chat action centered above the floating bottom navigation.

Requirements:

* Overlap the top-center edge of the navigation.
* White or pale-lavender outer ring/backing.
* Vivid purple inner circular button.
* White outlined messages/chat icon.
* Soft glow and elevated shadow.
* Accessible press target.
* Use existing message navigation if available.
* Otherwise log `Open messages`.
* Do not cover navigation labels or reduce usability of surrounding tabs.

## NativeWind expectations

* Use NativeWind `className` for static styles.
* Use theme-aware utility classes, semantic tokens, CSS variables, or the project’s existing NativeWind theme pattern.
* Use `dark:` variants where appropriate.
* Avoid large `StyleSheet.create` blocks.
* Avoid repeating long card class strings.
* Extract repeated card variants, shared classes, or reusable components where useful.
* Use runtime styles only for values NativeWind cannot cleanly express.
* Do not use unsupported web-only Tailwind utilities.

## Responsiveness, performance, and accessibility

* Respect safe-area insets.
* Use `useWindowDimensions` rather than device-specific hardcoded dimensions.
* Support iOS and Android.
* Avoid nested vertical scroll views.
* Use `FlatList` virtualization for the profile grid.
* Memoize card components and callbacks where useful.
* Use stable list keys.
* Ensure all icon-only buttons have accessibility labels.
* Ensure increased font scaling does not clip names, locations, or intention text.
* Support reduced-motion preferences if animations are added.
* Ensure adequate text contrast in light and dark themes.
* Do not rely on color alone to communicate active tab or selected-like state.

## Deliverables

Implement the Likes list screen and supporting reusable components following the project’s existing structure.

At the end, provide:

1. A concise list of created or modified files.
2. A short explanation of the semantic theme-token implementation.
3. Any dependency assumptions.
4. Notes about fake profile data and placeholder interactions.
5. Confirmation that no backend, database, or API work was added.
