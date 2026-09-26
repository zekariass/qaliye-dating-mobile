# Joined Blind Dates Screen

## 1. Purpose

Create a clean, modern screen showing all Blind Date sessions that the current user has joined as a participant.

This screen is **not a discovery/swiping screen**. The user has already joined these Blind Dates, so the primary purpose is to communicate:

* What stage each Blind Date is currently in
* Whether the user needs to take action
* Their current round
* Their progress through the Blind Date
* Basic anonymous information about the other person
* How much time remains
* What action the user can take next

The screen should feel like a **progress dashboard**, not another dating profile carousel.

---

# 2. Overall layout

The screen is vertically scrollable.

Structure:

```text
┌──────────────────────────────────────┐
│ Status Bar                           │
│                                      │
│ [Blind Date logo]  Blind Date    [?] │
│                  Real people...      │
│                                      │
│ Joined Blind Dates       [Active ▾]  │
│ Blind Dates you've joined            │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Joined Blind Date Card #1        │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Joined Blind Date Card #2        │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Joined Blind Date Card #3        │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Bottom navigation                    │
└──────────────────────────────────────┘
```

There must be **no credit balance** in the header.

There must be **no Open Sessions / Hosting / Joined tab bar** underneath the header.

The user is already inside the Joined section, so the page should be focused entirely on joined Blind Dates.

---

# 3. Header

At the top of the screen, use the existing Blind Date branding.

### Left

Display the Blind Date icon.

Next to it:

**Blind Date**

Under the title:

**Real people. Deeper conversations.**

Use the same typography and branding as the Blind Date discovery screen.

### Right

Show only a circular help/info button.

Do **not** show:

* Credit balance
* Subscription balance
* Three-tab navigation
* Extra actions

The header should be visually light and compact.

---

# 4. Page title

Below the header:

### Main title

**Joined Blind Dates**

### Subtitle

**Blind Dates you've joined**

The title should be prominent but not oversized.

---

# 5. Sorting control

On the right side of the title area, add a compact dropdown:

**Active first ▾**

This controls ordering.

Possible options:

* Active first
* Recently joined
* Closing soon
* Recently updated

Default:

**Active first**

The sorting control should be subtle and secondary to the actual Blind Date cards.

---

# 6. Joined Blind Date cards

Use a vertical list of large rounded cards.

Do **not** use swipe gestures on these cards.

The discovery screen uses swiping; the Joined screen uses scrolling because the user is managing ongoing Blind Dates.

Each card should contain:

1. Blurred profile image
2. Current status
3. Current task/state
4. Basic profile information
5. Round progress
6. Expiry/session information
7. One primary action

---

# 7. Profile image

Place a portrait-oriented blurred profile image on the left side of each card.

The image should be:

* approximately 150–180px wide on a typical mobile screen
* rounded corners
* strongly blurred
* visually recognizable as a person
* never clear enough to identify the person

Overlay a small dark pill near the bottom of the image:

**🔒 Identity hidden**

Use the application's icon set rather than an emoji.

The purpose is to reinforce that the Blind Date remains anonymous.

Do not reveal:

* name
* username
* exact location
* social accounts
* distance
* address

The Blind Date API explicitly keeps participant identity hidden until the appropriate reveal stage.

---

# 8. Card status

At the top-right of each card, display a status badge.

Examples:

### Active

Green badge:

**● ACTIVE**

### Waiting

Blue badge:

**● AWAITING**

### Eliminated

Grey badge:

**● ELIMINATED**

### Finalist

Use a visually stronger positive status:

**★ FINALIST**

### Revealed

**● REVEALED**

### Completed

**● COMPLETED**

The status must be derived from the user's participant/session state rather than hard-coded.

The API defines participant statuses including `ACTIVE`, `ADVANCED`, `ELIMINATED`, `FINALIST`, `REVEALED`, and `WITHDRAWN`.

---

# 9. Current-state heading

This is the most important text on the card.

The heading should tell the user **what is happening right now**.

Examples:

### User needs to answer

**Round 2 · Answer Questions**

Subtitle:

**3 questions waiting for your answers.**

### User has completed the round

**Waiting for Host**

Subtitle:

**You've answered all questions. The host is reviewing responses.**

### User was eliminated

**You didn't advance**

Subtitle:

**The host has selected other participants for the next round.**

### User became finalist

**You've been selected!**

Subtitle:

**You're the finalist for this Blind Date.**

### Reveal stage

**It's time to meet**

Subtitle:

**Your Blind Date is ready to be revealed.**

### Completed

**Blind Date completed**

Subtitle:

**This Blind Date has ended.**

Do not use generic text such as simply "Active Session." Always tell the user what their current state means.

---

# 10. Profile metadata

Under the state heading, display compact pills.

Show:

### Age

Example:

**27**

### Country

Example:

**Ethiopia**

Only display the country.

Never display:

* city
* town
* postcode
* street
* exact address
* distance

### Relationship intention

Example:

**♡ Serious Relationship**

### Religion

Example:

**Christian**

### Language

Example:

**English**

Use small consistent icons.

The exact values must come from the available profile/session data.

Do not use hard-coded values.

If a field is unavailable, omit that pill rather than displaying fake or placeholder information.

---

# 11. Round progress indicator

Every active Blind Date should display a horizontal progress indicator.

Example:

```text
   ✓              ●              ○              ○
Round 1        Round 2        Round 3          Final
Completed      Current
```

For a 5-round configuration:

```text
✓ ─── ✓ ─── ● ─── ○ ─── ○
R1     R2     R3     R4    Final
```

### States

Completed round:

* filled accent circle
* checkmark
* accent-colored connecting line

Current round:

* larger highlighted circle
* accent border/ring
* label `Current`

Future round:

* muted grey circle
* muted connecting line

The maximum number of rounds should come from the Blind Date configuration rather than being hard-coded. The API exposes `max_rounds` in configuration.

If the configuration allows a variable number of rounds, dynamically render the appropriate number.

---

# 12. Current round information

The round progress indicator should make the user's current position obvious.

For example:

**Round 2**
**Current**

If the user has completed the current round:

**Round 2**
**Completed**

If waiting for the host:

**Waiting for Host**

Do not imply that the user can manually move between rounds.

Round progression is controlled by the Blind Date host/system.

---

# 13. Expiry information

Near the bottom of each active card, display the remaining time.

Example:

**▣ 4 days left**

Under it:

**Closes 25 Sep 2026**

Calculate this dynamically from the session's `expires_at`.

Do not hard-code the number of days.

The API provides `expires_at` for sessions and defines session expiration as part of the lifecycle.

For an already closed session:

**Session ended**

Under it:

**Closed 20 Sep 2026**

---

# 14. Primary action

Each card should have **one obvious primary action**.

### Questions available

Large maroon button:

**Answer Questions →**

This should navigate to the current round's question-answering screen.

The participant flow is:

`join → get round questions → submit answers`.

### Waiting for host

Use a lighter secondary button:

**View Details →**

Do not show an action that implies the user needs to do something.

### Eliminated

Use:

**View Details →**

### Finalist

Use:

**Continue →**

### Reveal

Use:

**Reveal Blind Date →**

### Completed

Use:

**View Details →**

---

# 15. First card should receive priority

Sort the cards so that sessions requiring user action appear first.

Recommended ordering:

1. Questions waiting for the user
2. Finalist / reveal actions
3. Recently advanced sessions
4. Waiting for host
5. Completed/eliminated sessions

This means the first card should normally be the thing the user needs to deal with.

The screen should feel like:

> "Here is what needs your attention."

rather than:

> "Here is a list of everything you've ever joined."

---

# 16. Example card — active

Use realistic development data such as:

```text
┌─────────────────────────────────────────┐
│                                         │
│ [ BLURRED PHOTO ]        ● ACTIVE       │
│                                         │
│ 🔒 Identity hidden                      │
│                                         │
│                         Round 2 ·        │
│                         Answer Questions │
│                         3 questions      │
│                         waiting for you  │
│                                         │
│                         27  Ethiopia    │
│                         ♡ Serious        │
│                           Relationship   │
│                         Christian        │
│                         English          │
│                                         │
│    ✓────────●────────○────────○          │
│   Round 1   Round 2   Round 3   Final   │
│   Complete  Current                    │
│                                         │
│   ▣ 4 days left                         │
│   Closes 25 Sep 2026      [ Answer → ] │
└─────────────────────────────────────────┘
```

Do not copy this literally as a text layout; use it as the information hierarchy.

---

# 17. Example waiting card

```text
┌─────────────────────────────────────────┐
│                                         │
│ [ BLURRED PHOTO ]       ● AWAITING      │
│                                         │
│                         Waiting for Host │
│                         You've answered │
│                         all questions.   │
│                                         │
│                         32  Eritrea     │
│                         ♡ Marriage      │
│                         Muslim          │
│                         English         │
│                                         │
│    ✓────────✓────────○────────○          │
│   Round 1   Round 2   Round 3   Final   │
│   Complete  Complete                    │
│                                         │
│   ▣ 6 days left       [ View Details ] │
└─────────────────────────────────────────┘
```

This card should visually communicate:

**Nothing is required from me right now.**

---

# 18. Example eliminated card

For an eliminated participant:

```text
┌─────────────────────────────────────────┐
│                                         │
│ [ BLURRED PHOTO ]      ● ELIMINATED     │
│                                         │
│                         You didn't      │
│                         advance         │
│                                         │
│                         Thank you for    │
│                         participating.  │
│                                         │
│                         29  Ethiopia    │
│                         ♡ Long Term     │
│                           Dating        │
│                         Christian       │
│                         Amharic         │
│                                         │
│   Session ended                         │
│   Closed 20 Sep 2026    [ View Details]│
└─────────────────────────────────────────┘
```

The eliminated card should be visually quieter than an active card.

Reduce visual emphasis rather than making it look like an error.

---

# 19. Card styling

Use:

* white/light surface
* approximately 20–24px corner radius
* very subtle shadow
* thin neutral border
* generous internal spacing
* maroon primary accent
* dark navy primary text
* muted grey secondary text

Do not make the cards excessively colourful.

Status colours should communicate state:

* green = active
* blue = waiting
* grey = ended/eliminated
* accent/maroon = current action
* special accent = finalist/reveal

---

# 20. Mobile layout

The screen is primarily designed for mobile.

Use approximately:

* 16px horizontal page padding
* 16–20px gap between cards
* 16–20px card internal padding
* large touch targets
* minimum 44px action-button height

On narrow phones, the profile image can become slightly smaller.

The content should never require horizontal scrolling.

---

# 21. Bottom navigation

Keep the existing application's bottom navigation.

Example:

**Home | Discover | Blind Date | Messages | Profile**

Highlight:

**Blind Date**

Do not change the global navigation as part of this screen.

---

# 22. Loading state

When loading joined Blind Dates, show skeleton cards.

Skeleton should represent:

* blurred image
* title
* status
* metadata pills
* round progress
* expiry
* action button

Do not show a blank page while loading.

---

# 23. Empty state

If the user has not joined any Blind Dates:

Center the content vertically.

### Title

**No joined Blind Dates yet**

### Description

**Join a Blind Date and get to know someone through meaningful questions before identities are revealed.**

Primary button:

**Explore Blind Dates →**

Tapping it navigates to the Blind Dates discovery screen.

---

# 24. API integration

The Joined screen should use the participant/session APIs rather than reconstructing state locally.

The API provides:

`GET /participations`

for sessions where the current user joined as a participant. The response includes:

* `session_id`
* `status`
* `current_round_number`
* `current_round_id`
* session status
* language
* expiry
* participant count
* creation time.

Use those fields to construct the card state.

For example:

```text
participant.status
session.status
current_round_number
current_round_id
session.expires_at
session.participant_count
session.language_code
```

Do not infer participant status from the session status.

The user can be `ACTIVE`, `ADVANCED`, `ELIMINATED`, `FINALIST`, etc. while the overall session has a separate lifecycle.

---

# 25. Important state handling

The UI must distinguish between:

### Session state

Examples:

* OPEN
* CLOSED
* REVEAL
* COMPLETED
* EXPIRED

and:

### Participant state

Examples:

* ACTIVE
* ADVANCED
* ELIMINATED
* FINALIST
* REVEALED
* WITHDRAWN

These are different concepts and should not be merged into one frontend status.

---

# 26. Questions

Do **not** display the questions themselves inside the Joined list card.

The card should only say something like:

**3 questions waiting for your answers.**

When the user taps:

**Answer Questions →**

open the dedicated round question screen.

The API provides:

`GET /rounds/{roundId}/questions`

for retrieving the questions for the current round.

---

# 27. Identity handling

Before reveal:

* Keep photo blurred.
* Display `Identity hidden`.
* Never expose name.
* Never expose username.
* Never expose city.
* Never expose exact address.
* Never expose distance.

Country is acceptable and should be displayed.

Age is acceptable and should be displayed.

Relationship intention, religion and language should also remain visible.

After the Blind Date reaches the appropriate reveal state, the UI can transition to the reveal experience rather than continuing to display the anonymous version.

---

# 28. Important design principle

The discovery screen answers:

> **"Which Blind Date do I want to join?"**

The Joined screen answers:

> **"What is happening with the Blind Dates I've already joined, and what do I need to do next?"**

Therefore, prioritize **status + action + progress** over profile presentation.

The first card should immediately tell the user:

**What round am I in?**

**Do I need to answer anything?**

**Did I advance?**

**How much time remains?**

**What should I tap next?**

That should be the core UX of this screen.
