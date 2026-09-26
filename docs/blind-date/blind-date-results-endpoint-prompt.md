# Backend Agent Prompt — Blind Date Session Results Endpoint

> **How to use:** Give this prompt to the backend AI agent working in the
> `qaliye-backend` repo (Spring Boot, Java 21, JDBC via
> `NamedParameterJdbcTemplate`). Attach `docs/blind-date/bind-date-backend-api.md`
> as context. When done, update that API doc with the new endpoint.

---

## Goal

The mobile app is adding a creator-facing **Blind Date Results** screen. When
the creator opens a finished session, it shows the outcome, the revealed
winner (finalist) with their profile, and the winner's answers grouped by
round.

Today this is impossible:

- `GET /sessions/{id}/participants` only returns answers for the **current
  open round** — empty once the session ends
  (`BlindDateSessionService.getSessionParticipants`, `openRoundId` lookup).
- Participant `user_id` is never exposed, so the creator can't resolve the
  finalist's identity even though the reveal already happened.

## New endpoint

```
GET /api/v1/blind-date/sessions/{sessionId}/results
```

**Auth:** Bearer JWT. **Creator only** — if the caller is not the session
creator, return `403 not_session_creator` (reuse the existing
`requireCreator(session, callerId)` pattern in `BlindDateSessionService`).

The endpoint must work for sessions in **any** status, but it is only
meaningful for `REVEAL` and later. Do **not** restrict by status — the client
only routes there for finished sessions, and a `REVEAL` caller gets the
in-progress view for free.

## Response `200`

```json
{
  "session_id": "uuid",
  "status": "COMPLETED",
  "created_at": "2026-09-20T09:00:00Z",
  "participant_count": 7,
  "round_count": 3,
  "outcome": "MATCHED",
  "match_id": "uuid",
  "winner": {
    "participant_id": "uuid",
    "user_id": "uuid",
    "status": "REVEALED",
    "profile": {
      "display_name": "Sara",
      "age": 27,
      "gender": "FEMALE",
      "religion": "ORTHODOX",
      "relationship_intention": "MARRIAGE",
      "city": "Addis Ababa",
      "country": "Ethiopia",
      "primary_photo": {
        "id": "uuid",
        "signed_url": "https://…",
        "expires_at": "2026-09-20T11:00:00Z"
      }
    },
    "rounds": [
      {
        "round_id": "uuid",
        "round_number": 1,
        "answers": [
          {
            "session_question_id": "uuid",
            "question": "Are you a morning person?",
            "answer": "Absolutely not.",
            "submitted_at": "2026-09-20T09:45:00Z"
          }
        ]
      }
    ]
  }
}
```

### Field rules

- `outcome` / `match_id` — from `blind_date_final_decisions`
  (`BlindDateFinalDecisionRepository.findBySession(sessionId)`). Both `null`
  when no final-decision row exists or the outcome hasn't resolved yet
  (`REVEAL` in progress).
- `winner` — the participant referenced by
  `blind_date_final_decisions.finalist_participant_id`. **`null` when no
  finalist was ever selected** (session `CLOSED`/`CANCELLED`/`EXPIRED` before
  `SELECT_FINALIST`). This is not an error — return `200` with
  `"winner": null`.
- `winner.user_id` — intentionally exposed **here only**. The reveal already
  happened by definition (a finalist exists ⇒ the session reached `REVEAL`),
  so the spec's "both sides see each other after reveal" applies. Keep
  `user_id` out of the roster endpoint — this results payload is the only
  place it surfaces.
- `winner.status` — the participant row status (`FINALIST`, `REVEALED`, or
  `WITHDRAWN` if they left during reveal).
- `winner.profile` — the finalist's public profile. Reuse the
  `findCreatorInfo` query shape in `BlindDateSessionRepository`
  (`profiles` + `app_users`/`addresses` + primary approved `profile_photos`)
  but add `p.display_name`, and sign the photo with
  `StorageSigningService.signPhoto` exactly like `getCreatorInfos` does. Any
  field may be `null`.
- `winner.rounds` — **all** session rounds ordered by `round_number` (use
  `sessionRepo.findRoundsForSession`), each with the finalist's answers for
  that round via the existing
  `participantRepo.findAnswersWithQuestions(participantId, roundId)` (it
  already joins `blind_date_session_questions` and orders by `sort_order`).
  Include rounds with an empty `answers` array — the client renders round
  sections regardless. `answer`/`submitted_at` are `null` for unanswered
  questions only if the query returns a row; unanswered snapshot questions
  simply don't appear — that's fine, the client only renders returned rows.

## Implementation notes

- Add `getSessionResults(callerId, sessionId)` to `BlindDateSessionService`:
  `findSession` → `requireCreator` → `finalDecisionRepo.findBySession` →
  load finalist `ParticipantRow` → `findCreatorInfo(List.of(finalist.userId()))`
  extended with `display_name` (add it to `CreatorInfoRow` — the extra column
  is harmless for the existing creator-info usages) →
  `findRoundsForSession` + `findAnswersWithQuestions` per round.
- `participant_count` = all participants who ever joined
  (`findParticipantsForSession(sessionId).size()` — do **not** use
  `countStillActiveInSession`, which excludes eliminated/withdrawn users).
- `round_count` = `rounds.size()`.
- Add the controller method + a `resultsToMap` mapper in
  `BlindDateSessionController` next to `sessionParticipants`.
- New record suggestions: `SessionResultsView(SessionRow session,
  FinalDecisionRow decision, ParticipantRow finalist, CreatorInfo profile,
  List<RoundAnswersView> rounds)` where `RoundAnswersView(RoundRow round,
  List<ParticipantAnswerView> answers)`.

## Edge cases to cover

- Session not found → `404 session_not_found`.
- Non-creator caller → `403 not_session_creator`.
- No final-decision row → `winner: null`, `outcome: null`, `match_id: null`.
- Finalist row missing (data inconsistency) → `winner: null`, don't 500.
- Winner's profile photo missing/unapproved → `primary_photo: null`.
- Session still `OPEN` (creator hits it early) → return the payload normally:
  `winner: null`, rounds reflect current state.

## Tests

Extend `BlindDateSessionServiceTest` (or a new test class) covering at least:

1. Creator gets winner + per-round answers for a `COMPLETED` session.
2. Non-creator gets `403 not_session_creator`.
3. Session closed with no finalist → `winner: null`, no error.
4. `REVEAL` session with pending decisions → winner present, `outcome: null`.

## After implementing

Update `docs/blind-date/bind-date-backend-api.md` in the mobile repo (section
2.4) with the new endpoint so the API reference stays accurate.
