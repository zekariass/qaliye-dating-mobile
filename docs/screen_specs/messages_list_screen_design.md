Implement the Messages List screen based on the design reference at:

`docs/screen_designs/messages-list-screen-design.png`

Use the product requirements, navigation structure, existing components, and design guidance from:

`docs/project-context.md`

Do not write backend integration yet. Use realistic mock data for UI development and testing. Structure the screen and data layer so mock data can later be replaced by real backend/API data with minimal UI changes.

## Screen purpose

Create a premium Messages inbox screen for a dating/social app. The design should feel warm, polished, modern, and friendly, with a clean white or softly tinted background, dark navy typography, soft lavender surfaces, vivid purple accents, rounded controls, and generous spacing.

Apply the existing app Theme throughout the implementation. Do not create a separate visual system or hard-code arbitrary colors, typography, spacing, shadows, or radii. Use the app’s existing theme tokens, shared components, icon system, navigation system, light/dark mode handling, and accessibility conventions.

## Layout structure

The screen should include:

1. Safe-area aware header
2. Messages title and subtitle
3. All / Unread segmented filter
4. Scrollable conversation list
5. Persistent bottom navigation with Messages as the active tab

The screen must work across common iOS and Android dimensions without relying on device-specific fixed measurements.

## Header

Place the header below the top safe area with generous horizontal padding.

Display:

* Large title: `Messages`
* Add a small pink heart emoji directly after or slightly above the title.
* Subtitle below: `Your conversations`
* Add a pink double-heart emoji after the subtitle.

Use a strong, elegant display heading style consistent with the app Theme. The title should use a deep navy or nearly black color. The subtitle should be smaller, readable, and dark navy.

The header should feel spacious, premium, and visually calm.

## Filter segmented control

Below the header, add a full-width segmented control with:

* `All`
* `Unread`

The segmented control should have:

* Large rounded pill corners
* Soft white or faint lavender base surface
* Thin pale-lavender border
* Equal-width options
* Smooth active-state styling

Selected tab behavior:

* `All` is selected by default.
* The selected segment uses a soft lavender fill.
* Selected label uses vivid purple text.
* Unselected label uses muted lavender-gray text.
* The control should be keyboard/accessibility friendly and expose the selected state.

When `Unread` is selected, only show conversations with unread message counts greater than zero.

## Conversation list

Use a performant virtualized list component for the message list.

Each conversation row should be fully tappable and contain:

### Avatar area

* Circular avatar image on the left.
* A small presence indicator overlapping the lower-right edge of the avatar.
* Bright green presence indicator for online/active users.
* Muted gray-lavender presence indicator for offline users.
* Include one group conversation that uses a rounded-square purple group icon instead of a person avatar.

### Conversation content

To the right of the avatar, show:

* Conversation name in bold dark navy text.
* Optional purple verified badge immediately after the name.
* Latest message preview below the name.
* Support emojis inside message previews.
* Preview text should be one or two lines depending on available space, then truncate cleanly.
* Do not allow layout overflow for long names or messages.

### Metadata area

Align metadata to the right side of the row:

* Show relative timestamps such as `2m ago`, `1h ago`, and `3h ago` for recent messages.
* Show dates such as `Yesterday`, `May 20`, `May 19`, and `May 18` for older conversations.
* Use purple for recent timestamps.
* Use muted lavender-gray for older timestamps.
* Show a circular purple unread-count badge for conversations with unread messages.
* Place the unread badge beneath or near the timestamp.
* For muted conversations, show a muted-notification icon instead of an unread badge where appropriate.

### Dividers and spacing

* Use subtle thin divider lines between conversation rows.
* Start dividers after the avatar area so they do not run underneath avatars.
* Keep ample row height and vertical breathing room.
* Use consistent content insets aligned with the header and segmented control.

## Mock conversation data

Create mock data that visually reflects the reference design and tests all states.

Include conversations similar to the following:

* A verified active user with a recent timestamp, message preview containing coffee and heart emojis, and unread count `2`.
* An active user with a timestamp around one hour ago and unread count `1`.
* An active user with an older timestamp and no unread badge.
* An active user with a `Yesterday` timestamp and no unread badge.
* An offline user with a `Yesterday` timestamp and unread count `1`.
* Two offline users with older dates and no unread badge.
* A group conversation with a purple group icon, an older date, and muted notifications enabled.

Use names, previews, timestamps, unread counts, verification state, presence state, muted state, and avatar/group metadata as fields in the mock data model.

Keep mock data separate from UI rendering logic so it can later be replaced with API-backed conversation data.

## Bottom navigation

Use the existing app bottom-navigation system from `docs/project-context.md`.

The navigation should contain:

* Home
* Matches
* Messages
* Likes
* Profile

Messages must be visually active.

Match the design reference:

* Bottom bar uses a large rounded black or near-black capsule container.
* Inactive tabs use muted gray-lavender icons and labels.
* Messages is emphasized with a large elevated circular purple center control.
* The active Messages control should have a white outer ring or raised border.
* Use a speech-bubble/messages icon inside the active circular control.
* Keep inactive labels visible beneath or near their icons.
* Respect bottom safe-area spacing and avoid overlap with the home indicator.

Use existing shared navigation components where available. Do not duplicate navigation logic or introduce a separate bottom-tab architecture unless required by the existing project structure.

## Theme requirements

Use the app Theme for:

* Background colors
* Text colors
* Purple accent colors
* Muted text colors
* Borders
* Spacing
* Border radii
* Typography
* Shadows/elevation
* Icon sizing
* Light/dark theme support

The reference is primarily a light-theme design. Ensure the dark theme remains coherent, legible, and brand-consistent rather than simply inverting colors.

## Interaction requirements

* Tapping a conversation should navigate to its conversation/chat detail screen using the project’s existing navigation patterns.
* Tapping `All` and `Unread` should update the visible list.
* Bottom navigation items should navigate using the existing application routing structure.
* Preserve list state and filter state appropriately when navigating away and returning, where supported by the existing app architecture.
* Use subtle native-feeling press feedback.

## Accessibility requirements

Follow React Native and Expo accessibility best practices:

* Ensure each conversation row has an accessible label describing the person/group, latest message, timestamp, and unread count where present.
* Mark presence indicators appropriately or hide them from accessibility if they do not add useful context.
* Ensure the segmented control exposes selected state.
* Ensure bottom navigation labels and active state are accessible.
* Maintain readable contrast in both light and dark themes.
* Ensure tap targets meet recommended mobile accessibility sizing.

## Engineering and UI best practices

* Use a virtualized list such as FlatList for the conversation feed.
* Use stable IDs and stable list keys.
* Separate screen composition, list item rendering, mock data, view models/types, and reusable components.
* Memoize list rows where it provides meaningful benefit.
* Avoid unnecessary re-renders.
* Avoid raw magic numbers where theme tokens or layout constants can be used.
* Handle long names, large unread counts, missing avatars, and empty message previews gracefully.
* Include a loading state, empty-state design, and error-state design compatible with the Theme, even though the initial implementation should display populated mock data.
* Keep the design responsive and safe-area aware.
* Prepare the screen for future backend integration without changing the UI contract.
