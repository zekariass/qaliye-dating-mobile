# Blind Date Home Screen

## 1. Screen purpose

The Blind Date home screen is the entry point to the Blind Date feature.

It should communicate that Blind Date is different from normal swipe-based dating: users participate in a **creator-led, question-based, multi-round experience**, with identities remaining hidden until the final reveal.

The screen has three primary tabs:

1. **Open Sessions** — discover and join other people's Round 1 sessions.
2. **My Sessions** — manage Blind Date sessions created by the current user.
3. **My Participations** — see Blind Date sessions the current user has joined and their current progress.

Only **Open Sessions** should show publicly joinable sessions.

---

# 2. Header

At the top:

### Title

**Blind Date**

### Subtitle

**Meaningful connections, one question at a time**

### Info button

An `i` icon on the right opens a short explanation of how Blind Date works.

The header should remain compact and should not consume too much vertical space because the three tabs and session content are the main purpose of the screen.

---

# 3. Hero / introduction

Use a compact introductory card at the top of the page.

### Main heading

**Real People.
Real Answers.
Deeper Connections.**

### Description

> Answer meaningful questions, progress through rounds, and discover if there's a real connection.

The visual should use an Ethiopian/East African-inspired illustrated couple, with both people holding cards/envelopes covering their identity.

The illustration should communicate **anonymous → questions → reveal**, rather than looking like a conventional dating profile.

Three small feature indicators can appear underneath:

### Meaningful Questions

Icon: chat bubble

Short label:

**Thoughtful Questions**

### Multi-Round

Icon: people / layers

Short label:

**Multiple Rounds**

### Private Reveal

Icon: lock

Short label:

**Reveal Only at the End**

These correspond directly to the core flow: participants answer questions, the creator progressively filters participants through rounds, and the creator and finalist only see each other's relevant dating profiles after the reveal.

---

# 4. Primary actions

Immediately below the hero, provide two actions.

## Create a Blind Date

Primary filled button/card.

**Create a Blind Date**

Supporting text:

**Set your questions and start your own session**

Use a `+` icon.

When tapped, the user goes into the Blind Date session creation flow.

Creating the session is a paid action using `BLIND_DATE_SESSION_CREATE`.

Do not display the creator's current credit cost directly on the home screen unless the application's existing pricing UI normally does so.

---

## How It Works

Secondary outlined/light card.

**How It Works**

Supporting text:

**Discover → Answer → Advance → Reveal**

Use a people/question-mark icon and a chevron.

This should open an explanation of the Blind Date process.

---

# 5. Three-tab navigation

The most important structural element below the introduction is the tab bar.

Use three equal-width tabs:

| Tab                   | Icon         | Purpose                |
| --------------------- | ------------ | ---------------------- |
| **Open Sessions**     | People/group | Discover sessions      |
| **My Sessions**       | User/profile | Sessions created by me |
| **My Participations** | Bookmark     | Sessions I joined      |

The selected tab uses the Qal primary purple background or underline.

The tabs should remain sticky while the user scrolls through the session list if technically convenient.

---

# 6. Open Sessions tab

This is the default tab.

### Section heading

**Open Blind Date Sessions**

Subtitle:

**Join a session and answer the creator's questions**

Only sessions satisfying the backend discovery rules should appear here.

The API is explicitly intended to return only eligible `OPEN` sessions where Round 1 is joinable. Sessions already joined, the user's own session, expired sessions, blocked users, existing matches, and incompatible gender/preferences must be excluded.

### Filter button

On the right:

**Filter**

with a funnel icon.

Possible filters should correspond to actual available session/discovery data rather than inventing new session properties.

---

# 7. Open-session card

Each session should be represented by a horizontal card.

Because the creator remains anonymous before the final reveal, **do not display the creator's actual profile photo, name, username, or public profile information**.

Instead, use a blurred/anonymous illustration or silhouette.

### Example realistic card

**Round 1**

**A Faith-Filled Future**

Metadata:

**Faith & Values**
**Marriage**

Second metadata row:

**8 participants**
**3 days left**

Short session description:

> “Let's talk about what really matters...”

Primary action:

**Join Session**

Chevron on the right indicates that the card can also be opened for details.

### Important

The participant count means the number of users currently participating in that session; it should come from the actual session data rather than being hard-coded.

The age range, gender and relationship-intention information should only be displayed if those values are actually available from the session/discovery model. The requirements establish compatibility filtering but do not define a specific UI schema for displaying an age range. Therefore, the implementation should not invent those fields as mandatory session properties.

---

# 8. Example Open Sessions

For a realistic populated state, use examples such as:

### Session 1

**Round 1**

**A Faith-Filled Future**

**Faith & Values · Marriage**

**8 participants · 3 days left**

> “Let's talk about what really matters...”

**Join Session**

---

### Session 2

**Round 1**

**Let's Build Something Real**

**Life Goals · Serious Relationship**

**12 participants · 5 days left**

> “Honest answers, real intentions.”

**Join Session**

---

### Session 3

**Round 1**

**Kindness Goes a Long Way**

**Personality · Long Term Dating**

**6 participants · 2 days left**

> “Small questions, big connections.”

**Join Session**

These are illustrative UI records; production values should come from the session/discovery API.

---

# 9. Session detail interaction

Tapping a session should open a **Blind Date Session Details** screen rather than immediately charging the user.

The detail screen should explain:

* Blind Date title
* Anonymous creator representation
* Round 1
* Number of participants
* Session expiry/time remaining
* What participation involves
* Number/type of questions
* Relevant session description
* Participation cost, using the application's existing credit/pricing presentation
* **Join Session** CTA

The actual participation endpoint charges `BLIND_DATE_PARTICIPATE` when the user joins Round 1.

---

# 10. My Sessions tab

This tab is for sessions **created by the current user**.

The user can have only **one active session at a time**, where active means `OPEN` or `REVEAL`.

Use status-oriented cards.

### Example

**My Blind Date**

**A Faith-Filled Future**

`OPEN`

**Round 1**

**8 participants**

**5 waiting for review**

CTA:

**Review Participants**

Secondary information:

**Created 2 days ago**

**Ends in 3 days**

---

### When participants have been advanced

Example:

**Round 2**

**5 participants**

**3 answers waiting**

CTA:

**Review Round 2**

---

### When the creator has selected a finalist

Show a special state:

**Final Reveal**

**Your finalist is ready**

**Waiting for both decisions**

CTA:

**View Reveal**

The requirements explicitly define the session as `REVEAL` after finalist selection and state that the creator cannot manually close the session during this stage.

---

### Completed session

Example:

**A Faith-Filled Future**

`COMPLETED`

**Matched**

or:

`COMPLETED`

**No Match**

or:

`EXPIRED`

The backend supports these session/outcome states.

---

# 11. My Participations tab

This tab shows sessions where the current user is a participant.

The most important information is **current progress**.

Example:

### Active participation

**A Faith-Filled Future**

`ROUND 2`

**You advanced!**

**2 of 5 participants remain**

CTA:

**Answer Round 2**

The participant's `current_round_id` is the authoritative indicator of which round they currently occupy.

---

### Waiting for creator

**Let's Build Something Real**

`ROUND 1`

**Answers submitted**

**Waiting for the creator's selection**

Status:

**Waiting**

---

### Eliminated

**Kindness Goes a Long Way**

`ELIMINATED`

**You weren't selected for the next round.**

Do not provide a way to reopen or continue the session because eliminated participants lose access permanently.

---

### Finalist

If the user reaches the final:

**A Faith-Filled Future**

`FINALIST`

**You've been selected for the final reveal!**

CTA:

**View Reveal**

After reveal:

**Final Reveal**

**The creator is waiting for your decision.**

Buttons:

**Interested**

**Not Interested**

The final decision must be independent on both sides. A match is created only when both users select `INTERESTED`.

---

# 12. Empty states

Each tab needs a useful empty state.

## Open Sessions — no sessions

Illustration of two anonymous people.

**No Blind Dates Yet**

> There aren't any open Blind Date sessions for you right now. Check back later for new conversations.

CTA:

**Refresh**

Do not automatically suggest sessions that the backend says are incompatible.

---

## My Sessions — no session

**Create Your Blind Date**

> Ask meaningful questions, meet people through their answers, and choose who you want to reveal.

CTA:

**Create a Blind Date**

---

## My Participations — no participation

**You Haven't Joined a Blind Date Yet**

> Explore open sessions and find a conversation that feels worth answering.

CTA:

**Browse Open Sessions**

---

# 13. Visual hierarchy

The screen should feel **premium, calm and relationship-oriented**, rather than like a gamified competition.

Recommended hierarchy:

```text
Blind Date
Meaningful connections, one question at a time

┌──────────────────────────────────────┐
│ REAL PEOPLE                          │
│ REAL ANSWERS                         │
│ DEEPER CONNECTIONS       Illustration│
│                                      │
│  💬 Questions  👥 Rounds  🔒 Reveal │
└──────────────────────────────────────┘

┌──────────────────┐ ┌─────────────────┐
│ + Create a       │ │ How It Works    │
│   Blind Date     │ │                 │
└──────────────────┘ └─────────────────┘

┌──────────────────────────────────────┐
│ Open Sessions │ My Sessions │ My     │
│               │             │ Particip.│
└──────────────────────────────────────┘

Open Blind Date Sessions
Join a session and answer the creator's questions

                              Filter

┌──────────────────────────────────────┐
│ Round 1                              │
│ [anonymous image]  A Faith-Filled   │
│                    Future            │
│                    Faith & Values    │
│                    Marriage          │
│                    8 participants    │
│                    3 days left       │
│                         Join Session │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Round 1                              │
│ [anonymous image]  Let's Build      │
│                    Something Real    │
│                    Life Goals        │
│                    Serious Relation. │
│                    12 participants   │
│                    5 days left       │
│                         Join Session │
└──────────────────────────────────────┘
```

---

# 14. Important privacy rule for the UI

The UI must be built around the fact that **Blind Date is anonymous until reveal**.

Before the final reveal:

### Allowed

* Anonymous illustration
* Session title
* Questions
* Creator-written session description
* Participant answers to the creator
* Round number
* Participant count
* Session status
* Relevant non-identifying session metadata

### Not allowed

* Creator's real photo
* Creator's name
* Creator's username
* Creator's normal dating profile
* Other identifying profile information

This is an explicit requirement, not merely a visual preference.

---

# 15. Bottom navigation

Keep the existing Qal bottom navigation.

Recommended:

**Discover · Blind Date · Messages · Likes · Profile**

The Blind Date icon should be visually selected.

Avoid adding another bottom-navigation item for each Blind Date tab. The three Blind Date tabs belong **inside the Blind Date feature**, underneath the hero/actions.

---

# 16. Responsive implementation

On mobile:

* Hero illustration and text can occupy the upper section.
* Three tabs should fit on one horizontal row.
* Session cards should remain horizontal.
* Avoid overly tall cards.
* Keep the primary CTA visible without opening the card.

On smaller screens, the three tabs can become horizontally scrollable if necessary, but ideally they should remain visible together.

The session list should be vertically scrollable while the top navigation/header can remain fixed.

---

# 17. Data mapping

The UI should map directly to the existing Blind Date backend concepts:

```text
Blind Date Home
│
├── Open Sessions
│   └── GET /blind-date/sessions/discover
│
├── My Sessions
│   └── Creator's blind_date_sessions
│
└── My Participations
    └── blind_date_session_participants
         └── current_round_id
```

The core session model contains:

```text
session
├── status
├── expires_at
├── created_at
└── rounds
     ├── round_number
     ├── status
     └── questions
```

Participant progress comes from:

```text
participant
├── status
├── current_round_id
├── joined_at
├── advanced_at
├── finalist_at
└── answers
```

These correspond to the proposed session, round, participant and answer architecture in the requirements.

---

# 18. Overall UX principle

The home screen should make the user immediately understand:

**“I can either create my own Blind Date, discover someone else's, or continue one I've already joined.”**

The three tabs therefore become the central navigation model:

**Open Sessions → My Sessions → My Participations**

while the hero explains the unique value:

**Questions first.
Selection through rounds.
Identity at the end.
Match only when both people are interested.**
