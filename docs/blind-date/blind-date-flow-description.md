Blind Date — Complete Gamified UI/UX Flow
1. Product concept
Blind Date is a multi-round dating experience where participants initially remain anonymous.
The core experience is:
Discover → Join → Answer → Wait → Advance → Answer Again → Finalist → Reveal → Mutual Decision → Match
The experience should feel like a dating mystery/journey, rather than a conventional dating profile or swipe feature.
The UI should create:
- curiosity
- anticipation
- progression
- meaningful conversation
- suspense
- a sense of achievement when advancing
- an exciting reveal
However, the experience should remain appropriate for users looking for meaningful/serious relationships.
Do not turn people into scores, rankings, XP, or competitive game pieces.
2. Critical round rule
The creator does NOT choose the number of rounds in advance.
This is important.
When creating a Blind Date, the creator does not select:
2 rounds
3 rounds
5 rounds
Instead, the Blind Date starts at:
Round 1
After each round, the creator reviews the participants' answers and decides who should continue.
If the creator wants to continue:
Advance selected participants → next round
The round number automatically increments.
For example:
Round 1
   ↓
Creator advances participants
   ↓
Round 2
   ↓
Creator advances participants
   ↓
Round 3
   ↓
Creator advances participants
   ↓
Round 4
The creator can continue this process until the configured maximum number of rounds is reached.
When the maximum is reached
The creator can no longer create another normal round.
The UI changes from:
Advance Participants
to:
Select Finalist
The creator must select exactly one finalist.
That finalist proceeds to the reveal stage.
Therefore:
The creator controls how many rounds actually happen. The system controls the maximum.
3. Dynamic rounds
The UI must never assume that there are exactly 3, 4, or 5 rounds.
Do not hard-code:
Round 2 of 5
because the creator may stop progressing participants earlier.
Instead show:
ROUND 2
and a progress indicator showing completed/current rounds.
For example:
✓ ───── ●
R1      R2
If another round is created:
✓ ───── ✓ ───── ●
R1      R2      R3
If the maximum has been reached:
✓ ───── ✓ ───── ✓ ───── ★
R1      R2      R3     FINAL
The number of rounds is therefore dynamic.
4. Two sides of the experience
The feature has two distinct journeys.
Participant journey
The participant:
Discovers → Joins → Answers → Waits → Advances or is eliminated → Answers again → Finalist → Reveal → Decides → Matches
Creator journey
The creator:
Creates → Opens Round 1 → Reviews answers → Advances participants → Creates next round → Reviews again → Repeats → Selects finalist → Reveals → Final decision
The two journeys should feel connected but have different UI priorities.
PARTICIPANT JOURNEY
5. Screen 1 — Blind Date Discovery
Purpose:
Help the user discover an anonymous Blind Date worth joining.
Use the swipe-card design.
Card
Large portrait card with:
- strongly blurred profile photo
- age
- country
- relationship intention
- religion
- language
- participant count
- current availability
- expiry
Example:
┌──────────────────────────────────────┐
│ ● OPEN                    ◷ 4 days   │
│                                      │
│          BLURRED PHOTO               │
│                                      │
│  27                                  │
│  Ethiopia                            │
│                                      │
│  Serious Relationship                │
│  Christian · English                 │
│                                      │
│  8 / 20 participants                │
│                                      │
│  ┌────────────────────────────────┐  │
│  │       View Questions →         │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
Do not display the actual questions on the discovery card.
The questions are shown on the detail screen.
Actions
Swipe left:
Pass
Swipe right:
Join
Also provide visible action buttons:
Pass | View Questions | Join
The Join action should not immediately charge the user.
Open a confirmation step first.
6. Screen 2 — Blind Date Introduction / Join Confirmation
When the user decides to join:
Show a short introduction to the experience.
Example:
You're in?
Your Blind Date journey begins.
Show:
- age
- country
- relationship intention
- religion
- language
- blurred photo
Then explain briefly:
Stay anonymous
Your identity and photo remain hidden while you progress through the Blind Date.
Meaningful questions
You'll answer questions selected by the host.
Earn your way forward
The host decides who advances to the next round.
Then:
Join Blind Date
If a cost applies, show the actual configured cost.
Do not hard-code credit pricing.
7. Screen 3 — Round Introduction
After joining, don't immediately throw the user into a form.
Create a short "chapter" transition.
Example:
ROUND 1
First Impressions
Let's start with the basics.
3 questions to get to know you.
Then:
Begin Round 1 →
The title/theme can be generated from the configured round information.
Do not require every Blind Date to use the same fixed titles.
8. Screen 4 — Answer Questions
This is the primary participant activity.
Display one question at a time or a carefully structured question sequence.
Example:
ROUND 1

Question 1 of 3

What's something that always
makes you smile?

┌──────────────────────────────┐
│ Type your answer...          │
│                              │
│                              │
└──────────────────────────────┘

0 / 500

[ Next Question → ]
Show progress:
1 of 3
Then:
2 of 3
Then:
3 of 3
Do not display other participants' answers.
Do not reveal the creator's identity.
9. Question experience
Make answering feel interactive rather than like filling out a form.
Potential interaction:
Question waiting...
↓
Question card appears/reveals.
↓
User answers.
↓
✓ Answer saved
↓
2 questions remaining
↓
Next question.
Use subtle transitions.
Avoid excessive animation.
The goal is anticipation, not distraction.
10. Screen 5 — Round Complete
After all questions are answered:
Round 1 Complete! 🎉
Great job. You've answered all the questions.
Then explain:
What happens next?
- The host reviews the answers.
- The host decides who advances.
- If selected, the next round will unlock automatically.
Primary action:
Back to My Blind Dates
Do not show a countdown unless the backend actually has a relevant deadline.
11. Screen 6 — Waiting for Creator
This is an important emotional state.
Show:
Now it's their turn
You've answered all the questions.
The host is reviewing the responses and deciding who moves forward.
Show the journey:
✓ Round 1
   ↓
⏳ Waiting
   ↓
Round 2
Keep the profile blurred.
Show:
Identity hidden
The participant should understand:
I have completed everything I need to do.
12. Screen 7 — Advanced
If the creator advances the participant:
Create a celebration moment.
🎉 You're through!
Your answers caught their attention.
Then:
ROUND 2 UNLOCKED
Show:
✓ ───── ●
R1      R2
Then:
Getting to Know You
Let's go a little deeper.
3 questions await you.
Primary action:
Continue to Round 2 →
Do not say:
"You ranked #3"
or expose why another participant was eliminated.
13. Screen 8 — Next Round
The experience repeats:
Round introduction → Questions → Complete → Waiting
The round number is dynamic.
Example:
Round 2
Later:
Round 3
Later:
Round 4
There is no assumption about how many rounds will occur.
The user only knows:
You've reached Round 2.
The next round exists only when the creator advances participants and starts it.
14. Screen 9 — Elimination
If the creator does not advance the participant:
Do not use harsh game language such as:
LOSER
or:
ELIMINATED #7
Instead:
This round has ended
The host chose other participants to continue.
Thank you for sharing your story.
Actions:
View My Answers
Explore More Blind Dates
The participant's journey ends respectfully.
15. Screen 10 — Maximum Round Reached / Finalist
When the creator reaches the maximum configured number of rounds, the normal progression stops.
The participant should not see:
Round N of N
Instead, if they are still participating:
⭐ Final Round
You've made it this far.
This is the final stage before the reveal.
The creator must select one finalist.
The participant does not need to know how many other participants remain unless the product explicitly decides to expose that information.
16. Screen 11 — Finalist
If the creator selects this participant:
⭐ You're the finalist!
One last question before the reveal.
Show a special finalist visual treatment.
Progress:
✓ ─── ✓ ─── ✓ ─── ★
R1    R2    R3   FINAL
The number of previous rounds is dynamic.
Primary action:
Answer Final Question →
17. Screen 12 — Final Question
The creator can ask one final meaningful question before the reveal.
Example:
One Last Question
What's something you would want your future partner to understand about you?
Answer field.
Then:
Submit Final Answer →
After submission:
You're ready.
The reveal is waiting.
18. Screen 13 — Reveal Introduction
This should be one of the strongest visual moments in the experience.
Before showing the real profile:
You made it to the end.
Are you ready to meet your Blind Date?
Show the blurred profile.
Primary button:
Reveal Blind Date →
19. Screen 14 — Reveal Countdown
When the user taps Reveal:
Use a short, polished transition.
Example:
3
2
1
Then transition from blurred image to the real profile.
Do not make the countdown excessively long.
20. Screen 15 — Revealed Profile
Now the identity is revealed.
Show:
- real profile photo
- age
- country
- relationship intention
- religion
- language
- relevant profile information
Then optionally show:
You both said...
Only show genuine shared information derived from their actual profiles/answers.
Examples:
You both value family
You both enjoy coffee
You both want a serious relationship
Do not invent compatibility.
Do not show fake compatibility percentages such as:
87% compatible
21. Screen 16 — Final Decision
After reveal:
What do you think?
Would you like to get to know each other?
Two clear actions:
❤️ I'm Interested
✕ Not for me
The user's decision should be private.
Do not reveal the other person's decision immediately.
22. Screen 17 — Waiting for Their Decision
If the other person has not responded:
Your answer is locked in.
Now we're waiting for their decision.
Do not expose their choice until the system determines the appropriate result.
23. Screen 18 — Match
If both users select:
I'm Interested
show:
❤️ It's a Match!
You're both interested.
Then:
Start Chatting →
This transitions into the existing matching/messaging experience.
CREATOR JOURNEY
24. Screen 1 — Create Blind Date
The creator starts a Blind Date.
The creator should configure the initial session information.
Important:
Do NOT ask:
How many rounds do you want?
The number of rounds is not predetermined.
Instead, the creator creates the Blind Date and starts with:
Round 1
The system's configured maximum is used behind the scenes.
25. Screen 2 — Round 1 Setup
The creator sees:
ROUND 1
First Impressions
The creator selects questions for the first round.
Questions can come from the existing question bank.
The creator can add custom questions if supported by the existing Blind Date design.
Show:
3 questions selected
Example:
What's something that always makes you smile?
What's your perfect weekend?
What are you looking for in a relationship?
Primary:
Publish Round 1 →
26. Screen 3 — Participants Join
The creator sees the active session.
Example:
Blind Date
Round 1
8 participants
Show anonymous participant cards.
Do not expose identity.
Participants can see the creator's questions and submit answers.
The creator waits until the round is ready for review.
27. Screen 4 — Review Participants
Once participants have answered:
Round 1
Who moves forward?
8 participants answered
Show anonymous participant cards.
Each card can show:
- blurred photo
- anonymous participant ID
- age
- country
- relationship intention
- religion
- language
- answers to the current round's questions
Example:
┌─────────────────────────────┐
│ [ blurred photo ]           │
│                             │
│ Participant #04             │
│ 27 · Ethiopia               │
│ Serious Relationship        │
│ Christian · English         │
│                             │
│ "Family is the foundation..."│
│                             │
│ [ Pass ]      [ Advance ]   │
└─────────────────────────────┘
The creator should be able to review the participant's answers before making a decision.
28. Creator selection
The creator can:
Pass
or
Advance
multiple participants.
Advancing does not mean selecting the finalist.
It means:
"I want to continue getting to know this person."
The creator may advance multiple participants.
29. Screen 5 — Round Complete
After the creator finishes reviewing participants:
Round 1 Complete! 🎉
Example:
8 participants answered
4 participants advanced
4 participants did not advance
Do not rank the participants.
Do not expose ranking information.
Primary:
Continue to Round 2 →
The system increments the round automatically.
30. Screen 6 — Next Round Setup
The creator now enters:
ROUND 2
The creator selects the questions for the next round.
Important rule:
Questions selected in previous rounds cannot be selected again in a later round.
The UI should therefore disable or filter previously used questions.
Example:
3 questions selected
Then:
Publish Round 2 →
31. Repeat the process
The creator can continue:
Round 1
  ↓
Review
  ↓
Advance
  ↓
Round 2
  ↓
Review
  ↓
Advance
  ↓
Round 3
  ↓
Review
  ↓
Advance
  ↓
...
The process continues until:
The creator decides they have enough filtering and proceeds toward the finalist stage according to the product rules, or
The configured maximum number of rounds is reached.
The UI should always make the current round obvious.
32. Maximum-round behavior
When the maximum round has been reached, the creator must not see:
Create Round N+1
Instead, show:
⭐ Final Round
You've reached the maximum number of rounds.
Now choose the one person you'd like to take to the reveal.
The action changes from:
Advance
to:
Select Finalist
33. Finalist selection
Display the remaining participants.
The creator can inspect:
- blurred profile
- profile attributes
- answers from previous rounds
- final-round answer
Then select exactly one.
Example:
Select Your Finalist
Participant #03
27 · Ethiopia
Serious Relationship

[ Select Finalist ]

Participant #05
29 · Eritrea
Marriage

[ Select Finalist ]

Participant #06
31 · Ethiopia
Long Term Dating

[ Select Finalist ]
Only one participant may be selected.
Once selected:
⭐ Finalist Selected
Your Blind Date is ready for the reveal stage.
34. Finalist / final question
The creator can provide the final question if the product flow supports a final question.
Example:
Final Question
Ask one last thing before the reveal.
The creator writes/selects the final question.
Then:
Send Final Question →
The finalist answers it.
35. Reveal stage
Once the finalist has completed the final stage:
🔐 The Reveal Is Ready
Show the anonymous finalist.
The creator can initiate the reveal according to the backend flow.
Then:
Reveal Blind Date →
Both sides move into the reveal experience.
36. After reveal
Both users see the appropriate revealed profile.
Then both submit their final decision:
❤️ Interested
or
✕ Not for me
If both select Interested:
MATCH ❤️
If either does not select Interested:
The Blind Date ends without a match.
37. Gamification principles
The gamification should come from the journey, not from points.
Use:
Progress
✓ ─── ● ─── ○
Unlocking
Round 2 unlocked
Achievement moments
You're through!
Suspense
Now it's their turn.
Final milestone
You're the finalist!
Reveal
Are you ready to meet your Blind Date?
Outcome
It's a Match! ❤️
Do NOT add:
- XP
- public rankings
- leaderboards
- compatibility scores
- points for rejecting people
- participant rankings
- "winner/loser" language
The experience should feel like a mystery journey, not a competition.
38. Visual language
Use the provided UI image as the primary visual reference.
The visual style should be:
- warm
- modern
- romantic but not overly childish
- premium
- soft gradients
- rounded cards
- subtle shadows
- burgundy/maroon primary accent
- soft pink secondary accents
- blurred photography
- tasteful celebration animations
- clean typography
- strong visual hierarchy
The image is a visual reference, not a literal data specification.
Do not hard-code the data shown in the image.
For example, if the image says:
27 · Ethiopia
that is only example data.
The actual implementation must use the user's/session's real data.
39. Anonymity rules
Before reveal, never expose:
- name
- username
- exact address
- city
- distance
- social accounts
- unblurred photo
- other identifying information
The participant may see:
- age
- country
- relationship intention
- religion
- language
- blurred photo
- their own answers
- appropriate session/round information
The creator may see the anonymous participant's allowed profile attributes and answers but not identifying information before reveal.
40. Dynamic data rules
The UI must be driven by backend data.
Do not hard-code:
- number of rounds
- current round
- participant count
- maximum participants
- expiry
- age
- country
- religion
- language
- relationship intention
- question count
- question text
- credit cost
- session status
- participant status
The UI should react to the actual session and participant state.
41. Important distinction between session and participant state
Do not merge these concepts.
Session state
Examples:
- OPEN
- CLOSED
- REVEAL
- COMPLETED
- EXPIRED
Participant state
Examples:
- ACTIVE
- ADVANCED
- ELIMINATED
- FINALIST
- REVEALED
- WITHDRAWN
A participant's state and the overall session state are different.
The UI should derive the correct message/action from both.
42. Final experience
The complete experience should feel like:
PARTICIPANT

Discover
   ↓
Join
   ↓
Round 1
   ↓
Answer
   ↓
Waiting...
   ↓
🎉 You're through!
   ↓
Round 2
   ↓
Answer
   ↓
Waiting...
   ↓
🎉 You're through!
   ↓
Round N
   ↓
⭐ Finalist
   ↓
Final Question
   ↓
🔓 Reveal
   ↓
❤️ / ✕
   ↓
MATCH
And the creator:
CREATOR

Create Blind Date
   ↓
Round 1
   ↓
Collect Answers
   ↓
Review Participants
   ↓
Advance Selected People
   ↓
Round 2
   ↓
Choose New Questions
   ↓
Collect Answers
   ↓
Review
   ↓
Advance
   ↓
Round N
   ↓
Maximum Reached
   ↓
⭐ Select One Finalist
   ↓
Final Question
   ↓
Reveal
   ↓
Final Decision
   ↓
MATCH
The critical design principle is:
The creator decides who moves forward and therefore organically determines how many rounds occur. The system only enforces the maximum.
The participant should never feel like they are simply filling out forms. Every successful round should feel like unlocking the next chapter of a mystery.
The creator should never feel like they are managing database records. They should feel like they are hosting and discovering a Blind Date.
43. Implementation note for the provided UI image
Use the attached UI design as the visual reference for the implementation.
However, the image contains illustrative examples such as a fixed number of rounds. Those examples must not be interpreted as product rules.
Specifically:
- Do not hard-code 5 rounds.
- Do not display "Round X of 5" unless the product actually knows there will be exactly 5 rounds.
- Do not ask the creator to choose the number of rounds during creation.
- Do not create the next round until the creator advances participants.
- Automatically increment the round when the creator starts the next round.
- When the maximum configured round is reached, replace the normal "Advance" flow with "Select Finalist".
- Exactly one finalist must be selected.
- The finalist then proceeds to the final/reveal flow.
The provided image should therefore be treated as the visual and interaction inspiration, while this specification defines the actual product behavior.
One important correction to the image: the generated mockup currently shows “How many rounds?” during creation and “Round 1 of 5.” Don't implement those parts literally. The written specification above overrides them: rounds are created progressively, and the maximum only becomes a constraint at the appropriate point.