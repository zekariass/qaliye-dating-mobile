Implement the **Edit Profile screen flow for the currently logged-in user** using the three supplied visual design references:

```txt
edit-profile-screen-design-basic-tab.png
edit-profile-screen-design-photos-tab.png
edit-profile-screen-design-preferences-tab.png
```

Before implementation, review:

```txt
docs\project-context.md
docs\schema.sql
docs\screen_specs\
```

Use them as follows:

* `docs\project-context.md`: understand the app architecture, existing component patterns, navigation, dependencies, styling conventions, folder structure, and theme setup.
* `docs\schema.sql`: understand the intended current-user profile model, profile fields, photos, discovery preferences, verification, onboarding, and completion-state data.
* `docs\screen_specs\`: check for written Edit Profile specifications or matching design assets.
* The three supplied images are the primary visual source for the screen layout, spacing, typography, visual hierarchy, controls, cards, shadows, and interaction states.

This screen is only for the **currently logged-in user editing their own profile**.

Do not build this as an other-user profile screen. Include editable profile management, photo management, discovery preferences, progress tracking, save actions, and read-only account status.

Use generated mock data and local component state only for design testing.

Do not add backend integration, API calls, database queries, authentication changes, persistence, analytics, uploads, or actual image editing. Structure local state and mock types to align with `docs\schema.sql` for later backend integration.

Do not modify `docs\schema.sql`.

## Technology requirements

* Use React Native + Expo + TypeScript.
* Use NativeWind for styling through `className`.
* Prefer NativeWind utilities over `StyleSheet.create`.
* Use inline `style` only for runtime-specific values such as:

  * safe-area inset offsets
  * `useWindowDimensions` calculations
  * dynamic progress width
  * image sizing
  * drag/reorder positions
  * platform-specific shadows/elevation
  * animated transforms
* Reuse existing project dependencies and shared components.
* Do not upgrade Expo, NativeWind, navigation, or dependencies unless necessary.
* Use the project’s existing icon library.
* Prefer `@expo/vector-icons` only if the project has no compatible icon system.
* Use `expo-image` if it is already installed; otherwise use the current project image component.
* Use `react-native-safe-area-context`.
* Use accessible `Pressable` controls with visible pressed states.
* Use existing navigation if available; otherwise use placeholder `console.log` actions.

## Existing project structure

Follow the project’s existing folder structure, feature boundaries, naming conventions, import aliases, navigation setup, component patterns, and theme system.

* Do not introduce a new folder structure when an existing convention is present.
* Place screens, form components, mock data, types, and theme additions alongside equivalent existing features.
* Reuse shared buttons, inputs, selects, chips, cards, navigation helpers, icon wrappers, and image utilities before creating new ones.
* Avoid broad refactors.
* Keep generated mock data separate from reusable presentation components when this matches the existing codebase.
* If the project has no established convention, use a minimal maintainable structure.

## Theme architecture: required

Use semantic theme tokens instead of raw hex values inside reusable components.

Create or extend the project’s existing NativeWind-compatible theme setup using the installed NativeWind version.

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
info
danger
navigationBackground
navigationInactive
shadow
```

Implement:

* A light theme closely matching the supplied references.
* A dark theme with equivalent visual hierarchy, readable forms, contrast, and field states.
* System-theme support by default.
* A structure that allows a future manual theme toggle.
* Theme-aware colors for text, fields, borders, labels, cards, tabs, selected states, badges, buttons, sliders, toggles, progress indicators, and shadows.
* No raw color values inside reusable components except where unavoidable for icon-library props.

Suggested light-theme direction:

```txt
Background: warm white with a subtle lavender/pink tint
Surface: white
Muted surface: very pale lavender
Primary text: deep navy/charcoal
Secondary text: slate-lavender gray
Accent: vivid violet-purple
Accent soft: pale purple
Success: muted green
Info: soft blue
Border: low-contrast cool gray/lilac
```

Use NativeWind semantic tokens, CSS variables, `dark:` classes, or the established project theme system.

## Screen purpose and layout

Build a multi-step Edit Profile screen for the authenticated user.

The screen includes:

```txt
SafeAreaView
  Fixed header
    Back button
    Edit Profile title
    Save action
  Completion progress indicator
  Step tab navigation
    Basics
    Personal
    Lifestyle
    Preferences
    Photos
  Scrollable active-tab content
  No floating bottom navigation on this screen
```

This should be a dedicated Edit Profile flow pushed from the logged-in profile screen.

Do not show the regular floating bottom navigation on this screen.

Use a fixed or sticky top area for:

* Back action
* `Edit Profile` title
* `Save` action
* Completion progress
* Five-tab step navigation

Only the active form content should scroll.

Respect safe-area insets and provide enough bottom padding for form controls and keyboard safety.

## Shared header

Implement the top header matching the reference.

Layout:

```txt
Back arrow                 Edit Profile                 Save
```

Requirements:

* Back icon on the left.
* Centered `Edit Profile` title.
* Purple `Save` text action on the right.
* Back button uses existing navigation back behavior if available; otherwise log `Go back`.
* Save button uses local mock-state validation and logs a fake save payload.
* Include `accessibilityLabel` values for icon-only actions.
* Show a visible pressed state.
* Do not make Save appear disabled unless validation genuinely fails.

## Profile completion indicator

Below the header, display a multi-segment profile completion progress indicator.

Reference value:

```txt
Profile completion: 85%
```

Requirements:

* Five short horizontal progress segments.
* Completed segments use the accent purple.
* Future/incomplete segments use pale lavender.
* Display `Profile completion:` in muted text and `85%` in accent purple.
* Compute the displayed percentage from mock state where practical.
* Keep the component reusable and theme aware.
* Provide an accessible label such as `Profile completion, 85 percent`.

## Tab navigation

Build five large rounded step tabs:

```txt
Basics
Personal
Lifestyle
Preferences
Photos
```

Requirements:

* Horizontally arranged beneath the completion indicator.
* Use icon plus label.
* Use a horizontally scrollable tab row only if needed on narrow devices.
* Current tab has a clear selected state:

  * Accent-purple icon and text.
  * White elevated surface or accent border.
  * Soft purple shadow or lower accent line.
* Inactive tabs use muted icon and text.
* Use `Pressable`.
* Add tab accessibility roles and selected-state semantics.
* Do not rely only on color to communicate selection.
* Preserve local form state when switching tabs.

Use these icon directions:

```txt
Basics: user/person
Personal: user-outline
Lifestyle: connected nodes or lifestyle symbol
Preferences: sliders/controls
Photos: camera
```

## Form behavior

Use controlled local mock state.

Requirements:

* Keep all values in one screen-level draft object or project-consistent form state pattern.
* Do not persist data.
* Save should validate required mock fields and log the draft payload.
* Fields should have labels, values, validation-ready structure, accessible hints, and error space.
* Use platform-appropriate input controls.
* For dropdown-like fields, use the project’s existing picker, bottom sheet, modal selector, or a simple mock selector pattern.
* Do not use browser-only form controls.
* Keep UI keyboard-safe.
* Do not allow text to clip under increased font scaling.

## Basics tab

Implement the Basics screen based primarily on `edit-profile-screen-design-basic-tab.png`.

The content is a large white rounded surface/card with subtle elevation over the soft lavender background.

### Basic Information section

Display the title:

```txt
Basic Information
```

Use a responsive two-column form layout on standard phone widths, falling back to one column when needed.

Fields:

```txt
Display name: Selam Tesfaye
Gender: Female
Date of birth: 14 Nov 1995
Height (cm): 165 cm
Residency type: Ethiopia
Address: Addis Ababa, Ethiopia
```

Requirements:

* Display name is an editable text field.
* Gender is a selectable field with a chevron.
* Date of birth has a calendar icon.
* Height has a ruler icon.
* Residency type has a globe icon and chevron.
* Address has a location icon and chevron.
* Show helper text below Address:

```txt
Your location helps us show you closer matches.
```

Field styling:

* White or slightly elevated theme-aware surface.
* Rounded corners.
* Soft border.
* Clear label above each field.
* Medium-to-large readable field value.
* Icon aligned with field content when appropriate.
* Avoid fixed field heights that clip large text.

### About You section

Display:

```txt
About You
```

Fields:

```txt
Bio
Ethnicity
Nationality
Religion
Education level
Occupation
Relationship intention
Marital status
Do you have children?
Do you want children?
```

Reference mock values:

```txt
Bio: Coffee lover ☕, travel enthusiast ✈️ and believer in meaningful conversations.
Ethnicity: Oromo
Nationality: Ethiopian
Religion: Orthodox Christian
Education level: Bachelor's Degree
Occupation: Software Engineer
Relationship intention: Long-term relationship
Marital status: Never married
Do you have children?: No
Do you want children?: Yes
```

Bio requirements:

* Multi-line editable input.
* Character count shown at the lower-right, such as `78/500`.
* Maximum length 500.
* Theme-aware focused state.
* Comfortable line height and padding.

Other fields:

* Use two-column responsive layout where space permits.
* Use selectable rows with chevrons where appropriate.
* Use relevant leading icons where shown in the design:

  * Occupation: briefcase
  * Relationship intention: heart

### Lifestyle section within Basics design

Below the About You section, show:

```txt
Lifestyle
```

Fields:

```txt
Smoking: No
Drinking: Socially
```

Requirements:

* Two-column layout where possible.
* Smoking uses cigarette-off icon.
* Drinking uses wine-glass icon.
* Both are editable select controls.

### Account Status card

At the bottom of the Basics tab, display a separate white rounded Account Status card.

Content:

```txt
Account Status

Onboarded
Onboarding completed
Completed

Verified identity
Your identity has been verified
Verified

These information are read only and cannot be changed.
```

Requirements:

* Onboarded row uses purple shield/check icon and green `Completed` status badge.
* Verified identity row uses blue verified/check badge and blue `Verified` status badge.
* These rows are read-only.
* Include separators between rows.
* Add a lock icon and muted explanatory text at the bottom.
* Use semantic `success` and `info` theme tokens.
* Add accessibility labels describing each status.

## Personal tab

Create a Personal tab that fits the same visual system and uses generated mock current-user data.

Use the fields and concepts from the existing schema and project context. Do not invent backend behavior.

Suggested examples:

```txt
Ethnicity
Nationality
Religion
Education level
Occupation
Marital status
Children preferences
```

Requirements:

* Reuse the same form card, field, label, select, and section patterns as Basics.
* Avoid duplicating fields already represented in Basics unless the existing app architecture requires that grouping.
* Keep mock local state consistent when changing values.
* Preserve the selected tab and draft state when navigating away and back.

## Lifestyle tab

Create a Lifestyle tab using theme-consistent editable controls and mock local state.

Suggested fields:

```txt
Smoking
Drinking
Exercise or activity level
Interests
Languages
```

Requirements:

* Use schema/context fields where they exist.
* Prefer chips or selectable controls for multi-select values.
* Keep the layout visually consistent with the other tabs.
* Use reusable form components.
* Ensure selected chips have accessible selected states and dark-theme support.

## Preferences tab

Implement the Preferences screen based primarily on `edit-profile-screen-design-preferences-tab.png`.

Create a large white rounded content card titled:

```txt
Discovery Preferences
```

Subtitle:

```txt
Control who you see and how discovery works.
```

### Discovery mode

Display:

```txt
Discovery mode
```

Add an information icon with an accessible explanatory hint.

Use a segmented control with:

```txt
Standard
Global
Incognito
```

Requirements:

* Standard selected by default.
* Standard has accent-purple icon/text and selected pill state.
* Global and Incognito are inactive by default.
* Use icons:

  * Standard: globe
  * Global: globe/earth
  * Incognito: disguise/incognito
* Show context helper text below, such as:

```txt
Standard mode shows you people near you.
```

* Change helper text based on selected mode.
* Use local state only.

### Interested in

Display a segmented selector:

```txt
Male
Female
All
```

Requirements:

* All selected by default.
* Use accessible selection state.
* Keep local state.
* Use gender/person icons.

### Preferred residency types

Display selectable option chips/cards:

```txt
Ethiopia
Eritrea
Diaspora
```

Requirements:

* Ethiopia and Diaspora selected by default.
* Eritrea unselected by default.
* Include appropriate flag/globe illustrations or icons if the existing icon system supports them.
* Use check marks for selected options.
* Support multi-select.
* Show helper text:

```txt
Select all that apply
```

### Age range

Display:

```txt
Age range
```

Use a two-handle range slider where the installed project tooling supports it.

Reference mock values:

```txt
Min age: 24
Max age: 34
```

Requirements:

* Show minimum and maximum values in outlined number boxes.
* Use purple slider track/thumbs.
* Show `Min age` and `Max age` labels.
* If no appropriate range-slider dependency exists, implement a clear mock fallback using two controlled numeric controls or two sliders.
* Do not add a heavy dependency only for the visual test.

### Maximum distance

Display:

```txt
Maximum distance
50 km
```

Requirements:

* Use a single slider.
* Use local state.
* Reference scale labels:

```txt
5 km
25 km
50 km
100 km
250+ km
```

* Keep the active track and thumb accent-purple.
* Support screen readers with a clear accessible value.

### Preference toggles

Create three elevated list-row toggles:

```txt
Open to long-distance
Open to relocation
Show verified profiles only
```

Requirements:

* Each row includes a purple/icon surface on the left.
* Use a native-like switch or existing project switch component.
* Initial mock states:

  * Open to long-distance: enabled
  * Open to relocation: disabled
  * Show verified profiles only: enabled
* The Verified row includes helper text:

```txt
Only show people with a blue check.
```

* Use theme-aware switch colors.
* Add accessibility labels and current state.

### Preference actions

At the bottom, show:

```txt
Save Preferences
Reset
```

Requirements:

* `Save Preferences`: full-width primary purple action button.
* `Reset`: full-width secondary outlined accent button.
* Save updates only local mock state and logs the current preference draft.
* Reset restores the tab’s initial mock defaults.
* Use pressed states and accessible labels.

## Photos tab

Implement the Photos screen based primarily on `edit-profile-screen-design-photos-tab.png`.

Create a large white rounded card titled:

```txt
Manage Photos
```

Subtitle:

```txt
Reorder your photos by dragging and choose a primary photo.
```

Show a compact informational element:

```txt
Drag to reorder
```

Use local mock image data only.

### Photo gallery layout

Build a responsive photo-management grid matching the visual hierarchy.

Requirements:

* Large portrait primary-photo card on the left.
* Smaller gallery cells arranged on the right.
* Use 5–6 generated mock profile image URLs.
* The primary photo is visually larger than all other images.
* Show a purple `Primary` label/badge on the main image.
* Add an edit/pencil button on the primary image.
* Add an overflow three-dot action button on secondary images.
* Include two dashed `Add photo` cards with centered purple plus icon.
* Avoid image stretching; use `resizeMode="cover"`.
* Use rounded image corners.
* Use stable IDs for all mock image entries.

For visual testing:

* Implement press handlers for:

  * Set primary photo
  * Edit photo
  * Remove photo
  * Add photo
  * Reorder hint
* Use placeholder actions or local array state only.
* Do not add real upload, image picker, media-library permission, drag-and-drop dependency, or deletion API.
* If a drag-and-drop library already exists, use it. Otherwise implement static visual ordering with a clear placeholder `Drag to reorder` interaction.

Below the primary image, show helper text:

```txt
This is your primary photo. It will be shown first on your profile.
```

### Photo tips card

Add a muted lavender informational card at the bottom of the photo gallery section.

Content:

```txt
Photo tips
Use clear, well-lit photos that show your face. Avoid group photos as your primary photo.
```

Requirements:

* Purple lightbulb icon.
* Soft theme-aware muted surface.
* Rounded corners.
* Readable text in both light and dark themes.

### Account Status card

Include the same read-only Account Status card below the Photos section.

Use the same components and state semantics as the Basics tab rather than duplicating implementation.

## Shared component requirements

Create reusable components only when aligned with the existing project structure. Likely reusable patterns include:

```txt
EditProfileHeader
ProfileCompletionIndicator
EditProfileTabBar
FormSectionCard
LabeledTextField
SelectField
DateField
TextAreaField
StatusBadge
AccountStatusCard
PreferenceSegment
SelectableResidencyOption
RangeControl
PreferenceToggleRow
PhotoGrid
PhotoTile
PrimaryPhotoTile
PhotoTipsCard
```

Reuse components between tabs rather than duplicating visual logic.

## NativeWind expectations

* Use NativeWind `className` for static styling.
* Use semantic theme-aware classes, CSS variables, `dark:` variants, or the existing project theme system.
* Avoid large `StyleSheet.create` blocks.
* Do not repeat long utility strings across fields or cards.
* Extract reusable style variants, components, or shared class constants where helpful.
* Use runtime styles only for values NativeWind cannot express cleanly.
* Do not use unsupported web-only Tailwind utilities.

## Responsiveness, performance, and accessibility

* Respect safe-area insets.
* Support iOS and Android.
* Use `useWindowDimensions` instead of fixed device-specific widths.
* Use a single vertical scroll container for active tab content.
* Do not nest multiple vertical scroll views.
* Keep form rendering performant.
* Use stable keys for photo lists and selectable controls.
* Memoize expensive list items and callbacks where useful.
* Make all icon-only buttons accessible.
* Ensure labels and selected states are understandable without color alone.
* Support larger font scaling without clipped fields, tabs, action buttons, or status cards.
* Use adequate color contrast in light and dark themes.
* Support reduced-motion preferences for animations.
* Maintain local draft state when switching tabs.
* Warn before discarding unsaved mock changes only if the app already has an established navigation-confirmation pattern.

## Deliverables

Implement the full Edit Profile flow with the Basics, Personal, Lifestyle, Preferences, and Photos tabs.

At the end, provide:

1. A concise list of created or modified files.
2. A short explanation of the semantic theme-token implementation.
3. Any dependency assumptions.
4. Notes on generated mock data and placeholder interactions.
5. Confirmation that no backend, database, upload, media-library, or API integration was added.
