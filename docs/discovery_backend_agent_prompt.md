# Backend Agent Implementation Prompt — Qaliye Discovery API

## Your Task

Implement the **Discovery feature** Spring Boot backend for the Qaliye dating app, exactly as specified in `docs/discovery_screen_api_design.md`. Read that file completely before writing a single line of code.

---

## Read These Files First (in this order)

1. **`docs/discovery_screen_api_design.md`** — the authoritative specification you must implement. Every section is mandatory.
2. **`docs/schema.sql`** — the complete PostgreSQL + PostGIS schema. Do not invent tables, columns, or constraints that are not in this file. Map every SQL identifier exactly as written.

Do not read or modify any frontend files. Do not create any frontend code.

---

## Tech Stack and Implementation Constraints (non-negotiable)

- Java 21 and Spring Boot 3.x.
- Spring Security OAuth2 Resource Server. Validate Supabase JWTs through the project’s Supabase JWKS endpoint.
- Use JDBC/JdbcTemplate or JOOQ for the Discovery queue and other complex PostGIS queries. Do not use JPA/Hibernate for the Discovery queue.
- Spring Data JPA is permitted only for simple CRUD or straightforward queries, such as `UserDailyLimits`, subscriptions, or plan limits.
- PostgreSQL with PostGIS on Supabase, accessed through a direct backend JDBC connection using a database role with the required server-side permissions. Do not expose database credentials.
- Use the Supabase Storage REST API through `WebClient` or `RestTemplate`, authenticated only with `SUPABASE_SERVICE_ROLE_KEY`, to generate short-lived signed URLs. Never return `storage_path`, bucket names, or the service-role key to clients.
- Use Flyway for versioned migrations. Treat `docs/schema.sql` as the target schema contract; do not edit it from application code. Add only safe, versioned migrations when the existing deployed database requires them.
- Use Testcontainers and JUnit 5 for integration tests, including PostgreSQL/PostGIS coverage where feasible.
- Prefer MapStruct for DTO mapping.

---

## Endpoints to Implement

Implement all 5 endpoints exactly as specified in Section 1 of the spec:

| Method | Path | Spec Section |
|--------|------|--------------|
| `GET` | `/api/v1/discovery/profiles` | §2.1, §5.1, §8, §9 |
| `POST` | `/api/v1/discovery/actions/like` | §2.2, §4.3, §4.6 |
| `POST` | `/api/v1/discovery/actions/pass` | §2.3, §4.4 |
| `POST` | `/api/v1/discovery/actions/superlike` | §2.4, §4.5, §4.6 |
| `POST` | `/api/v1/discovery/actions/rewind` | §2.5, §4.7 |

All endpoints must be under `/api/v1/discovery` and require a valid Supabase Bearer JWT (`sub` claim = `app_users.id`).

---

## Mandatory Implementation Rules

### Security
- Extract `actorId` exclusively from the validated JWT `sub` claim — never from a request body or query parameter.
- The `SUPABASE_SERVICE_ROLE_KEY` must be loaded from environment/config, never hardcoded.
- Never return raw latitude, longitude, or `storage_path` in any response.

### Discovery Query (`GET /api/v1/discovery/profiles`)
- Use the **exact SQL** from §5.1 of the spec. Do not simplify it.
- Execute it via `JdbcTemplate.query()` with a `RowMapper<DiscoveryProfileDto>`.
- After fetching profile rows, load photos in a **single batched query** (§5.3), then generate signed URLs for all photos in one batched call to Supabase Storage.
- Signed URL TTL = 3600 seconds. Return `expires_at` as an ISO-8601 `Instant`.
- Load prompt answers in a **single batched query** (§5.4) using the actor's preferred language.
- The `distance_km` field must be `null` for non-NEARBY location filters.
- Apply the 1 km minimum floor to `distance_km` (distances < 500 m → return 1).
- Age must be calculated server-side via `calculate_age(date_of_birth)` in the SQL query — never on the Java side.

### Location Filter Logic (§5.2)
- `NEARBY` → use `preferred_residency_types` from `discovery_preferences` + `ST_DWithin` distance gate (skip gate if `open_to_long_distance = true`).
- `ETHIOPIA` → override `residencyTypes = ['ETHIOPIA']`, no distance gate.
- `ERITREA` → override `residencyTypes = ['ERITREA']`, no distance gate.
- `DIASPORA` → override `residencyTypes = ['DIASPORA']`, no distance gate.

### Pagination (§8)
- Batch size: exactly 10.
- Cursor is an **opaque base64-encoded JSON** object carrying `type`, `value` (offset), `location_filter`, and `generated_at`.
- Validate cursor age: if `generated_at` is older than 30 minutes, reset to offset 0 and include `cursor_reset: true` in the response.
- Return `total_eligible` (from a COUNT query on the same filtered set before LIMIT/OFFSET).

### Idempotency
- Every swipe action request includes `client_action_id` (UUID). Check for an existing row with `(actor_user_id, client_action_id)` before any writes. If found, return the existing record with `"_idempotent": true` (field name `idempotent` in the Java DTO). Do not decrement daily limits again.

### Daily Limits (§5.6, §5.7, §6.1)
- Upsert `user_daily_limits` with `ON CONFLICT DO NOTHING`, then `SELECT ... FOR UPDATE` to serialise concurrent access.
- Resolve plan limits by querying `user_subscriptions → subscription_plans → subscription_plan_limits`. Fall back to the FREE plan if no active subscription.
- `NULL` limit value = unlimited.
- Passes are always unlimited (no `user_daily_limits` interaction).

### Entitlement Credits (§4.5, §4.7, §5.9)
- When Super Like daily quota is exceeded: check `user_entitlement_ledger` for `SUPERLIKE_CREDIT` balance (`SUM(quantity_delta)` where `expires_at IS NULL OR expires_at > NOW()`).
- When Rewind daily quota is exceeded: same check for `REWIND_CREDIT`.
- If credits are available, insert a `CONSUMPTION` row (negative `quantity_delta`) into `user_entitlement_ledger` linked via `related_discovery_action_id`.

### Match Creation (§4.6)
- Use canonical pair ordering: `user_one_id = MIN(actorId, targetId)`, `user_two_id = MAX(actorId, targetId)`.
- Set `rewind_eligible_until = NOW() + configured grace period` (default 10 minutes).
- The database trigger `validate_match_like_actions` fires on INSERT and will raise an exception if preconditions fail — catch `DataIntegrityViolationException` and translate it to the appropriate API error.
- Return `MatchSummaryDto` in the swipe response when a match is created, including `rewind_eligible_until` and a signed URL for the matched user's primary photo.

### Rewind (§4.7, §6.3)
- Rewind always targets the **most recent ACTIVE action** of the actor. The request body is empty.
- `SELECT ... FOR UPDATE` on the action row before any update.
- If the action is LIKE or SUPERLIKE and produced an active match:
  - Check `rewind_eligible_until > NOW()` → `422 REWIND_MATCH_GRACE_PERIOD_EXPIRED` if expired.
  - Check `first_message_at IS NULL` → `422 REWIND_MATCH_HAS_MESSAGES` if messages exist.
  - Update match: `status = 'ENDED'`, `end_reason = 'CANCELLED_BY_REWIND'`, `ended_by_user_id`, `ended_at`.
- Then update action: `status = 'REVERSED'`, `reversed_at`, `reversed_reason = 'USER_REWIND'`.
- The deferred trigger `validate_active_match_action_states` fires at commit — the order above (end match first, then reverse action) satisfies it.
- Return the full `DiscoveryProfileDto` of the restored profile (with fresh signed URLs) in `restored_profile`.

### Transaction Boundaries (§6)
- Like/SuperLike: one transaction covering the daily limit lock, action insert, counter update, mutual check, and optional match creation.
- Pass: minimal transaction (action insert only).
- Rewind: one transaction covering daily limit lock, action lock, optional match end, action reversal, counter update, optional ledger row.
- Use `@Transactional` with `REQUIRES_NEW` propagation for the entitlement ledger consumption so a ledger failure doesn't silently swallow the action.

### Error Handling (§7)
- Implement a `@ControllerAdvice` / `@RestControllerAdvice` `GlobalExceptionHandler`.
- Every error response must match the envelope exactly:
  ```json
  { "error": { "code": "ERROR_CODE", "message": "Human-readable text", "details": {} } }
  ```
- Map **every** error code from the table in §7. Missing error codes are bugs.
- Catch `DataIntegrityViolationException` on the swipe insert and translate to `409 DUPLICATE_ACTIVE_ACTION`.

### Actor and Target Eligibility (§4.1, §4.2)
- Validate actor eligibility on every action endpoint before touching `user_daily_limits`.
- Validate that `targetUserId != actorId` → `422 SELF_ACTION_NOT_ALLOWED`.
- Validate target eligibility (account status, visibility, primary photo) before any write.

---

## Configuration Properties

Add all properties from Appendix B of the spec to `application.properties` / `application.yml` with their documented defaults:

```yaml
discovery:
  rewind:
    match-grace-period-minutes: 10
  queue:
    batch-size: 10
  cursor:
    max-age-minutes: 30
  distance:
    min-km: 1
storage:
  signed-url:
    ttl-seconds: 3600
```

Also add:
```yaml
supabase:
  url: ${SUPABASE_URL}
  service-role-key: ${SUPABASE_SERVICE_ROLE_KEY}
  jwks-uri: ${SUPABASE_JWKS_URI}   # https://<ref>.supabase.co/auth/v1/.well-known/jwks.json

spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}
  security:
    oauth2:
      resourceserver:
        jwt:
          jwk-set-uri: ${supabase.jwks-uri}
```

---

## Suggested Package Structure

```
com.qaliye.discovery
├── controller
│   └── DiscoveryController.java          # Appendix A
├── dto
│   ├── DiscoveryProfileDto.java
│   ├── DiscoveryPhotoDto.java
│   ├── PromptAnswerDto.java
│   ├── DiscoveryProfilesResponse.java
│   ├── SwipeActionRequest.java
│   ├── SwipeActionResponse.java
│   ├── MatchSummaryDto.java
│   ├── MatchedUserSummaryDto.java
│   ├── RewindRequest.java
│   └── RewindResponse.java
├── service
│   ├── DiscoveryService.java             # orchestrates all business rules
│   ├── DiscoveryQueryService.java        # runs the core SQL query (§5.1)
│   ├── SwipeActionService.java           # like / pass / superlike
│   ├── RewindService.java
│   ├── MatchService.java
│   ├── PlanEntitlementService.java       # daily limits + credit ledger
│   └── StorageSigningService.java        # Supabase Storage signed URLs
├── repository
│   ├── DiscoveryActionRepository.java    # JdbcTemplate for action queries
│   ├── MatchRepository.java
│   ├── DailyLimitRepository.java
│   └── EntitlementLedgerRepository.java
├── model
│   └── (internal domain models if needed)
├── cursor
│   └── DiscoveryCursorCodec.java         # base64 encode/decode cursor
├── exception
│   ├── DiscoveryException.java           # base checked exception
│   ├── ActorIneligibleException.java
│   ├── TargetIneligibleException.java
│   ├── DuplicateActiveActionException.java
│   ├── DailyLimitExceededException.java
│   ├── NoRewindableActionException.java
│   ├── RewindMatchGracePeriodExpiredException.java
│   ├── RewindMatchHasMessagesException.java
│   └── GlobalExceptionHandler.java
└── config
    ├── SecurityConfig.java               # JWT resource server config
    ├── DiscoveryProperties.java          # @ConfigurationProperties
    └── StorageProperties.java
```

---

## Tests to Write

Write integration tests (Testcontainers Postgres with PostGIS) covering the test IDs from §10 of the spec. At minimum cover:

- **DQ-16 to DQ-22** — block and swipe exclusion logic, REVERSED re-eligibility
- **LA-01 to LA-10** — all like action scenarios including concurrent requests
- **RW-01 to RW-06** — rewind pass reversal
- **RM-01 to RM-06** — rewind match cancellation including grace period and message checks
- **DC-01, DC-06** — distance floor and age boundary
- **DL-01 to DL-02** — daily limit UTC reset

---

## What NOT to Do

- Do not modify `docs/schema.sql`. All tables, types, triggers, and indexes are finalised.
- Do not create any React Native, Expo, or TypeScript files.
- Do not use `@Entity` / JPA for the core discovery query.
- Do not cache signed URLs. Generate them fresh per request.
- Do not return `storage_path`, `coords`, `lat`, `lng`, `date_of_birth`, or any other raw PII field in any API response.
- Do not apply distance filtering or age calculation in Java — do it in SQL.
- Do not use `SERIAL` or application-generated UUIDs for PK — use `gen_random_uuid()` in the INSERT SQL as the schema does.
- Do not hard-delete any `user_discovery_actions` or `matches` rows.
- Do not use `TRUNCATE` or `DELETE` in any test setup for tables that have audit triggers — use targeted INSERTs and rollback instead.
