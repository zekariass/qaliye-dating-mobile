Implement the one-to-one Chat screen based on the design reference at:

`docs/screen_designs/chat-screen-design.png`

Use `docs/project-context.md` as the source of truth for the app’s product requirements, navigation architecture, existing UI components, data conventions, and interaction patterns.

Apply the existing app Theme throughout the screen. Reuse theme tokens and shared components for typography, colors, spacing, radii, borders, icons, shadows, safe-area behavior, dark mode, and accessibility. Do not create a separate visual system or hard-code arbitrary styling values.

Use realistic mock data for UI development and testing. Structure the screen and message data model so it can later be replaced with real backend/API data without major UI changes.

## Screen purpose

Create a premium one-to-one messaging experience for a dating/social app. The screen should feel warm, conversational, elegant, and native to mobile platforms.

The visual language should match the provided reference:

* Clean white or softly tinted background.
* Deep navy text.
* Soft lavender-gray incoming message bubbles.
* Bright violet/purple outgoing message bubbles.
* Rounded, friendly surfaces.
* Subtle lavender borders and dividers.
* Generous whitespace.
* iOS-like safe-area spacing and layout behavior.

## Screen structure

The screen should contain:

1. Safe-area aware conversation header.
2. Scrollable chat message timeline.
3. Date separator.
4. Incoming and outgoing message bubbles.
5. Message timestamps and delivery status.
6. Persistent message composer anchored above the bottom safe area.

The chat content should scroll independently while the header remains fixed at the top and the composer remains fixed at the bottom.

## Conversation header

Create a fixed header below the top safe area.

Include:

* A purple back chevron on the far left.
* Tapping the chevron should return to the Messages list using the existing navigation flow.
* A circular profile avatar.
* Contact name: `Hiwot Alemu`
* A small blue verified badge immediately after the contact name.
* Presence row below the name:

  * Bright green status dot.
  * Text: `Online now`
  * Use a muted lavender-gray or slate text color.

The header should have a white or softly tinted background and a subtle bottom divider in pale lavender-gray. Keep the contact information vertically centered and easy to scan.

Use the app’s existing icon system and shared avatar components where available.

## Date separator

At the top of the message timeline, show a centered rounded pill date separator with:

`Today`

The date separator should use a very soft lavender-gray background and muted purple-gray text. It should feel visually light and should not compete with the chat content.

## Message timeline

Use a performant virtualized, inverted list strategy suitable for production chat interfaces. Maintain correct reading order and avoid unnecessary list re-renders.

Use realistic mock messages that visually reflect the reference design.

Include a conversation similar to this:

Incoming:

* `Hey Liam 👋`
* `Hope you’re having a great day!`
* Timestamp: `10:12 AM`

Outgoing:

* `Hey Hiwot! 😊`
* `It’s going great, thanks! How about you?`
* Timestamp: `10:14 AM`
* Show a purple delivered/read checkmark icon.

Incoming:

* `Pretty good! Just got back from a`
* `morning run 🏃‍♀️. Feeling energized!`
* Timestamp: `10:16 AM`

Incoming:

* `That coffee place you recommended`
* `looks amazing. ☕✨`
* Timestamp: `10:17 AM`

Outgoing:

* `I knew you’d love it! The lattes there`
* `are next level.`
* Timestamp: `10:18 AM`
* Show a purple delivered/read checkmark icon.

Incoming:

* `We should go this weekend ☕`
* `What do you think?`
* Timestamp: `10:19 AM`

Outgoing:

* `Absolutely! Saturday works for me.`
* `What time were you thinking?`
* Timestamp: `10:20 AM`
* Show a purple delivered/read checkmark icon.

Incoming:

* `How about 4 PM? Gives us plenty of`
* `time to relax and catch up 😊`
* Timestamp: `10:21 AM`

Outgoing:

* `Perfect, 4 PM it is! Can’t wait ☕💜`
* Timestamp: `10:22 AM`
* Show delivered status with a checkmark and the text `Delivered`.

The messages should be mock UI data only. Keep the mock data separate from rendering logic and model it with fields such as:

* `id`
* `conversationId`
* `senderId`
* `type` or `direction`
* `body`
* `createdAt`
* `deliveryStatus`
* `isRead`
* `avatarUrl`
* `showAvatar`
* `showTimestamp`
* `groupingMetadata`

Prepare this model for future backend integration.

## Incoming messages

Incoming messages should:

* Align left.
* Show the sender’s circular avatar to the left of the bubble.
* Use a soft white, pale lavender, or very light gray-lavender message bubble.
* Use dark navy text.
* Have large rounded corners with a slightly distinctive bubble tail or lower corner treatment when appropriate.
* Keep avatar and message bubble aligned cleanly.
* Display timestamps below the bubble in muted lavender-gray text.
* Support emoji rendering naturally.
* Gracefully support multiline messages, long text, and future media message variants.

Group consecutive incoming messages from the same sender visually where appropriate. Avoid repeating the avatar unnecessarily in grouped-message scenarios, while still matching the visual reference for the provided mock thread.

## Outgoing messages

Outgoing messages should:

* Align right.
* Use a vivid purple or violet gradient/surface based on available app Theme conventions.
* Use white text with strong contrast.
* Have large rounded corners and a subtle bubble tail on the lower-right side.
* Use a maximum width that leaves clear visual space on the opposite side.
* Display timestamp and delivery status beneath the bubble, aligned to the right.
* Use a small purple checkmark for sent/delivered/read states, consistent with the app Theme.
* For the last message in the mock thread, show `Delivered` next to the status icon.

Ensure the outgoing bubble remains legible in both light and dark theme modes. Do not apply an arbitrary gradient unless gradients are part of the established app Theme; otherwise use the app’s primary purple surface token.

## Message spacing and rhythm

The chat should have a generous and polished vertical rhythm:

* Add clear separation between message groups.
* Keep related messages closer together.
* Preserve enough horizontal space to make left and right message direction obvious.
* Keep timestamp styling subtle and secondary.
* Avoid cramped bubble edges.
* Ensure no content is obscured by the composer or bottom safe area.
* When opening the screen, initially position the timeline at the latest message.

## Message composer

Anchor the composer to the bottom of the screen above the device safe area.

The composer should resemble the reference:

* A broad rounded white input container with soft border and subtle elevation.
* A circular outlined purple plus button on the left for attachments/actions.
* A text field with placeholder: `Type a message...`
* A circular purple outlined smile/emoji button inside the right side of the input area.
* A prominent circular purple send button on the far right.
* Use a paper-plane/send icon in white inside the purple send button.
* The send button should have a raised, polished appearance and should match the app Theme.

Composer interaction expectations:

* Focus the input correctly.
* Shift above the keyboard without covering messages.
* Support multiline text entry with a controlled maximum height.
* Disable or visually reduce the send button when there is no message text, according to project conventions.
* Tapping the send button with text should append a mock outgoing message to the local UI state.
* Clear the input after sending.
* Preserve keyboard, safe-area, and scrolling behavior correctly.
* Attachment and emoji buttons may use mock/no-op handlers initially, but they must be interactive and accessible.

## Navigation and behavior

* Back navigation should return to the Messages list.
* The header profile area may navigate to the contact’s profile if that behavior exists in `docs/project-context.md`.
* Opening the chat should load mock conversation and message data.
* Sending a message should update local mock state immediately.
* Ensure the view scrolls to the latest message after sending.
* Preserve message list performance as the number of messages grows.

## Theme requirements

Apply the app Theme consistently for:

* Screen background.
* Header surface and divider.
* Primary and muted text.
* Incoming message bubble.
* Outgoing purple message bubble.
* Avatar borders.
* Presence indicator.
* Verified badge.
* Date separator.
* Composer border, background, icons, and elevation.
* Bottom safe-area background.
* Light and dark appearance variants.

The reference is a light-theme screen. Dark mode should retain the same hierarchy, strong text contrast, readable chat bubbles, and recognizable purple brand identity.

## Accessibility requirements

Follow React Native and Expo accessibility best practices:

* Make the back button accessible with a clear label.
* Provide accessible labels for profile header, verified status, online status, attachment action, emoji action, message input, and send action.
* Ensure screen-reader users can identify whether a message is incoming or outgoing, its timestamp, and its delivery status.
* Keep emojis understandable in accessibility labels where practical.
* Maintain accessible tap targets and color contrast.
* Respect text scaling and avoid clipping when system font size is increased.

## Engineering and UI best practices

* Use a virtualized list suitable for chat messaging, with stable IDs and keys.
* Use memoized message rows where appropriate.
* Keep message rendering, composer state, mock data, and navigation logic modular.
* Avoid layout shifts while messages load or keyboard opens.
* Avoid raw magic numbers when a theme token or layout constant can be used.
* Handle long messages, empty messages, multiline messages, failed sending, pending messages, and missing avatar states gracefully.
* Add themed loading, empty, and error states for future backend integration, even though the initial screen should use populated mock data.
* Ensure the UI is responsive across common Android and iOS screen sizes.
* Keep all implementation aligned with the architecture and conventions defined in `docs/project-context.md`.
