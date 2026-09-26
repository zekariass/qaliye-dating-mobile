# Backend Agent Prompt — Include Like Variant in Likes List

> **How to use:** Give this prompt to the backend AI agent working in the
> `qaliye-backend` repo (Spring Boot, Java 21, JDBC via
> `NamedParameterJdbcTemplate`). Attach `docs/payment-system/payment-system-update.md`
> (section "12. Discovery Counts & Likes Endpoints") as context. When done,
> update that section with the new fields.

---

## Goal

The mobile app's **Likes** screen (Received / Sent tabs) needs to show the
*specific* like type for each row — e.g. plain "Like" vs "Super Like" vs a
named variant such as "Rose" or "Fire" — using the same icon/name metadata
already used by the swipe variant picker (`action_feature_variants`, exposed
today via `GET /api/v1/discovery/like-actions`).

Today this is impossible: `GET /api/v1/discovery/likes` only returns
`actionType` (`LIKE` / `SUPERLIKE`), never the `action_variant_code` that was
stored on the underlying `user_discovery_actions` row when the like was
created. The client can tell "like" from "super like" but not which named
variant (if any) was used.

## Change required

### `GET /api/v1/discovery/likes`

No new params — same `direction` / `page` / `size` contract. Add two fields
to each item in `LikesPageResponse.items[]`:

```json
{
  "items": [
    {
      "actionId": "uuid",
      "userId": "uuid",
      "displayName": "Alice",
      "age": 28,
      "isVerified": true,
      "primaryPhotoUrl": "https://...",
      "actionType": "LIKE",
      "actionVariantCode": "ROSE",
      "actionVariant": {
        "code": "ROSE",
        "name": "Rose",
        "description": "Send a rose",
        "icon": "https://cdn.qal.app/actions/rose.webp"
      },
      "likedAt": "2026-08-15T10:00:00Z",
      "distanceKm": 5,
      "city": "Addis Ababa",
      "region": "Addis Ababa",
      "countryName": "Ethiopia",
      "activityStatus": "RECENTLY_ACTIVE"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 12,
  "totalPages": 1,
  "hasNext": false,
  "hasPrevious": false,
  "direction": "RECEIVED"
}
```

### Field rules

- `actionVariantCode` — the raw `user_discovery_actions.action_variant_code`
  for that row. `null` when the like predates the variant feature or was
  created without one (e.g. plain `LIKE`/`SUPERLIKE` from an older client).
- `actionVariant` — `null` whenever `actionVariantCode` is `null`. Otherwise
  the variant's display metadata, resolved the same way
  `findByActionCodeAndVariantCode` does for historical/inactive variants (do
  **not** filter by `active = TRUE` — a variant that's since been retired
  must still render correctly for existing likes):
  - `code` — `action_feature_variants.code`
  - `name` — `action_feature_variants.name`
  - `description` — `action_feature_variants.description`
  - `icon` — `action_feature_variants.icon` (already an absolute CDN URL,
    same as `GET /discovery/like-actions`)
- Exclude the `BLIND_DATE` variant's `credits`/`sort_order` columns from this
  payload — the likes list only needs display metadata, matching the slim
  `ActionVariantSummary` shape already used in `SwipeActionResponse`
  (`action_variant` field there — reuse that same mapper/DTO if one exists).

## Implementation notes

- In whatever repository method backs `GET /discovery/likes` (likely in a
  `DiscoveryLikesRepository`/`LikesQueryRepository`), add
  `user_discovery_actions.action_variant_code` to the selected columns and a
  `LEFT JOIN action_feature_variants afv ON afv.code = a.action_variant_code
  AND afv.feature_action_id = (SELECT id FROM feature_actions WHERE code = 'LIKE')`
  to pull `afv.name`, `afv.description`, `afv.icon`.
- Reuse the existing `ActionVariantSummary`-equivalent mapper used for
  `SwipeActionResponse.action_variant` so the JSON shape matches exactly
  what the client already deserializes elsewhere (`code`, `name`,
  `description`, `icon` — no `credits`/`sort_order`).
- This is a read-only projection change — no migration needed, since
  `action_variant_code` and `action_feature_variants` already exist (added
  for the swipe variant picker / Blind Date feature).

## Edge cases to cover

- Like created before the variant feature existed → `actionVariantCode:
  null`, `actionVariant: null`. Client falls back to the plain `actionType`
  (LIKE/SUPERLIKE) badge.
- Variant since deactivated (`active = FALSE`) → still resolve and return
  its display metadata; only *selectable* variants are filtered by
  `active`, not historical display.
- Variant code stored but the `action_feature_variants` row was deleted
  (shouldn't happen, but don't 500) → `actionVariant: null` while
  `actionVariantCode` still reflects the stored value.

## Tests

Extend whatever test class covers `GET /discovery/likes` with:

1. Like sent with a named variant → `actionVariant` populated with correct
   code/name/description/icon.
2. Plain `LIKE`/`SUPERLIKE` with no variant → both fields `null`.
3. Like whose variant has since been deactivated → still resolves metadata.
4. Received vs Sent direction both populate the new fields identically.

## After implementing

Update `docs/payment-system/payment-system-update.md` (section 12, `GET
/api/v1/discovery/likes`) in the mobile repo with the new
`actionVariantCode`/`actionVariant` fields so the API reference stays
accurate.
