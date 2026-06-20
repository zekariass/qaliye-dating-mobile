# Qaliye Backend — Step-by-Step AI Agent Prompts

> **How to use:** Give each step to the backend AI agent in order, one at a time. Always attach `docs/schema.sql` and `docs/implementation_guide.md` as context for every step. Do not skip steps — each step assumes the previous one is complete and compiling.

---

## Step 1 — Project Setup: Missing Dependencies, Package Structure & Configuration

**Context files:** `docs/implementation_guide.md` (Sections 1, 6.1)

**Prompt:**

The project already exists with the following setup — **do not recreate it**:
- **Spring Boot 4.1.0**, **Java 21**
- `groupId: com.qaliye`, `artifactId: qaliye-backend`
- Base package: `com.qaliye.backend`

**Already present in `pom.xml`** (do not add these again):
- `spring-boot-starter-data-jpa`
- `spring-boot-starter-flyway` + `flyway-database-postgresql`
- `spring-boot-starter-security-oauth2-resource-server`
- `spring-boot-starter-validation`
- `spring-boot-starter-webmvc`
- `spring-boot-starter-actuator`
- `spring-boot-devtools`
- `postgresql`
- `lombok`

---

### Task A — Fix test dependencies

The current `pom.xml` test dependencies (`spring-boot-starter-actuator-test`, `spring-boot-starter-data-jpa-test`, etc.) are **non-standard artifacts that do not exist in Maven Central** and will cause build failures. Replace the entire `<scope>test</scope>` section with these correct test dependencies:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
```

---

### Task B — Add the three missing runtime dependencies

Add to `pom.xml` inside `<dependencies>`:

```xml
<!-- Quartz — used for: message moderation job (every 15 min), subscription reconciliation (daily), data deletion (weekly) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-quartz</artifactId>
</dependency>

<!-- Cache abstraction — used for: UserStatusService (60s TTL), DailyLimitsService subscription features (5 min TTL) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>

<!-- Caffeine — in-memory cache provider backing Spring Cache -->
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>
```

---

### Task C — Create package structure

Create the following packages under `src/main/java/com/qaliye/backend/`. Each package must have at least an empty `package-info.java` so the directory is committed to version control:

```
config/          — SecurityConfig, AsyncConfig, CacheConfig, QuartzConfig, RestClientConfig
common/          — CallerUtils, ApiError, GlobalExceptionHandler
user/            — UserStatusService, DataDeletionJob
  user/entity/   — AppUser, Profile, Address, ProfilePhoto, DiscoveryPreferences
  user/repository/
onboarding/      — OnboardingController, OnboardingService
discovery/       — DiscoveryController, DiscoveryService
  discovery/entity/   — DiscoveryPreferences (moved here from user/ in Step 1.5)
actions/         — ActionsController, SwipeService, DailyLimitsService
messaging/       — MessagingController, MessagingService
  messaging/entity/   — Match, Message
  messaging/repository/
safety/          — SafetyController, BlockService
  safety/entity/      — UserReport
  safety/repository/
verification/    — VerificationController, VerificationService
  verification/entity/     — UserVerification
  verification/repository/
notifications/   — NotificationDispatcher, ExpoPushClient
moderation/      — ModerationController, PhotoModerationService, MessageModerationJob
  moderation/entity/   — ProfilePrompt, ProfilePromptTranslation, ProfilePromptAnswer
  moderation/repository/
payments/        — PaymentWebhookController, PaymentService, SubscriptionReconciliationJob
  payments/entity/    — SubscriptionPlan, UserSubscription, Transaction, ActiveBoost
  payments/repository/
admin/           — AdminController
storage/         — SupabaseStorageService
```

---

### Task D — Create `application.yml`

Replace or create `src/main/resources/application.yml` with this content. All values come from environment variables — no hardcoded secrets:

```yaml
server:
  port: 8080

spring:
  datasource:
    url: ${SUPABASE_DB_URL}
    username: postgres
    password: ${SUPABASE_DB_PASSWORD}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: false
    validate-on-migrate: true
  security:
    oauth2:
      resourceserver:
        jwt:
          jwk-set-uri: ${SUPABASE_JWKS_URL}
  cache:
    type: caffeine
    caffeine:
      spec: maximumSize=10000

supabase:
  url: ${SUPABASE_URL}
  service-role-key: ${SUPABASE_SERVICE_ROLE_KEY}

app:
  cache:
    user-status-ttl-seconds: 60
    subscription-features-ttl-seconds: 300
  internal:
    webhook-secret: ${INTERNAL_WEBHOOK_SECRET}
```

**Key config notes:**
- `open-in-view: false` is mandatory — this is a stateless API, there are no web views
- `flyway.baseline-on-migrate: false` — Flyway must not baseline an existing production schema; migrations start from V1
- The `app.internal.webhook-secret` property is used by the photo moderation webhook handler (Step 10)

---

### Task E — Create `application-local.yml`

Create `src/main/resources/application-local.yml` and add it to `.gitignore`. This file holds placeholder values for local development only:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://<your-supabase-host>:5432/postgres
    username: postgres
    password: <your-db-password>

supabase:
  url: https://<your-project-ref>.supabase.co
  service-role-key: <your-service-role-key>

app:
  internal:
    webhook-secret: local-dev-secret
```

Add to `.gitignore`:
```
application-local.yml
```

---

### Task F — Create `RestClientConfig.java`

Create `config/RestClientConfig.java`. This is a **blocking** `RestClient` bean — not reactive `WebClient`. All external HTTP calls (Expo Push API, Supabase Storage REST API) use this bean:

```java
package com.qaliye.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Bean
    public RestClient restClient(RestClient.Builder builder) {
        return builder.build();
    }
}
```

**Do NOT:**
- Create a `WebClient` bean or import `org.springframework.web.reactive.function.client.WebClient`
- Use `Mono`, `Flux`, or any reactive type
- Mix reactive and blocking patterns in the same application

---

**Do NOT:**
- Hardcode any credentials, URLs, or secrets in any source file
- Add Thymeleaf, Freemarker, or any web view technology
- Set `ddl-auto` to anything other than `validate` — the schema is managed by Supabase and migrations only

**Deliverables:**
- `pom.xml` with the 3 new runtime dependencies added and test dependencies corrected
- `RestClientConfig.java` created in `config/`
- All package directories created with `package-info.java`
- `application.yml` with all required config keys
- `application-local.yml` created and gitignored
- `mvn compile` succeeds with no errors

---

## Step 1.5 — JPA Entities & Spring Data Repositories

**Context files:** `docs/schema.sql` (full file), `docs/implementation_guide.md` (Section 3)

**Prompt:**

Create JPA entity classes and Spring Data JPA repositories for all tables in `docs/schema.sql`. This step must be completed before any service or controller is implemented — all subsequent steps depend on these types.

---

### Mapping strategy

**Three field types require special attention:**

| Schema type | Java mapping | Annotation |
|---|---|---|
| `UUID` primary key (server-assigned) | `UUID` | `@Id @Column(name = "id", updatable = false, nullable = false)` |
| `JSONB` | `String` (raw JSON) | `@Column(columnDefinition = "jsonb") @JdbcTypeCode(SqlTypes.JSON)` |
| `TEXT[]` | `String[]` | `@Column(columnDefinition = "text[]") @JdbcTypeCode(SqlTypes.ARRAY)` |
| `GEOGRAPHY(Point, 4326)` | **Do NOT map** — leave out of entity | Use raw JDBC for all spatial queries |

**All string-constrained enum columns** (`status`, `role`, `action_type`, etc.) must be mapped as `String` fields — do NOT use Java enums in entities. The check constraints are enforced by the database.

**All `created_at` / `updated_at` columns**: use `@Column(name = "created_at", updatable = false)` and `@Column(name = "updated_at")` with `OffsetDateTime`. Do NOT use `@CreationTimestamp` / `@UpdateTimestamp` — the DB trigger handles these.

All entities go in package `com.qaliye.backend.<module>.entity`.

---

### Entities

#### `AppUser` — `com.qaliye.backend.user.entity`

```java
@Entity
@Table(name = "app_users")
public class AppUser {
    @Id
    @Column(updatable = false, nullable = false)
    private UUID id; // matches auth.users(id) — never generated by Spring

    @Column(nullable = false)
    private String status; // 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'

    @Column(nullable = false)
    private String role; // 'USER' | 'MODERATOR' | 'ADMIN'

    @Column(name = "preferred_language", nullable = false)
    private String preferredLanguage;

    @Column(name = "last_active_at")
    private OffsetDateTime lastActiveAt;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

#### `Profile` — `com.qaliye.backend.user.entity`

Shared-primary-key one-to-one with `AppUser`:

```java
@Entity
@Table(name = "profiles")
public class Profile {
    @Id
    @Column(name = "user_id")
    private UUID userId; // same value as AppUser.id — PK + FK

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private AppUser appUser;

    @Column(name = "address_id")
    private UUID addressId; // FK — do not map as @ManyToOne; use UUID only

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(nullable = false)
    private String gender; // 'MALE' | 'FEMALE' | 'OTHER'

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    private String bio;

    @Column(name = "height_cm")
    private Integer heightCm;

    @Column(name = "residency_type", nullable = false)
    private String residencyType; // 'ETHIOPIA' | 'ERITREA' | 'DIASPORA'

    private String ethnicity;
    private String nationality;
    private String religion;

    @Column(name = "education_level")
    private String educationLevel;

    private String occupation;

    @Column(name = "relationship_intention")
    private String relationshipIntention;

    @Column(name = "marital_status")
    private String maritalStatus;

    @Column(name = "has_children")
    private Boolean hasChildren;

    @Column(name = "wants_children")
    private Boolean wantsChildren;

    private Boolean smoking;
    private Boolean drinking;

    @Column(name = "is_visible", nullable = false)
    private Boolean isVisible;

    @Column(name = "is_onboarded", nullable = false)
    private Boolean isOnboarded;

    @Column(name = "is_verified", nullable = false)
    private Boolean isVerified;

    @Column(name = "profile_completion_score")
    private Integer profileCompletionScore;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

#### `Address` — `com.qaliye.backend.user.entity`

**Do NOT map `coords`** — spatial queries use raw JDBC.

```java
@Entity
@Table(name = "addresses")
public class Address {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "country_code", nullable = false)
    private String countryCode;

    @Column(name = "country_name", nullable = false)
    private String countryName;

    @Column(nullable = false)
    private String city;

    private String region;

    // coords GEOGRAPHY(Point, 4326) — NOT MAPPED — use NamedParameterJdbcTemplate for spatial queries

    @Column(name = "formatted_address")
    private String formattedAddress;

    @Column(name = "location_source", nullable = false)
    private String locationSource; // 'GPS' | 'MANUAL' | 'IP'

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

#### `ProfilePhoto` — `com.qaliye.backend.user.entity`

```java
@Entity
@Table(name = "profile_photos")
public class ProfilePhoto {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "image_url", nullable = false)
    private String imageUrl;

    @Column(name = "storage_path", nullable = false)
    private String storagePath;

    @Column(name = "photo_order", nullable = false)
    private Integer photoOrder;

    @Column(name = "is_primary", nullable = false)
    private Boolean isPrimary;

    @Column(name = "is_verified", nullable = false)
    private Boolean isVerified;

    @Column(name = "moderation_status", nullable = false)
    private String moderationStatus; // 'PENDING' | 'APPROVED' | 'REJECTED'

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

#### `DiscoveryPreferences` — `com.qaliye.backend.discovery.entity`

`preferred_residency_types TEXT[]` — maps to `String[]`:

```java
@Entity
@Table(name = "discovery_preferences")
public class DiscoveryPreferences {
    @Id
    @Column(name = "user_id")
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private AppUser appUser;

    @Column(name = "discovery_mode", nullable = false)
    private String discoveryMode; // 'STANDARD' | 'GLOBAL' | 'INCOGNITO'

    @Column(name = "preferred_residency_types", columnDefinition = "text[]")
    @JdbcTypeCode(SqlTypes.ARRAY)
    private String[] preferredResidencyTypes;

    @Column(name = "interested_in_gender", nullable = false)
    private String interestedInGender; // 'MALE' | 'FEMALE' | 'ALL'

    @Column(name = "min_age", nullable = false)
    private Integer minAge;

    @Column(name = "max_age", nullable = false)
    private Integer maxAge;

    @Column(name = "max_distance_km", nullable = false)
    private Integer maxDistanceKm;

    @Column(name = "open_to_long_distance", nullable = false)
    private Boolean openToLongDistance;

    @Column(name = "open_to_relocation", nullable = false)
    private Boolean openToRelocation;

    @Column(name = "show_verified_only", nullable = false)
    private Boolean showVerifiedOnly;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

#### `Match` — `com.qaliye.backend.messaging.entity`

```java
@Entity
@Table(name = "matches")
public class Match {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_one_id", nullable = false)
    private UUID userOneId; // always the lexicographically smaller UUID

    @Column(name = "user_two_id", nullable = false)
    private UUID userTwoId;

    @Column(nullable = false)
    private String status; // 'ACCEPTED' | 'UNMATCHED'

    @Column(name = "matched_at")
    private OffsetDateTime matchedAt;

    @Column(name = "unmatched_at")
    private OffsetDateTime unmatchedAt;

    @Column(name = "last_message_at")
    private OffsetDateTime lastMessageAt;

    @Column(name = "user_one_last_read_at")
    private OffsetDateTime userOneLastReadAt;

    @Column(name = "user_two_last_read_at")
    private OffsetDateTime userTwoLastReadAt;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

#### `Message` — `com.qaliye.backend.messaging.entity`

```java
@Entity
@Table(name = "messages")
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "match_id", nullable = false)
    private UUID matchId;

    @Column(name = "sender_user_id", nullable = false)
    private UUID senderUserId;

    @Column(name = "client_message_id")
    private UUID clientMessageId;

    @Column(name = "message_type", nullable = false)
    private String messageType; // 'TEXT' | 'IMAGE' | 'VOICE' | 'ICEBREAKER' | 'PROMPT_REPLY'

    private String body;

    @Column(name = "media_url")
    private String mediaUrl;

    @Column(name = "storage_path")
    private String storagePath;

    @Column(name = "moderation_status", nullable = false)
    private String moderationStatus; // 'PENDING' | 'APPROVED' | 'REJECTED_FLAGGED'

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @Column(name = "edited_at")
    private OffsetDateTime editedAt;

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;
}
```

#### `UserReport` — `com.qaliye.backend.safety.entity`

```java
@Entity
@Table(name = "user_reports")
public class UserReport {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "reporter_user_id")
    private UUID reporterUserId; // nullable (ON DELETE SET NULL)

    @Column(name = "reported_user_id", nullable = false)
    private UUID reportedUserId;

    @Column(name = "report_type", nullable = false)
    private String reportType;

    private String description;

    @Column(name = "related_message_id")
    private UUID relatedMessageId;

    @Column(nullable = false)
    private String status; // 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED_NO_ACTION' | 'RESOLVED_BANNED'

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}
```

#### `UserVerification` — `com.qaliye.backend.verification.entity`

Includes the four columns from the schema amendment (Step 9):

```java
@Entity
@Table(name = "user_verifications")
public class UserVerification {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "verification_type", nullable = false)
    private String verificationType; // 'SELFIE_MATCH' | 'GOVERNMENT_ID'

    @Column(nullable = false)
    private String status; // 'PENDING' | 'APPROVED' | 'REJECTED'

    private String provider; // 'MANUAL_ADMIN' for MVP

    @Column(name = "provider_reference_id")
    private String providerReferenceId;

    @Column(name = "storage_path")
    private String storagePath; // added by schema amendment

    @Column(name = "reviewed_by")
    private UUID reviewedBy; // added by schema amendment

    @Column(name = "rejection_reason")
    private String rejectionReason; // added by schema amendment

    @Column(columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String metadata; // added by schema amendment, stores '{}' for MVP

    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;
}
```

#### `NotificationDevice` — `com.qaliye.backend.notifications.entity`

```java
@Entity
@Table(name = "notification_devices")
public class NotificationDevice {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "device_token", nullable = false, unique = true)
    private String deviceToken;

    @Column(nullable = false)
    private String platform; // 'IOS' | 'ANDROID' | 'WEB'

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

#### `SubscriptionPlan` — `com.qaliye.backend.payments.entity`

```java
@Entity
@Table(name = "subscription_plans")
public class SubscriptionPlan {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "plan_code", nullable = false)
    private String planCode;

    @Column(name = "country_code", nullable = false)
    private String countryCode;

    @Column(name = "price_cents", nullable = false)
    private Integer priceCents;

    @Column(nullable = false)
    private String currency;

    @Column(name = "billing_interval", nullable = false)
    private String billingInterval; // 'WEEKLY' | 'MONTHLY' | 'YEARLY'

    @Column(columnDefinition = "jsonb", nullable = false)
    @JdbcTypeCode(SqlTypes.JSON)
    private String features; // parse manually in DailyLimitsService

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

#### `UserSubscription` — `com.qaliye.backend.payments.entity`

```java
@Entity
@Table(name = "user_subscriptions")
public class UserSubscription {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "plan_id", nullable = false)
    private UUID planId;

    @Column(nullable = false)
    private String provider;

    @Column(name = "provider_subscription_id", unique = true)
    private String providerSubscriptionId;

    @Column(nullable = false)
    private String status;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "current_period_start", nullable = false)
    private OffsetDateTime currentPeriodStart;

    @Column(name = "current_period_end", nullable = false)
    private OffsetDateTime currentPeriodEnd;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

#### `Transaction` — `com.qaliye.backend.payments.entity`

```java
@Entity
@Table(name = "transactions")
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "subscription_id")
    private UUID subscriptionId;

    @Column(name = "payment_purpose", nullable = false)
    private String paymentPurpose; // 'SUBSCRIPTION' | 'CONSUMABLE_PACK' | 'PROFILE_BOOST'

    @Column(name = "amount_cents", nullable = false)
    private Integer amountCents;

    @Column(nullable = false)
    private String currency;

    @Column(nullable = false)
    private String provider;

    @Column(name = "provider_transaction_id", unique = true)
    private String providerTransactionId;

    @Column(nullable = false)
    private String status; // 'PENDING' | 'COMPLETED' | 'FAILED' | 'MANUAL_REVIEW'

    @Column(name = "receipt_image_url")
    private String receiptImageUrl;

    @Column(name = "admin_notes")
    private String adminNotes;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

#### `ActiveBoost` — `com.qaliye.backend.payments.entity`

```java
@Entity
@Table(name = "active_boosts")
public class ActiveBoost {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "transaction_id")
    private UUID transactionId;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}
```

#### `ProfilePrompt` — `com.qaliye.backend.moderation.entity`

```java
@Entity
@Table(name = "profile_prompts")
public class ProfilePrompt {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "prompt_text", nullable = false)
    private String promptText;

    @Column(nullable = false)
    private String category;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

#### `ProfilePromptTranslation` — `com.qaliye.backend.moderation.entity`

Composite primary key `(prompt_id, locale)` — requires an `@Embeddable` ID class:

```java
@Embeddable
public class ProfilePromptTranslationId implements Serializable {
    @Column(name = "prompt_id")
    private UUID promptId;

    @Column(name = "locale")
    private String locale;
    // equals() and hashCode() required
}

@Entity
@Table(name = "profile_prompt_translations")
public class ProfilePromptTranslation {
    @EmbeddedId
    private ProfilePromptTranslationId id;

    @Column(name = "prompt_text", nullable = false)
    private String promptText;
}
```

#### `ProfilePromptAnswer` — `com.qaliye.backend.moderation.entity`

```java
@Entity
@Table(name = "profile_prompt_answers")
public class ProfilePromptAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "prompt_id", nullable = false)
    private UUID promptId;

    @Column(name = "answer_text", nullable = false)
    private String answerText;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
```

---

### Tables mapped with JDBC only (no JPA entity)

Create NO entity or repository for these — they are accessed exclusively via `NamedParameterJdbcTemplate`:

| Table | Reason |
|---|---|
| `user_discovery_actions` | High-write, `ON CONFLICT DO NOTHING`, complex EXISTS subqueries |
| `user_daily_limits` | Composite PK `(user_id, limit_date)`, requires `SELECT FOR UPDATE` row locking |
| `user_blocks` | Composite PK `(blocker_user_id, blocked_user_id)`, insert + select only |
| `payment_events` | Insert-only with `ON CONFLICT (provider_event_id) DO NOTHING` |
| `audit_log` | Insert-only, nullable `actor_user_id`, never queried by client |

---

### Spring Data JPA Repositories

Create one repository interface per entity under `com.qaliye.backend.<module>.repository`:

```java
// user/repository
public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByIdAndDeletedAtIsNull(UUID id);
}

public interface ProfileRepository extends JpaRepository<Profile, UUID> {
    Optional<Profile> findByUserId(UUID userId);
}

public interface ProfilePhotoRepository extends JpaRepository<ProfilePhoto, UUID> {
    List<ProfilePhoto> findByUserIdAndModerationStatus(UUID userId, String moderationStatus);
    int countByUserIdAndModerationStatus(UUID userId, String moderationStatus);
}

public interface DiscoveryPreferencesRepository extends JpaRepository<DiscoveryPreferences, UUID> {}

// messaging/repository
public interface MatchRepository extends JpaRepository<Match, UUID> {}
public interface MessageRepository extends JpaRepository<Message, UUID> {
    Optional<Message> findBySenderUserIdAndClientMessageId(UUID senderId, UUID clientMessageId);
}

// safety/repository
public interface UserReportRepository extends JpaRepository<UserReport, UUID> {}

// verification/repository
public interface UserVerificationRepository extends JpaRepository<UserVerification, UUID> {
    Optional<UserVerification> findFirstByUserIdAndStatus(UUID userId, String status);
    List<UserVerification> findByStatusOrderBySubmittedAtAsc(String status, Pageable pageable);
}

// notifications/repository
public interface NotificationDeviceRepository extends JpaRepository<NotificationDevice, UUID> {
    List<NotificationDevice> findByUserIdInAndIsActiveTrue(List<UUID> userIds);
    Optional<NotificationDevice> findByDeviceToken(String deviceToken);
}

// payments/repository
public interface SubscriptionPlanRepository extends JpaRepository<SubscriptionPlan, UUID> {
    Optional<SubscriptionPlan> findByPlanCodeAndCountryCode(String planCode, String countryCode);
}
public interface UserSubscriptionRepository extends JpaRepository<UserSubscription, UUID> {}
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {}
public interface ActiveBoostRepository extends JpaRepository<ActiveBoost, UUID> {}

// moderation/repository
public interface ProfilePromptRepository extends JpaRepository<ProfilePrompt, UUID> {
    List<ProfilePrompt> findByIsActiveTrue();
}
public interface ProfilePromptAnswerRepository extends JpaRepository<ProfilePromptAnswer, UUID> {}
```

---

### Required import

All entities need this import for JSONB and ARRAY type codes:
```java
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
```

Add Lombok `@Getter @Setter @NoArgsConstructor` on every entity class to avoid writing boilerplate accessors manually.

---

**Do NOT:**
- Map `addresses.coords` in any entity — no `Point` field anywhere
- Use Java `enum` types in entities — all status/type columns are `String`
- Add `@ManyToOne` / `@OneToMany` relationships between entities — use UUID FK fields only (prevents accidental N+1 queries and simplifies the JDBC/JPA boundary)
- Use `@CreationTimestamp` / `@UpdateTimestamp` — the database trigger owns these columns

**Deliverables:**
- All entity classes in their correct packages
- All repository interfaces
- `JDBC-only` note documented in a `README.md` inside the `common/` package
- Project compiles with `mvn compile` and `ddl-auto: validate` passes against a running Supabase Postgres instance

---

## Step 2 — Spring Security: OAuth2 Resource Server + Caller Identity

**Context files:** `docs/implementation_guide.md` (Section 6.2), `docs/schema.sql` (`app_users` table)

**Prompt:**

Implement Spring Security for the Qaliye backend. This is a **stateless** OAuth2 Resource Server. Supabase issues JWTs; the backend validates them using the Supabase project's JWKS endpoint.

**`config/SecurityConfig.java`:**

- `SessionCreationPolicy.STATELESS`
- CSRF disabled
- `permitAll()` only for `POST /api/v1/payments/webhooks/**` (these are authenticated by provider HMAC signature, not JWT)
- All other routes require authentication
- Configure `.oauth2ResourceServer(oauth2 -> oauth2.jwt(...))` pointing to `${SUPABASE_JWKS_URL}`
- The `JwtAuthenticationConverter` must extract NO roles from the JWT — roles come from `app_users.role` in the database, never from the JWT claims

**`common/CallerUtils.java`:**

Create a static utility class with:
```java
public static UUID callerId() {
    Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    return UUID.fromString(jwt.getSubject()); // sub == auth.uid() == app_users.id
}
```
This is the **only** authoritative way to get the caller's UUID. Every controller and service must use `CallerUtils.callerId()` — never trust a UUID supplied in the request body for the caller's own identity.

**`user/UserStatusService.java`:**

Using `NamedParameterJdbcTemplate`, implement:
```java
public record UserStatus(String status, String role) {}

public UserStatus getStatus(UUID userId) { ... }
```
- Query: `SELECT status, role FROM app_users WHERE id = :userId`
- Cache results with Caffeine for 60 seconds keyed by `userId`
- Returns `null` if no row found (user does not exist in `app_users`)

**`config/UserStatusFilter.java`** (a `OncePerRequestFilter`):

On every authenticated request (skip if unauthenticated, e.g. webhook routes):
1. Call `CallerUtils.callerId()`
2. Call `UserStatusService.getStatus(callerId)`
3. If `null` or `status` is `SUSPENDED` or `DEACTIVATED` → respond `403 Forbidden` with body `{"error": "account_suspended"}`
4. Store `UserStatus` in the request attribute `"callerStatus"` for downstream use

**`common/ApiError.java`:**

A simple record: `{ String error, String message, int status }`. Used for all error responses.

**`common/GlobalExceptionHandler.java`** (`@RestControllerAdvice`):

Handle:
- `org.springframework.security.access.AccessDeniedException` → `403`
- `org.springframework.web.bind.MethodArgumentNotValidException` → `400` with field errors
- `org.springframework.dao.DataIntegrityViolationException` → inspect cause: if `PSQLException` message contains `'Age Compliance Violation'` → `400 {"error":"age_violation","message":"User must be at least 18 years old"}`, else `409 {"error":"conflict"}`
- Generic `Exception` → `500 {"error":"internal_error"}`

**Do NOT:**
- Extract roles from the JWT
- Hardcode the JWKS URL — it must come from `application.yml` via `${SUPABASE_JWKS_URL}`
- Add any session or cookie logic

**Deliverables:**
- `SecurityConfig.java` — compiles, all routes except webhooks require JWT
- `CallerUtils.java`
- `UserStatusService.java` — Caffeine-cached JDBC query
- `UserStatusFilter.java` — registered as a filter before `UsernamePasswordAuthenticationFilter`
- `GlobalExceptionHandler.java`
- `ApiError.java`

---

## Step 3 — Onboarding Completion Endpoint

**Context files:** `docs/implementation_guide.md` (Section 3.3), `docs/schema.sql` (`profiles`, `app_users` tables)

**Prompt:**

Implement `POST /api/v1/onboarding/complete` in a new `onboarding/OnboardingController.java`.

This endpoint is called by the client once the user has finished the onboarding wizard and all required profile fields have been written to Supabase directly (display_name, date_of_birth, gender, residency_type, address_id). Spring Boot's job here is to:

1. Validate that the caller has a complete-enough profile to be onboarded. Query `profiles` — `404` if not found.
2. Require these fields are non-null: `display_name`, `date_of_birth`, `gender`, `residency_type`, `address_id`. If any are missing → `400 {"error":"incomplete_profile","missing":["field_name",...]}`.
3. Compute `profile_completion_score` (0–100):
   - `display_name` present: +20
   - `bio` present and length ≥ 20: +15
   - `date_of_birth` present: +10
   - `residency_type` present: +10
   - `address_id` present: +10
   - `height_cm` present: +5
   - `religion` present: +5
   - `education_level` present: +5
   - `relationship_intention` present: +5
   - At least one `profile_photos` row with `moderation_status = 'APPROVED'`: +15
   - Score capped at 100
4. Set `interested_in_gender` automatically in `discovery_preferences`:
   - `profiles.gender = 'MALE'` → set `interested_in_gender = 'FEMALE'`
   - `profiles.gender = 'FEMALE'` → set `interested_in_gender = 'MALE'`
   - `profiles.gender = 'OTHER'` → leave as-is (do not overwrite)
5. Execute in a single transaction:
   ```sql
   UPDATE profiles
   SET is_onboarded = TRUE, profile_completion_score = :score
   WHERE user_id = :callerId;

   UPDATE discovery_preferences
   SET interested_in_gender = :gender
   WHERE user_id = :callerId;
   ```
6. Return `200 {"is_onboarded": true, "profile_completion_score": <score>}`

**Do NOT:**
- Let the client set `is_onboarded` or `profile_completion_score` directly
- Allow same-gender discovery: the gender assignment in step 4 is mandatory for MALE/FEMALE users
- Write to any table other than `profiles` and `discovery_preferences`

**Deliverables:**
- `onboarding/OnboardingController.java`
- `onboarding/OnboardingService.java` — score computation + transactional update via `JdbcTemplate`

---

## Step 4 — Discovery Engine

**Context files:** `docs/implementation_guide.md` (Section 6.4), `docs/schema.sql` (`profiles`, `discovery_preferences`, `addresses`, `profile_photos`, `user_discovery_actions`, `user_blocks`, `active_boosts`)

**Prompt:**

Implement `GET /api/v1/discovery/cards?cursor=<base64-offset>&limit=20` in `discovery/DiscoveryController.java`.

The caller's UUID comes from `CallerUtils.callerId()`. Use `NamedParameterJdbcTemplate` for the main query (not JPA — PostGIS functions are not supported by standard JPQL).

**Step A — Load caller context:**
```sql
SELECT
    p.gender,
    p.address_id,
    a.coords,
    dp.discovery_mode,
    dp.interested_in_gender,
    dp.min_age,
    dp.max_age,
    dp.max_distance_km,
    dp.preferred_residency_types,
    dp.show_verified_only
FROM profiles p
JOIN discovery_preferences dp ON dp.user_id = p.user_id
JOIN addresses a ON a.id = p.address_id
WHERE p.user_id = :callerId AND p.is_onboarded = TRUE AND p.is_visible = TRUE
```
If no row → `403 {"error":"profile_not_ready"}`.

**Step B — Compute parameters:**
- `isGlobal = discovery_mode = 'GLOBAL'`
- `maxDistanceMeters = max_distance_km * 1000`
- `minDobBound = CURRENT_DATE - min_age years` (oldest allowed birthday = youngest person)
- `maxDobBound = CURRENT_DATE - max_age years - 1 day` (youngest allowed birthday = oldest person)
- `genderFilter = interested_in_gender` (the value in DB, e.g. `'FEMALE'`)
- `offset = cursor == null ? 0 : Base64.decode(cursor) as int`
- `limit = min(limit, 50)` — cap at 50 regardless of what client sends
- `dailySalt = DATE_TRUNC('day', NOW())::text`

**Step C — Main candidate query:**
```sql
SELECT
    p.user_id,
    p.display_name,
    DATE_PART('year', AGE(p.date_of_birth))::int AS age,
    p.residency_type,
    p.profile_completion_score,
    p.is_verified,
    pp.image_url AS primary_photo_url,
    CASE WHEN :isGlobal THEN NULL
         ELSE ROUND((ST_Distance(ca.coords::geometry, ta.coords::geometry) / 1000.0)::numeric, 1)
    END AS distance_km,
    EXISTS (
        SELECT 1 FROM active_boosts ab
        WHERE ab.user_id = p.user_id AND ab.expires_at > NOW()
    ) AS is_boosted
FROM profiles p
JOIN discovery_preferences dp_target ON dp_target.user_id = p.user_id
JOIN addresses ta ON ta.id = p.address_id
JOIN addresses ca ON ca.id = :callerAddressId
LEFT JOIN profile_photos pp ON pp.user_id = p.user_id
    AND pp.is_primary = TRUE AND pp.moderation_status = 'APPROVED'
WHERE
    p.is_visible = TRUE AND p.is_onboarded = TRUE
    AND dp_target.discovery_mode <> 'INCOGNITO'
    AND (:genderFilter = 'ALL' OR p.gender = :genderFilter)
    AND p.date_of_birth BETWEEN :maxDobBound AND :minDobBound
    AND (COALESCE(ARRAY_LENGTH(:residencyFilter::text[], 1), 0) = 0
         OR p.residency_type = ANY(:residencyFilter::text[]))
    AND (:showVerifiedOnly = FALSE OR p.is_verified = TRUE)
    AND (:isGlobal = TRUE OR ST_DWithin(ta.coords, ca.coords, :maxDistanceMeters))
    AND p.user_id NOT IN (
        SELECT target_user_id FROM user_discovery_actions
        WHERE actor_user_id = :callerId
    )
    AND NOT EXISTS (
        SELECT 1 FROM user_blocks
        WHERE (blocker_user_id = :callerId AND blocked_user_id = p.user_id)
           OR (blocker_user_id = p.user_id AND blocked_user_id = :callerId)
    )
    AND p.user_id <> :callerId
ORDER BY
    is_boosted DESC,
    p.profile_completion_score DESC,
    MD5(p.user_id::text || :dailySalt)
LIMIT :limit OFFSET :offset
```

**Step D — Attach prompt answers:**
For each returned `user_id`, fetch at most 2 `profile_prompt_answers` joined with `profile_prompts` (using the caller's `preferred_language` to select from `profile_prompt_translations`, falling back to `profile_prompts.prompt_text`):
```sql
SELECT ppa.answer_text,
       COALESCE(ppt.prompt_text, pp_base.prompt_text) AS prompt_text
FROM profile_prompt_answers ppa
JOIN profile_prompts pp_base ON pp_base.id = ppa.prompt_id
LEFT JOIN profile_prompt_translations ppt
    ON ppt.prompt_id = ppa.prompt_id AND ppt.locale = :locale
WHERE ppa.user_id = ANY(:userIds)
ORDER BY ppa.user_id, ppa.created_at
```
Use a batch query for all cards at once (not N+1 queries per card).

**Step E — Response:**
```json
{
  "cards": [
    {
      "user_id": "uuid",
      "display_name": "string",
      "age": 27,
      "residency_type": "DIASPORA",
      "distance_km": 3.2,
      "is_verified": true,
      "is_boosted": false,
      "primary_photo_url": "https://...",
      "prompt_answers": [
        { "prompt_text": "...", "answer_text": "..." }
      ]
    }
  ],
  "next_cursor": "base64-encoded-offset or null if no more results"
}
```
`next_cursor` is `null` when fewer than `limit` results are returned.

**Do NOT:**
- Use JPA/JPQL for the spatial query — use `NamedParameterJdbcTemplate` with raw SQL
- Return users with `moderation_status != 'APPROVED'` primary photos — use `LEFT JOIN` so users with no approved primary photo still appear but with `primary_photo_url: null`
- Use `RANDOM()` without the daily salt — it breaks cursor pagination

**Deliverables:**
- `discovery/DiscoveryController.java`
- `discovery/DiscoveryService.java`
- `discovery/CardDto.java` (record)
- `discovery/PromptAnswerDto.java` (record)

---

## Step 5 — Daily Limits Service + Swipe/Rewind Endpoints

**Context files:** `docs/implementation_guide.md` (Section 6.5), `docs/schema.sql` (`user_discovery_actions`, `user_daily_limits`, `matches`, `user_subscriptions`, `subscription_plans`)

**Prompt:**

Implement `POST /api/v1/actions/swipe` and `POST /api/v1/actions/rewind`.

**`DailyLimitsService.java`:**

Implement a helper that fetches the caller's active subscription `features` JSONB and returns the tier limits. Cache per `userId` for 5 minutes.

Query for active subscription:
```sql
SELECT sp.features
FROM user_subscriptions us
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE us.user_id = :userId AND us.status = 'ACTIVE'
    AND us.current_period_end > NOW()
ORDER BY us.created_at DESC
LIMIT 1
```
If no active subscription → use the FREE plan defaults: `{ "likes_per_day": 10, "super_likes_per_day": 1, "rewinds_per_day": 0 }`.

Parse the JSONB `features` field into a `TierLimits` record: `int likesPerDay, int superLikesPerDay, int rewindsPerDay`.

**`POST /api/v1/actions/swipe`:**

Request body (validated with `@Valid`):
```json
{ "target_user_id": "uuid", "action_type": "LIKE" | "PASS" | "SUPERLIKE" }
```

Execute the following in a `@Transactional` block:
1. Reject `400` if `target_user_id == callerId`
2. Verify target profile exists: `SELECT 1 FROM profiles WHERE user_id = :targetId AND is_onboarded = TRUE AND is_visible = TRUE` — `404` if not found
3. `INSERT INTO user_daily_limits (user_id, limit_date) VALUES (:callerId, CURRENT_DATE) ON CONFLICT DO NOTHING`
4. `SELECT likes_used, super_likes_used FROM user_daily_limits WHERE user_id = :callerId AND limit_date = CURRENT_DATE FOR UPDATE`
5. Fetch `TierLimits` from `DailyLimitsService`
6. If `action_type = 'LIKE'` and `likes_used >= tier.likesPerDay` → `422 {"error":"daily_limit_reached","limit_type":"likes"}`
7. If `action_type = 'SUPERLIKE'` and `super_likes_used >= tier.superLikesPerDay` → `422 {"error":"daily_limit_reached","limit_type":"super_likes"}`
8. `INSERT INTO user_discovery_actions (actor_user_id, target_user_id, action_type) VALUES (:callerId, :targetId, :actionType) ON CONFLICT (actor_user_id, target_user_id) DO NOTHING`
9. If action type is `LIKE` or `SUPERLIKE`:
   - Increment `likes_used` or `super_likes_used` by 1
   - Check reciprocal: `SELECT id FROM user_discovery_actions WHERE actor_user_id = :targetId AND target_user_id = :callerId AND action_type IN ('LIKE','SUPERLIKE')`
   - If reciprocal found:
     - Compute canonical ordering: `userOneId = min(callerId, targetId)`, `userTwoId = max(callerId, targetId)` (UUID string comparison)
     - `INSERT INTO matches (user_one_id, user_two_id) VALUES (:userOneId, :userTwoId) ON CONFLICT (user_one_id, user_two_id) DO NOTHING RETURNING id`
     - If new match created: call `NotificationDispatcher.dispatchMatchNotification(callerId, targetId, matchId)` (implement stub in Step 8)
     - Return `200 {"matched": true, "match_id": "<uuid>"}`
   - If no reciprocal: return `200 {"matched": false}`
10. If action type is `PASS`: return `200 {"matched": false}`

**`POST /api/v1/actions/rewind`:**

No request body. `@Transactional`.
1. `SELECT ... FOR UPDATE` `user_daily_limits` for `CURRENT_DATE`
2. Fetch `TierLimits` — if `rewinds_used >= tier.rewindsPerDay` → `422 {"error":"daily_limit_reached","limit_type":"rewinds"}`
3. Fetch most recent action: `SELECT id, target_user_id FROM user_discovery_actions WHERE actor_user_id = :callerId ORDER BY created_at DESC LIMIT 1 FOR UPDATE` — `404` if none
4. Check this pair doesn't have an active match: `SELECT 1 FROM matches WHERE ((user_one_id = :callerId AND user_two_id = :targetId) OR (user_one_id = :targetId AND user_two_id = :callerId)) AND status = 'ACCEPTED'` — if found → `409 {"error":"matched_pair","message":"Cannot rewind a mutual match. Use unmatch instead."}`
5. `DELETE FROM user_discovery_actions WHERE id = :actionId`
6. `UPDATE user_daily_limits SET rewinds_used = rewinds_used + 1 WHERE user_id = :callerId AND limit_date = CURRENT_DATE`
7. Return `200 {"rewound_user_id": "<uuid>"}`

**Do NOT:**
- Increment the limit counter before the `INSERT` to `user_discovery_actions` — if the insert is a no-op (conflict), do not increment
- Skip the `FOR UPDATE` lock on `user_daily_limits` — concurrent swipes must not race
- Allow rewind to silently break a matched pair

**Deliverables:**
- `actions/ActionsController.java`
- `actions/SwipeService.java`
- `actions/SwipeRequest.java` (validated DTO)
- `actions/DailyLimitsService.java`
- `actions/TierLimits.java` (record)

---

## Step 6 — Messaging Gatekeeper

**Context files:** `docs/implementation_guide.md` (Section 6.6), `docs/schema.sql` (`matches`, `messages`, `user_blocks`)

**Prompt:**

Implement three messaging endpoints in `messaging/MessagingController.java`.

**`POST /api/v1/messages`:**

Request body (validated):
```json
{
  "match_id": "uuid",
  "client_message_id": "uuid",
  "message_type": "TEXT" | "IMAGE" | "VOICE" | "ICEBREAKER" | "PROMPT_REPLY",
  "body": "string (optional)",
  "media_url": "string (optional)"
}
```

`@Transactional`:
1. `SELECT id, user_one_id, user_two_id, status FROM matches WHERE id = :matchId` — `404` if not found
2. `403 {"error":"match_not_active"}` if `status != 'ACCEPTED'`
3. Check caller is a participant: `callerId == user_one_id || callerId == user_two_id` — `403 {"error":"not_participant"}` if not
4. Determine `recipientId = (callerId == user_one_id) ? user_two_id : user_one_id`
5. Block check: `SELECT 1 FROM user_blocks WHERE (blocker_user_id = :callerId AND blocked_user_id = :recipientId) OR (blocker_user_id = :recipientId AND blocked_user_id = :callerId)` — `403 {"error":"blocked"}` if found
6. Content validation: at least one of `body`, `media_url` must be non-null — `422 {"error":"no_content"}` if both null
7. Pre-moderation: check `body` (if present) with these regex patterns synchronously:
   - Phone numbers: `\b(\+?[\d\s\-().]{7,20})\b`
   - External platform handles: `\b@[A-Za-z0-9_.]{3,}\b` or mention of `whatsapp|telegram|instagram|snapchat|tiktok`
   - Money solicitation: `\b(send money|wire|western union|moneygram|gift card)\b` (case-insensitive)
   - If any match → set `moderation_status = 'PENDING'`, else `'APPROVED'`
8. Insert:
   ```sql
   INSERT INTO messages (match_id, sender_user_id, client_message_id, message_type, body, media_url, moderation_status)
   VALUES (:matchId, :callerId, :clientMessageId, :messageType, :body, :mediaUrl, :moderationStatus)
   ON CONFLICT (sender_user_id, client_message_id) DO NOTHING
   RETURNING id, match_id, sender_user_id, message_type, body, media_url, moderation_status, created_at
   ```
   If `ON CONFLICT` triggers (duplicate `client_message_id`) → return the existing row with `200` (not `201`) — idempotent retry.
9. `UPDATE matches SET last_message_at = NOW() WHERE id = :matchId`
10. If `moderation_status = 'APPROVED'` → call `NotificationDispatcher.dispatchMessageNotification(recipientId, matchId, callerDisplayName)` (stub from Step 8)
11. Return `201` with `MessageDto`

**`PATCH /api/v1/matches/{matchId}/read`** (`@Transactional`):
1. Fetch match, verify participant (same as messaging steps 1–3)
2. Determine which timestamp to update: `callerId == user_one_id` → `user_one_last_read_at`, else `user_two_last_read_at`
3. `UPDATE matches SET <column> = NOW() WHERE id = :matchId`
4. Return `204`

**`DELETE /api/v1/matches/{matchId}`** (unmatch, `@Transactional`):
1. Fetch match, verify participant
2. `UPDATE matches SET status = 'UNMATCHED', unmatched_at = NOW() WHERE id = :matchId AND status = 'ACCEPTED'`
3. If 0 rows updated → already unmatched → `200` (idempotent)
4. Return `204`

**`MessageDto`** record fields: `id`, `matchId`, `senderUserId`, `messageType`, `body`, `mediaUrl`, `moderationStatus`, `createdAt`

**Do NOT:**
- Let the client write to the `messages` table directly — this endpoint is the only write path
- Skip the block re-check in step 5 — a block may have been placed after the match was created
- Return `201` on a duplicate `client_message_id` — return `200` so the client knows it's a replay

**Deliverables:**
- `messaging/MessagingController.java`
- `messaging/MessagingService.java`
- `messaging/SendMessageRequest.java` (validated DTO)
- `messaging/MessageDto.java` (record)

---

## Step 7 — Safety: Block with Auto-Unmatch

**Context files:** `docs/implementation_guide.md` (Section 6.7), `docs/schema.sql` (`user_blocks`, `matches`, `audit_log`)

**Prompt:**

Implement `POST /api/v1/safety/block` in `safety/SafetyController.java`.

Request body: `{ "blocked_user_id": "uuid" }`

`@Transactional`:
1. `callerId = CallerUtils.callerId()`
2. `400 {"error":"self_block"}` if `blocked_user_id == callerId`
3. Verify blocked user exists: `SELECT 1 FROM app_users WHERE id = :blockedId` — `404` if not found
4. Insert block (the client has already inserted this row under RLS, but the backend must also handle it atomically from its own connection for the side-effect flow):
   ```sql
   INSERT INTO user_blocks (blocker_user_id, blocked_user_id)
   VALUES (:callerId, :blockedId)
   ON CONFLICT (blocker_user_id, blocked_user_id) DO NOTHING
   ```
5. Auto-unmatch: find and unmatch any active match between the two users:
   ```sql
   UPDATE matches
   SET status = 'UNMATCHED', unmatched_at = NOW()
   WHERE status = 'ACCEPTED'
     AND ((user_one_id = :callerId AND user_two_id = :blockedId)
      OR  (user_one_id = :blockedId AND user_two_id = :callerId))
   RETURNING id
   ```
6. Write `audit_log`:
   ```sql
   INSERT INTO audit_log (actor_user_id, action, target_table, target_id, details)
   VALUES (:callerId, 'USER_BLOCK', 'app_users', :blockedId,
           '{"auto_unmatched": <true|false>}'::jsonb)
   ```
7. Return `204`

**Do NOT:**
- Require a match to exist before proceeding — blocking works even if users have never matched
- Skip the `audit_log` write — all safety actions must be auditable

**Deliverables:**
- `safety/SafetyController.java`
- `safety/BlockService.java`
- `safety/BlockRequest.java` (DTO)

---

## Step 8 — Notification Dispatcher (Expo Push API)

**Context files:** `docs/implementation_guide.md` (Section 6.10), `docs/schema.sql` (`notification_devices`, `app_users`)

**Prompt:**

Implement `notifications/NotificationDispatcher.java` and `notifications/ExpoPushClient.java`. This service is called internally by other services — it has no HTTP endpoints.

**`ExpoPushClient.java`:**

A `@Service` using `RestClient` pointing to `https://exp.host/--/api/v2/push`. Use the `RestClient` bean from `RestClientConfig`:

```java
public record PushMessage(String to, String title, String body, Map<String, Object> data) {}
public record PushResponse(String status, String id, PushError details) {}
public record PushError(String error, String message) {}

public void sendBatch(List<PushMessage> messages) {
    // POST /send with List<PushMessage> as JSON body
    // Parse response array
    // For any response where details.error == "DeviceNotRegistered":
    //   UPDATE notification_devices SET is_active = FALSE WHERE device_token = <to>
}
```

**`NotificationDispatcher.java`:**

Implement these methods:

**`dispatchMatchNotification(UUID userOneId, UUID userTwoId, UUID matchId)`:**
1. Query active device tokens for both users:
   ```sql
   SELECT nd.device_token, au.preferred_language, nd.user_id
   FROM notification_devices nd
   JOIN app_users au ON au.id = nd.user_id
   WHERE nd.user_id IN (:userOneId, :userTwoId) AND nd.is_active = TRUE
   ```
2. Build localized title and body per user's `preferred_language`:
   - `en`: title = `"It's a Match! 🎉"`, body = `"You've got a new match!"`
   - `am`: title = `"ተዛምዷል! 🎉"`, body = `"አዲስ ጓደኛ አግኝተዋል!"`
   - `ti`: title = `"ተዛሚዱ! 🎉"`, body = `"ሓዲሽ ተዛሚድካ/ኪ!"`
   - `om`: title = `"Walitti bu'an! 🎉"`, body = `"Hiriyaa haaraa argatte!"`
3. data payload: `{ "type": "MATCH", "match_id": matchId.toString() }`
4. Send via `ExpoPushClient.sendBatch(...)`

**`dispatchMessageNotification(UUID recipientId, UUID matchId, String senderDisplayName)`:**
1. Query recipient's active device tokens + `preferred_language`
2. Localized body: `en` = `"New message from <name>"`, `am` = `"ከ<name> አዲስ መልዕክት"`, `ti` = `"ሓዱሽ መልኽቲ ካብ <name>"`, `om` = `"<name> irraa ergaa haaraa"`
3. data: `{ "type": "NEW_MESSAGE", "match_id": matchId.toString() }`
4. Send batch

**`dispatchVerificationApprovedNotification(UUID userId)`:**
1. Localized: `en` = `"Verified! ✓"` / `"Your profile is now verified."`, same pattern for other locales
2. data: `{ "type": "VERIFICATION_APPROVED" }`

**`dispatchVerificationRejectedNotification(UUID userId, String rejectionReason)`:**
1. Localized title: `"Verification unsuccessful"` (en), body = `rejectionReason`
2. data: `{ "type": "VERIFICATION_REJECTED" }`

All dispatch methods must be **non-blocking from the caller's perspective** — annotate with `@Async` and configure a `TaskExecutor` bean with a bounded thread pool (core=2, max=10, queue=100).

**Do NOT:**
- Block the swipe/message HTTP response thread waiting for push delivery
- Throw exceptions from `sendBatch` that could roll back the parent transaction — catch and log push errors internally

**Deliverables:**
- `notifications/NotificationDispatcher.java`
- `notifications/ExpoPushClient.java`
- `config/AsyncConfig.java` — `@EnableAsync` + `ThreadPoolTaskExecutor` bean

---

## Step 9 — Verification Service (MVP: Manual Admin Review)

**Context files:** `docs/implementation_guide.md` (Section 6.8), `docs/schema.sql` (`user_verifications`, `profile_photos`, `profiles`, `audit_log`)

**Prompt:**

Implement the MVP verification flow. **No third-party KYC provider. No automated liveness. No webhook from external services.** A moderator manually reviews the selfie.

First, apply the schema amendment (create a Flyway or Liquibase migration, or plain SQL migration file):
```sql
ALTER TABLE user_verifications
  ADD COLUMN IF NOT EXISTS storage_path       TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by        UUID REFERENCES app_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason   TEXT,
  ADD COLUMN IF NOT EXISTS metadata           JSONB DEFAULT '{}';
```

**`POST /api/v1/verification/submit`** (JWT required):

Request body: `{ "storage_path": "string" }` — the path in the `verification-selfies` Supabase Storage bucket.

`@Transactional`:
1. `callerId = CallerUtils.callerId()` — status check already done by `UserStatusFilter`
2. **Approved photo check:**
   ```sql
   SELECT COUNT(*) FROM profile_photos
   WHERE user_id = :callerId AND moderation_status = 'APPROVED'
   ```
   If count = 0 → `400 {"error":"no_approved_photo","message":"You must have at least one approved profile photo before submitting for verification."}`
3. **Pending check:**
   ```sql
   SELECT id FROM user_verifications
   WHERE user_id = :callerId AND status = 'PENDING' LIMIT 1
   ```
   If found → `409 {"error":"verification_pending","message":"A verification request is already under review."}`
4. Insert:
   ```sql
   INSERT INTO user_verifications
     (user_id, verification_type, provider, storage_path, status, metadata)
   VALUES
     (:callerId, 'SELFIE_MATCH', 'MANUAL_ADMIN', :storagePath, 'PENDING', '{}')
   RETURNING id
   ```
5. Write `audit_log` (action = `'VERIFICATION_SUBMITTED'`, target_table = `'user_verifications'`, target_id = new `id`)
6. Return `200 {"verification_id": "<uuid>", "status": "PENDING"}`

**`GET /api/v1/admin/verification/queue?status=PENDING`** (MODERATOR/ADMIN role required):

Role check: load caller's role from `UserStatusService.getStatus(callerId).role()` — `403` if not `MODERATOR` or `ADMIN`.

1. Fetch pending records:
   ```sql
   SELECT uv.id, uv.user_id, uv.storage_path, uv.submitted_at,
          p.display_name
   FROM user_verifications uv
   JOIN profiles p ON p.user_id = uv.user_id
   WHERE uv.status = :status
   ORDER BY uv.submitted_at ASC
   LIMIT 50
   ```
2. For each record, generate a **signed URL** for the selfie via Supabase Storage REST API (using `SupabaseStorageService`):
   - `POST {SUPABASE_URL}/storage/v1/object/sign/verification-selfies/{storagePath}` with body `{"expiresIn": 600}`
   - Header: `Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}`
   - Extract `signedUrl` from response
3. For each record, fetch approved profile photo URLs:
   ```sql
   SELECT image_url FROM profile_photos
   WHERE user_id = :userId AND moderation_status = 'APPROVED'
   ORDER BY photo_order ASC LIMIT 6
   ```
4. Return:
   ```json
   {
     "items": [{
       "verification_id": "uuid",
       "user_id": "uuid",
       "display_name": "string",
       "submitted_at": "ISO8601",
       "selfie_signed_url": "https://...",
       "approved_photo_urls": ["https://..."]
     }]
   }
   ```

**`PATCH /api/v1/admin/verification/{verificationId}`** (MODERATOR/ADMIN role required):

Request body: `{ "decision": "APPROVED" | "REJECTED", "rejection_reason": "string (required if REJECTED)" }`

`@Transactional`:
1. Role check (same as above)
2. `SELECT id, user_id, status FROM user_verifications WHERE id = :verificationId FOR UPDATE` — `404` if not found
3. `400 {"error":"already_reviewed"}` if current `status != 'PENDING'`
4. Validate: if `decision = 'REJECTED'` and `rejection_reason` is blank → `400 {"error":"reason_required"}`
5. Update:
   ```sql
   UPDATE user_verifications
   SET status = :decision,
       reviewed_by = :moderatorId,
       reviewed_at = NOW(),
       rejection_reason = :rejectionReason
   WHERE id = :verificationId
   ```
6. If `APPROVED`:
   ```sql
   UPDATE profiles SET is_verified = TRUE WHERE user_id = :targetUserId
   ```
   Call `NotificationDispatcher.dispatchVerificationApprovedNotification(targetUserId)`
7. If `REJECTED`:
   Call `NotificationDispatcher.dispatchVerificationRejectedNotification(targetUserId, rejectionReason)`
8. Write `audit_log` (action = `'VERIFICATION_REVIEWED'`, actor = moderatorId, target_table = `'user_verifications'`, target_id = verificationId, details = `{"decision": ..., "rejection_reason": ...}`)
9. Return `200 {"verification_id": ..., "status": ...}`

**`SupabaseStorageService.java`** (extend from scaffold in Step 1):

Add method:
```java
public String generateSignedUrl(String bucket, String path, int expiresInSeconds) {
    // POST {supabaseUrl}/storage/v1/object/sign/{bucket}/{path}
    // body: { "expiresIn": expiresInSeconds }
    // Returns signedUrl field from response JSON
}
```

**Do NOT:**
- Expose `storage_path` or the raw selfie URL to non-moderator API responses
- Allow re-review of an already `APPROVED` or `REJECTED` record
- Call any third-party liveness or KYC API

**Deliverables:**
- `verification/VerificationController.java`
- `verification/VerificationService.java`
- `verification/SubmitVerificationRequest.java`
- `verification/ReviewVerificationRequest.java`
- `verification/VerificationQueueItemDto.java`
- `storage/SupabaseStorageService.java` — with `generateSignedUrl` method
- SQL migration file: adds `storage_path`, `reviewed_by`, `rejection_reason`, `metadata` to `user_verifications`

---

## Step 10 — Photo Moderation Pipeline

**Context files:** `docs/implementation_guide.md` (Section 6.11a), `docs/schema.sql` (`profile_photos`)

**Prompt:**

Implement the photo moderation webhook handler. This endpoint is called by a **Supabase Database Webhook** when a new row is inserted into `profile_photos` with `moderation_status = 'PENDING'`.

**`POST /api/v1/internal/moderation/photo`** (no JWT — internal webhook):

This route must be secured with a shared secret header, not JWT. Add to `SecurityConfig.java`:
```java
.requestMatchers("/api/v1/internal/**").permitAll()
```
Then in the handler, validate a `X-Webhook-Secret` header matches `${INTERNAL_WEBHOOK_SECRET}` env var. Return `401` if invalid.

Request body (sent by Supabase Database Webhook for `INSERT` events on `profile_photos`):
```json
{
  "type": "INSERT",
  "record": {
    "id": "uuid",
    "user_id": "uuid",
    "storage_path": "string",
    "moderation_status": "PENDING"
  }
}
```

Handler logic (run asynchronously — respond `202 Accepted` immediately, process in background):
1. Return `202 Accepted` synchronously with an empty body
2. In a background thread (`@Async`):
   a. Validate `moderation_status == 'PENDING'` in the payload — ignore if already processed
   b. Download photo bytes via `SupabaseStorageService.downloadPhoto(storagePath)`
   c. Submit to a content-safety vision API. **For MVP, use a simple placeholder that auto-approves** — add a `TODO: integrate real content-safety API` comment. The method signature must be:
      ```java
      public ModerationResult moderateImage(byte[] imageBytes) {
          // TODO: Integrate content-safety vision API (e.g., AWS Rekognition, Azure Content Moderator)
          return ModerationResult.APPROVED; // Placeholder for MVP
      }
      ```
   d. Update the photo record:
      ```sql
      UPDATE profile_photos
      SET moderation_status = :result
      WHERE id = :photoId AND moderation_status = 'PENDING'
      ```
   e. Also update `profile_completion_score` by re-running the scoring logic from Step 3 for the affected `user_id` (call `OnboardingService.recomputeScore(userId)`)

**`ModerationResult.java`:** enum with `APPROVED`, `REJECTED`

**Do NOT:**
- Block the HTTP response thread on the moderation API call — always return `202` immediately
- Update `moderation_status` if it's no longer `'PENDING'` (another process may have already acted on it — the `AND moderation_status = 'PENDING'` guard prevents double-processing)
- Expose this endpoint on any authenticated/user-facing route

**Deliverables:**
- `moderation/ModerationController.java` — webhook handler
- `moderation/PhotoModerationService.java`
- `moderation/ModerationResult.java` (enum)
- `moderation/WebhookPayload.java` (DTO for Supabase webhook body)
- Updated `SecurityConfig.java` — `/api/v1/internal/**` permitted but secret-header validated in service

---

## Step 11 — Message Moderation Scheduled Job + Admin Moderation Queue

**Context files:** `docs/implementation_guide.md` (Section 6.11b, 6.11c), `docs/schema.sql` (`messages`, `user_reports`, `profile_photos`, `audit_log`)

**Prompt:**

Implement two things: the async message moderation scheduled job, and the admin moderation queue endpoints.

**`MessageModerationJob.java`** (`@Component` + Quartz `Job`):

Schedule to run every 15 minutes. Scan recently sent messages:
```sql
SELECT id, sender_user_id, match_id, body FROM messages
WHERE moderation_status = 'APPROVED'
  AND body IS NOT NULL
  AND created_at > NOW() - INTERVAL '1 hour'
LIMIT 200
```

For each message body, run the same regex checks as in Step 6 (phone numbers, external handles, money solicitation). If flagged:
1. `UPDATE messages SET moderation_status = 'REJECTED_FLAGGED' WHERE id = :messageId`
2. Insert auto-report:
   ```sql
   INSERT INTO user_reports (reporter_user_id, reported_user_id, report_type, related_message_id, description)
   VALUES (NULL, :senderUserId, 'AUTO_FLAGGED', :messageId, 'Automatically flagged by message moderation job')
   ```

**Admin moderation queue endpoints** in `moderation/ModerationController.java` (add to existing controller). All require MODERATOR or ADMIN role (use `UserStatusService` role check):

**`GET /api/v1/admin/moderation/photos?status=PENDING`:**
```sql
SELECT pp.id, pp.user_id, pp.image_url, pp.storage_path, pp.moderation_status,
       pp.created_at, p.display_name
FROM profile_photos pp
JOIN profiles p ON p.user_id = pp.user_id
WHERE pp.moderation_status = :status
ORDER BY pp.created_at ASC
LIMIT 100
```
Return list of `PhotoModerationItemDto`.

**`PATCH /api/v1/admin/moderation/photos/{photoId}`:**
Request: `{ "status": "APPROVED" | "REJECTED" }`. `@Transactional`:
1. `UPDATE profile_photos SET moderation_status = :status WHERE id = :photoId RETURNING user_id`
2. Re-run `OnboardingService.recomputeScore(userId)` to update `profile_completion_score`
3. Write `audit_log`
4. Return `200`

**`GET /api/v1/admin/moderation/reports?status=PENDING`:**
```sql
SELECT ur.id, ur.reporter_user_id, ur.reported_user_id, ur.report_type,
       ur.description, ur.related_message_id, ur.status, ur.created_at,
       p.display_name AS reported_display_name
FROM user_reports ur
JOIN profiles p ON p.user_id = ur.reported_user_id
WHERE ur.status = :status
ORDER BY ur.created_at ASC
LIMIT 100
```

**`PATCH /api/v1/admin/moderation/reports/{reportId}`:**
Request: `{ "resolution": "RESOLVED_NO_ACTION" | "RESOLVED_BANNED", "ban_reason"?: "string" }`. `@Transactional`:
1. `UPDATE user_reports SET status = :resolution, reviewed_by = :moderatorId, reviewed_at = NOW() WHERE id = :reportId`
2. If `resolution = 'RESOLVED_BANNED'`:
   - `UPDATE app_users SET status = 'SUSPENDED' WHERE id = :reportedUserId`
   - Evict the `UserStatusService` cache entry for `reportedUserId`
3. Write `audit_log`
4. Return `200`

**Quartz configuration** in `config/QuartzConfig.java`:
- Register `MessageModerationJob` with `SimpleTrigger` — every 15 minutes
- Use in-memory Quartz store (`org.quartz.jobStore.class=org.quartz.simpl.RAMJobStore`) for MVP — no persistent job store needed

**Do NOT:**
- Run the moderation job synchronously on the HTTP thread
- Skip evicting the `UserStatusService` cache when banning — the suspended user's next request must immediately get `403`

**Deliverables:**
- `moderation/MessageModerationJob.java`
- Updated `moderation/ModerationController.java` with all admin endpoints
- `moderation/PhotoModerationItemDto.java`
- `moderation/ReportItemDto.java`
- `config/QuartzConfig.java`

---

## Step 12 — Payment Webhook Receivers + Manual Payment Flow

**Context files:** `docs/implementation_guide.md` (Section 6.9), `docs/schema.sql` (`payment_events`, `transactions`, `user_subscriptions`, `subscription_plans`, `active_boosts`, `audit_log`)

**Prompt:**

Implement two payment flows: **(A) automatic webhook receivers** for Stripe and RevenueCat, and **(B) manual receipt upload + admin review** for local payment methods (Chapa, Telebirr, CBE Birr, bank transfer).

---

### Flow A — Automatic Webhook Receivers

**`POST /api/v1/payments/webhooks/{provider}`** in `payments/PaymentWebhookController.java`. This endpoint has NO JWT auth — it is secured by provider HMAC signature verification.

The `{provider}` path variable must match one of: `stripe`, `revenuecat`.

**Idempotency pattern (apply to ALL webhook events):**
1. Extract `provider_event_id` from provider payload
2. `INSERT INTO payment_events (provider, provider_event_id, event_type, raw_payload) VALUES (...) ON CONFLICT (provider_event_id) DO NOTHING`
3. If 0 rows inserted → duplicate delivery → return `200 OK` immediately (do nothing)
4. Otherwise process the event

**Per-provider signature verification:**

Implement a `PaymentSignatureVerifier` interface with a `verify(HttpServletRequest request, byte[] body)` method. Create implementations:

- `StripeSignatureVerifier` — validates `Stripe-Signature` header using HMAC-SHA256 and `${STRIPE_WEBHOOK_SECRET}`
- `RevenueCatSignatureVerifier` — validates `X-RevenueCat-Signature` header using HMAC-SHA256 and `${REVENUECAT_WEBHOOK_SECRET}`

Return `400 {"error":"invalid_signature"}` if signature fails.

**RevenueCat webhook processing:**

RevenueCat sends unified webhooks for all IAP events (App Store + Google Play). The `app_user_id` configured in RevenueCat **must equal** the user's UUID from `app_users.id`.

RevenueCat payload mapping:
- `event.type`: `INITIAL_PURCHASE` | `RENEWAL` | `CANCELLATION` | `EXPIRATION` | `BILLING_ISSUE` | `PRODUCT_CHANGE`
- `event.app_user_id` → `user_id` (UUID from `app_users.id`)
- `event.product_id` → lookup `plan_id` via `subscription_plans.plan_code`
- `event.expiration_at` → `current_period_end` (ISO 8601 timestamp)
- `event.store`: `"app_store"` → `provider = 'APPLE_APP_STORE'` | `"play_store"` → `provider = 'GOOGLE_PLAY'` | `"stripe"` → `provider = 'STRIPE'`
- `event.transaction_id` → `provider_transaction_id`
- `event.original_transaction_id` → stable `provider_subscription_id` for `ON CONFLICT` upsert

**RevenueCat event handlers (`@Transactional`):**

| Event type | Action |
|---|---|
| `INITIAL_PURCHASE` | `UPSERT user_subscriptions` (status = `ACTIVE`) |
| `RENEWAL` | Update `user_subscriptions.current_period_end` |
| `CANCELLATION` / `EXPIRATION` | `UPDATE user_subscriptions SET status = 'CANCELED'` |
| `BILLING_ISSUE` | `UPDATE user_subscriptions SET status = 'PAST_DUE'` |
| `PRODUCT_CHANGE` | Update `plan_id` and period dates |

**Stripe webhook processing:**

Handle Stripe events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`.
- Map `client_reference_id` or `customer` metadata to `user_id`
- Map `subscription` id to `provider_subscription_id`
- Upsert `user_subscriptions` on successful events

**Shared activation logic** (called after any successful subscription event):

```java
@Transactional
public void activateSubscription(UUID userId, UUID planId, String provider,
                                  String providerSubscriptionId,
                                  OffsetDateTime currentPeriodStart,
                                  OffsetDateTime currentPeriodEnd) {
    // 1. INSERT/UPDATE user_subscriptions (ON CONFLICT provider_subscription_id)
    // 2. If plan_code indicates a consumable pack or boost: insert active_boosts row
    // 3. Evict DailyLimitsService subscription features cache for userId
    // 4. Write audit_log (action = 'SUBSCRIPTION_ACTIVATED')
}
```

**Do NOT:**
- Process an event if signature verification fails — return `400` and do not write to `payment_events`
- Process a duplicate `provider_event_id` — the `ON CONFLICT DO NOTHING` + 0-rows check is the idempotency guard
- Create `transactions` rows for RevenueCat/Stripe webhook events — webhooks update subscriptions directly; `transactions` is only for manual payment flows and direct Stripe invoice records

---

### Flow B — Manual Receipt Upload + Admin Review

**`POST /api/v1/payments/manual`** (authenticated — caller's identity from JWT):

This endpoint is called by the client after the user has paid via a local method (Chapa, Telebirr, CBE Birr, bank transfer) and uploaded the receipt image to Supabase Storage.

Request body:
```json
{
  "provider": "CHAPA" | "TELEBIRR" | "CBE_BIRR" | "BANK_TRANSFER",
  "amount_cents": 250000,
  "currency": "ETB",
  "payment_purpose": "SUBSCRIPTION" | "PROFILE_BOOST",
  "plan_code": "premium_monthly_etb",
  "receipt_image_url": "https://..."
}
```

Validation rules:
- `403` if user is SUSPENDED/DEACTIVATED
- `400` if `provider` not in allowed set
- `400` if `payment_purpose = 'SUBSCRIPTION'` and `plan_code` is null or invalid
- `400` if `receipt_image_url` is null or not a valid URL

Backend action:
1. `SELECT id FROM subscription_plans WHERE plan_code = :planCode AND is_active = TRUE` — `404` if not found
2. `INSERT INTO transactions`:
   ```sql
   INSERT INTO transactions
     (user_id, payment_purpose, amount_cents, currency, provider,
      status, receipt_image_url)
   VALUES (:callerId, :paymentPurpose, :amountCents, :currency, :provider,
           'MANUAL_REVIEW', :receiptImageUrl)
   ```
3. Return `201 {"transaction_id": "<uuid>", "status": "MANUAL_REVIEW"}`

**`GET /api/v1/admin/transactions`** (ADMIN role only):

Query parameters:
- `status` — filter (default: `MANUAL_REVIEW`)
- `provider` — comma-separated list (default: `CHAPA,TELEBIRR,CBE_BIRR,BANK_TRANSFER`)
- `page` / `pageSize` — pagination

Response:
```json
{
  "items": [
    {
      "transaction_id": "...",
      "user_id": "...",
      "provider": "CHAPA",
      "amount_cents": 250000,
      "currency": "ETB",
      "payment_purpose": "SUBSCRIPTION",
      "plan_code": "premium_monthly_etb",
      "receipt_image_url": "https://...",
      "status": "MANUAL_REVIEW",
      "created_at": "...",
      "user_display_name": "..."
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

Join `profiles` to get `display_name` for each transaction's `user_id`.

**`PATCH /api/v1/admin/transactions/{transactionId}`** (ADMIN role only):

1. Role check — `403` if not `ADMIN`
2. `SELECT id, user_id, status, payment_purpose, plan_id FROM transactions WHERE id = :transactionId FOR UPDATE`
3. `400` if `status != 'MANUAL_REVIEW'`
4. Request body: `{ "status": "COMPLETED" | "FAILED", "admin_notes": "string" }`
5. `UPDATE transactions SET status = :status, admin_notes = :notes, updated_at = NOW() WHERE id = :transactionId`
6. If `COMPLETED`:
   - Look up `plan_id` from the transaction (or from `plan_code` if not stored)
   - Call `activateSubscription(...)` with the transaction's `user_id`, `plan_id`, `provider`
   - For `PROFILE_BOOST`: insert `active_boosts` row with `expires_at = NOW() + INTERVAL '30 minutes'`
7. Write `audit_log` (action = `'TRANSACTION_REVIEWED'`, actor = adminId, target_table = `'transactions'`, target_id = transactionId, details = `{"decision": "COMPLETED"/"FAILED", "admin_notes": ...}`)
8. Return `200 {"transaction_id": "...", "status": "COMPLETED" / "FAILED"}`

**Do NOT:**
- Allow `PATCH /admin/transactions` for non-`MANUAL_REVIEW` transactions
- Process manual transactions without an admin reviewing the receipt image first
- Accept manual payments without a `receipt_image_url`

**Deliverables:**
- `payments/PaymentWebhookController.java`
- `payments/PaymentService.java` — shared `activateSubscription()` + RevenueCat/Stripe event handlers
- `payments/PaymentSignatureVerifier.java` (interface)
- `payments/StripeSignatureVerifier.java`
- `payments/RevenueCatSignatureVerifier.java`
- `payments/ManualPaymentController.java` — `POST /api/v1/payments/manual`
- `payments/ManualPaymentRequest.java` (DTO)
- `payments/AdminPaymentController.java` — `GET /api/v1/admin/transactions` + `PATCH /api/v1/admin/transactions/{id}`
- `payments/AdminTransactionReviewRequest.java` (DTO)

---

## Step 13 — Subscription Reconciliation Scheduled Job

**Context files:** `docs/implementation_guide.md` (Section 6.9), `docs/schema.sql` (`user_subscriptions`)

**Prompt:**

Implement a daily Quartz job `payments/SubscriptionReconciliationJob.java`.

Schedule: once daily at 02:00 UTC.

Logic (`@Transactional`):
1. Find all subscriptions past their end date with a grace period:
   ```sql
   SELECT id, user_id, current_period_end
   FROM user_subscriptions
   WHERE status = 'ACTIVE'
     AND current_period_end < NOW() - INTERVAL '3 days'
   ```
2. For each: `UPDATE user_subscriptions SET status = 'CANCELED' WHERE id = :id`
3. Find subscriptions within the 3-day grace period:
   ```sql
   SELECT id, user_id FROM user_subscriptions
   WHERE status = 'ACTIVE'
     AND current_period_end < NOW()
     AND current_period_end >= NOW() - INTERVAL '3 days'
   ```
4. For each: `UPDATE user_subscriptions SET status = 'PAST_DUE' WHERE id = :id`
5. Evict `DailyLimitsService` subscription features cache for each affected `user_id`
6. Log a summary: `"Subscription reconciliation: {N} canceled, {M} past_due"`

Register in `QuartzConfig.java` with a `CronTrigger` for `0 0 2 * * ?` (daily at 02:00 UTC).

**Deliverables:**
- `payments/SubscriptionReconciliationJob.java`
- Updated `config/QuartzConfig.java`

---

## Step 14 — Data Deletion / Anonymization Job

**Context files:** `docs/implementation_guide.md` (Section 9, item 7), `docs/schema.sql` (`app_users`, `profiles`, `profile_photos`, `messages`)

**Prompt:**

Implement a weekly Quartz job `user/DataDeletionJob.java`.

Schedule: every Sunday at 03:00 UTC.

Find soft-deleted accounts past the 30-day grace period:
```sql
SELECT id FROM app_users
WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '30 days'
```

For each `userId` (`@Transactional` per user, not one big transaction):
1. Anonymize profile:
   ```sql
   UPDATE profiles SET
     display_name = 'Deleted User',
     bio = NULL,
     height_cm = NULL,
     ethnicity = NULL,
     nationality = NULL,
     religion = NULL,
     education_level = NULL,
     occupation = NULL,
     is_visible = FALSE
   WHERE user_id = :userId
   ```
2. Delete profile photos from Supabase Storage:
   - `SELECT storage_path FROM profile_photos WHERE user_id = :userId`
   - For each: call Supabase Storage REST API `DELETE /object/profile-photos/{storagePath}` (service-role)
   - `DELETE FROM profile_photos WHERE user_id = :userId`
3. Anonymize message bodies:
   ```sql
   UPDATE messages SET body = '[deleted]', media_url = NULL, storage_path = NULL
   WHERE sender_user_id = :userId
   ```
4. Write `audit_log` (action = `'ACCOUNT_ANONYMIZED'`, actor_user_id = NULL, target_table = `'app_users'`, target_id = userId)
5. Log: `"Anonymized account: {userId}"`

**`SupabaseStorageService.java`** — add method:
```java
public void deleteObject(String bucket, String storagePath) {
    // DELETE /storage/v1/object/{bucket}/{storagePath}
    // Use service-role key
    // Log warning on failure but do not throw — continue processing other files
}
```

**Do NOT:**
- Delete the `app_users` row — leave it as the audit anchor (the soft-delete flag `deleted_at` is the marker)
- Delete `messages` rows — only anonymize `body`, `media_url`, `storage_path` — leave the row shell so the other participant's conversation history is not broken
- Run all users in one transaction — process each user independently so a failure on one does not roll back others

**Deliverables:**
- `user/DataDeletionJob.java`
- Updated `storage/SupabaseStorageService.java` with `deleteObject` method
- Updated `config/QuartzConfig.java`

---

## Step 15 — Final Integration Check & Smoke Test Endpoints

**Context files:** `docs/implementation_guide.md` (Section 13 — Operational Pre-Launch Checklist)

**Prompt:**

Implement a health and self-check endpoint, then verify all integration points compile and run together.

**`GET /api/v1/health`** (no auth required):
```json
{
  "status": "UP",
  "database": "UP" | "DOWN",
  "supabase_storage": "UP" | "DOWN"
}
```
- Database check: `SELECT 1` via JDBC — `"UP"` if succeeds, `"DOWN"` if throws
- Storage check: `GET {SUPABASE_URL}/storage/v1/bucket` with service-role key — `"UP"` if 2xx, `"DOWN"` otherwise
- Return `200` if all `"UP"`, `503` if any `"DOWN"`

**Startup validation** (`@EventListener(ApplicationReadyEvent.class)`):

On startup, log the result of these checks:
- [ ] JWKS endpoint reachable: `GET ${SUPABASE_JWKS_URL}` — log URL and key count
- [ ] Database reachable: `SELECT current_database(), version()` — log DB name and PG version
- [ ] Required tables exist: query `information_schema.tables` for `app_users`, `profiles`, `matches`, `messages`, `user_verifications` — log any missing
- [ ] `user_verifications` has `storage_path` column: query `information_schema.columns` — log warning if missing (schema amendment not yet applied)
- [ ] `subscription_plans` has at least one row with `plan_code = 'FREE'` — log warning if missing (seed data not applied)

**Verify all controllers are registered** — create a `GET /api/v1/routes` endpoint (ADMIN only) that returns the list of all mapped request endpoints using `RequestMappingHandlerMapping`. Useful for debugging.

Run `mvn test` and fix any compilation errors. The project must produce a runnable JAR with `mvn package -DskipTests`.

**Do NOT:**
- Add any mock data or test fixtures to production code
- Leave any `TODO` comments without a corresponding GitHub issue reference format: `// TODO [#issue]: description`

**Deliverables:**
- `config/HealthController.java`
- `config/StartupValidator.java`
- Project compiles and produces a runnable JAR
- All 13 checklist items from Section 13 of the implementation guide can be manually verified against a running instance
