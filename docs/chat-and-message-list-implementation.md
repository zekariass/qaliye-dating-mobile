# React Native Expo Chat Feature — Frontend Implementation Specification

## 1. Scope

Replace all mock data used by the existing:

```text
Messages / inbox list screen
One-to-one chat screen
```

with real data from:

```text
Spring Boot chat REST API
Supabase Auth session
Supabase Realtime private channels
```

Implement frontend chat behavior only.

Do not query Supabase chat tables directly.

Do not use the Supabase service-role key in the mobile app.

Use the existing app folder structure, feature organization, API client conventions, state-management approach, secure storage abstraction, navigation setup, component library, testing conventions, and Supabase client instance.

Do not create a new top-level feature folder or reorganize unrelated code.

Add only the minimum chat-specific files needed, placing each beside the closest existing equivalent in the project.

Reuse existing:

```text
authenticated API client
Supabase session/token access
Supabase client
query cache or server-state library
local state-store pattern
secure local storage
navigation routes
loading, empty-state, error, and toast components
analytics and logging utilities
```

---

## 2. Backend integration rules

The Spring Boot backend is the durable source of truth for:

```text
inbox data
chat metadata
message history
message sending
delivery receipts
read receipts
mute settings
authorization
match state
```

Supabase Realtime is used only for:

```text
durable event notifications
typing indicators
Presence
```

The frontend must treat Realtime as a low-latency synchronization layer, not as the source of truth.

```text
REST is authoritative.
Realtime accelerates updates and signals invalidation.
Sequence numbers define server message order.
clientMessageId identifies an outgoing message before the server assigns a sequence number.
```

The frontend must correctly handle:

```text
duplicate Realtime events
out-of-order Realtime events
missed events while offline or backgrounded
network reconnects
token refreshes
optimistic send retries
match end while a thread is open
```

Never rely on a Realtime event alone to conclude that the local message list is complete.

---

## 3. API client and authentication

Use the existing authenticated API client.

For every request:

```text
1. Obtain the current Supabase access token.
2. Send Authorization: Bearer <access token>.
3. Use JSON request and response bodies.
4. Parse RFC 7807 problem-details responses on errors.
5. Map backend snake_case fields to frontend camelCase models.
```

Only the existing API/data-access layer should know backend wire-field casing.

Screens, hooks, stores, and UI components must use camelCase frontend models.

Example mapping:

```text
Backend wire field             Frontend model field
-------------------------------------------------------
match_id                       matchId
client_message_id              clientMessageId
sequence_number                sequenceNumber
sender_user_id                 senderUserId
message_type                   messageType
created_at                     createdAt
last_message_at                lastMessageAt
unread_count                   unreadCount
muted_until                    mutedUntil
up_to_sequence                 upToSequence
```

Use these backend endpoints:

```text
GET    /api/v1/chat/matches
GET    /api/v1/chat/matches/{matchId}
GET    /api/v1/chat/matches/{matchId}/messages
POST   /api/v1/chat/matches/{matchId}/messages
POST   /api/v1/chat/matches/{matchId}/receipts/delivered
POST   /api/v1/chat/matches/{matchId}/receipts/read
PATCH  /api/v1/chat/matches/{matchId}/notification-settings
```

---

## 4. Frontend chat models

Keep server delivery status separate from local send status.

```ts
type ServerDeliveryStatus = 'SENT' | 'DELIVERED' | 'READ';

type LocalSendStatus =
  | 'PENDING'
  | 'SENDING'
  | 'FAILED'
  | 'SENT';

type ChatMessage = {
  id?: string;
  clientMessageId: string;
  matchId: string;
  sequenceNumber?: number;
  senderUserId: string;
  isMine: boolean;
  messageType: 'TEXT' | 'ICEBREAKER' | 'PROMPT_REPLY';
  body: string;
  createdAt: string;
  editedAt: string | null;
  deliveryStatus?: ServerDeliveryStatus;
  localSendStatus?: LocalSendStatus;
  errorCode?: string;
};

type ReceiptState = {
  myLastDeliveredSequence: number;
  myLastReadSequence: number;
  participantLastDeliveredSequence: number;
  participantLastReadSequence: number;
};

type ChatThread = {
  matchId: string;
  status: 'ACTIVE' | 'ENDED';
  participant: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  receiptState: ReceiptState;
};

type InboxItem = {
  matchId: string;
  status: 'ACTIVE';
  participant: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  lastMessage: {
    id: string;
    sequenceNumber: number;
    senderUserId: string;
    messageType: 'TEXT' | 'ICEBREAKER' | 'PROMPT_REPLY';
    preview: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  mutedUntil: string | null;
  matchedAt: string;
  lastMessageAt: string | null;
};
```

Rules:

```text
sequenceNumber is absent only before a send has been accepted by the backend.

id is absent only before a send has been accepted by the backend.

deliveryStatus is server-derived. It must not be treated as a mutable local message field.

localSendStatus is frontend-only and must never be sent to the backend.
```

---

## 5. Inbox screen

Replace mock inbox data with:

```http
GET /api/v1/chat/matches?filter=ALL&limit=25
```

Use:

```http
GET /api/v1/chat/matches?filter=UNREAD&limit=25
```

when the unread filter is selected.

### Initial inbox loading

When the inbox screen becomes active:

```text
1. Fetch the first inbox page.
2. Show existing loading skeletons or loading UI.
3. Render returned items.
4. Preserve backend ordering exactly.
```

Backend ordering is:

```text
last_message_at DESC NULLS LAST
matched_at DESC
match_id DESC
```

Do not apply an additional client-side sort.

### Inbox pagination

When the user reaches the end of the loaded list:

```text
1. Read nextCursor from the previous response.
2. Fetch the next page with the same filter.
3. Append unique match IDs only.
4. Stop when nextCursor is null.
```

When switching between `ALL` and `UNREAD`:

```text
1. Clear the current page chain.
2. Fetch the first page for the new filter.
3. Do not reuse a cursor from the prior filter.
```

### Inbox row UI

Each row should show:

```text
participant avatar
participant display name
verified state
last-message preview
last-message timestamp
unread badge when unreadCount > 0
mute indicator while mutedUntil is in the future
```

Use only backend-provided signed avatar URLs.

Never build Supabase Storage paths or public URLs in the mobile app.

### Inbox Realtime subscription

While the app is authenticated and foregrounded, subscribe to:

```text
user:<currentUserId>:inbox
```

Create one personal inbox channel only.

Do not create an inbox channel for each match row.

Handle events as follows:

```text
inbox.match.updated
- Invalidate or refetch the current inbox query.
- Preserve the active ALL or UNREAD filter.
- Do not attempt to construct the full inbox row from the event payload.

inbox.match.removed
- Remove the match from currently cached inbox pages immediately.
- Invalidate or refetch the inbox query.
- If the same match is currently open, close the thread.
```

Inbox events are invalidation signals, not complete data records.

---

## 6. Opening a chat thread

When navigating to a one-to-one chat for `matchId`:

```text
1. Fetch chat metadata:
   GET /api/v1/chat/matches/{matchId}

2. Fetch the latest message page:
   GET /api/v1/chat/matches/{matchId}/messages?limit=50

3. Merge and display messages in ascending sequenceNumber order.

4. Open the required private Realtime channels.

5. Synchronize missed messages using afterSequence.

6. Begin delivery and read receipt scheduling after state is merged.
```

The no-cursor message request loads the most recent page.

The backend response is already ascending by sequence number. Preserve this logical ordering even if the existing list component uses inverted rendering.

### Empty thread

When a thread has no messages:

```text
show the normal empty-chat state;
allow the user to type and send;
do not fabricate an icebreaker or placeholder message;
do not mark any receipt.
```

### Loading older messages

When the user reaches older history:

```text
1. Find the lowest loaded server sequenceNumber.
2. Request:
   GET /api/v1/chat/matches/{matchId}/messages?beforeSequence=<lowest>&limit=50
3. Merge messages without duplicates.
4. Preserve the visible scroll position.
5. Stop requesting when hasMoreBefore is false.
```

Never use timestamps for history pagination.

### Synchronizing missed messages

Use:

```http
GET /api/v1/chat/matches/{matchId}/messages?afterSequence=<lastKnownSequence>&limit=100
```

Run forward synchronization:

```text
when a thread opens;
after the match event channel connects;
when the app returns to foreground;
after network recovery;
after Supabase Realtime reconnects;
when a Realtime event reveals a sequence gap;
when the app opens a thread from a push notification.
```

Repeat `afterSequence` requests until `hasMoreAfter` is false.

---

## 7. Message merge and ordering rules

Use message identity in this priority order:

```text
1. message ID
2. clientMessageId
3. matchId + sequenceNumber
```

Merge sources into one visible message record:

```text
optimistic local message
successful POST response
chat.message.created Realtime event
message-history REST response
afterSequence synchronization response
```

A message must appear once only.

After a server sequence number exists, sort durable messages by:

```text
sequenceNumber ascending
```

Unsent local messages without a sequence number should render after the latest durable message, ordered by local creation time.

When an optimistic message is reconciled:

```text
keep the same visual row;
replace local temporary fields with server id, sequenceNumber, createdAt, and deliveryStatus;
remove the temporary-only state once send succeeds.
```

---

## 8. Private Realtime channels

Open match channels only when all conditions are true:

```text
the chat screen is focused;
the app is foregrounded;
an authenticated Supabase session exists;
the thread is still active.
```

Subscribe to:

```text
match:<matchId>:events
match:<matchId>:typing
match:<matchId>:presence
```

The app may receive from all three.

The app may publish only to:

```text
match:<matchId>:typing
match:<matchId>:presence
```

The app must never publish to:

```text
match:<matchId>:events
user:<userId>:inbox
```

Before joining a private channel:

```text
1. Obtain the current Supabase access token.
2. Update the existing Supabase Realtime client token using the project’s supported method.
3. Subscribe to the private channel.
```

When the session refreshes:

```text
1. Update the Realtime authorization token.
2. Reconnect or resubscribe active channels as required.
3. Run REST synchronization after reconnect.
```

When the user leaves the chat screen, signs out, loses access, backgrounds the app, or the match ends:

```text
unsubscribe match events;
unsubscribe typing;
unsubscribe Presence;
clear typing state;
clear Presence state;
cancel pending receipt timers for that thread.
```

Keep the personal inbox channel active only while the app is authenticated and foregrounded.

---

## 9. Durable Realtime events

Each durable event includes:

```text
eventId
eventType
version
occurredAt
matchId
data
```

Maintain a bounded in-memory cache of recently processed `eventId` values.

Persisting this cache across restarts is optional. REST synchronization is the final correctness mechanism.

### `chat.message.created`

When receiving a message-created event:

```text
1. Verify that event.matchId belongs to the open thread.
2. Ignore the event if eventId has already been processed.
3. Upsert the message using ID, clientMessageId, and sequenceNumber.
4. Reconcile a matching optimistic message, if present.
5. Detect a sequence gap.
6. If a gap exists, run afterSequence synchronization.
7. Schedule a delivery receipt after the message has merged.
8. Schedule a read receipt only if the thread is focused and the message is actually visible.
```

A sequence gap exists when:

```text
received sequenceNumber > highestKnownSequence + 1
```

Do not assume a missing event will arrive eventually. Synchronize through REST.

### `chat.receipt.updated`

When receiving a receipt event:

```text
1. Ignore duplicate eventId.
2. Merge receipt values monotonically.
3. Update thread receipt state.
4. Recalculate delivery state for outgoing messages.
5. Do not send a receipt because a receipt event was received.
```

Do not permanently store a mutable read/delivery flag on every message.

Derive outgoing-message status from participant receipt state:

```text
SENT
participantLastDeliveredSequence < message.sequenceNumber

DELIVERED
participantLastDeliveredSequence >= message.sequenceNumber
participantLastReadSequence < message.sequenceNumber

READ
participantLastReadSequence >= message.sequenceNumber
```

Only display delivery state for messages sent by the authenticated user.

Recommended UI behavior:

```text
PENDING or SENDING
- small clock or sending indicator

FAILED
- visible warning state and Retry action

SENT
- subtle sent indication

DELIVERED
- delivered indication

READ
- distinct read indication
```

Avoid displaying detailed receipt text beneath every outgoing message. Show richer read state only on the latest applicable outgoing message.

### `chat.match.ended`

When receiving a match-ended event:

```text
1. Mark the local thread as ended.
2. Disable the composer immediately.
3. Stop typing and Presence.
4. Cancel queued send retries and scheduled receipt requests.
5. Unsubscribe all match channels.
6. Remove the match from inbox cache.
7. Invalidate the inbox query.
8. Navigate to inbox or show a neutral closed-chat state.
```

Do not reveal who blocked whom or who initiated an unmatch unless the product has explicitly approved that disclosure.

---

## 10. Optimistic send and idempotency

Every outgoing message must use a UUID v4:

```text
clientMessageId
```

Persist the outgoing message locally before the network request.

Use the existing secure local storage or persistence abstraction already used by the app.

Persist at minimum:

```text
matchId
clientMessageId
messageType
trimmed body
createdAt
retryCount
localSendStatus
```

### Send flow

```text
1. Trim and locally validate the body.
2. Generate a UUID v4 clientMessageId.
3. Persist the pending message locally.
4. Insert an optimistic message into the current thread.
5. Set localSendStatus to SENDING.
6. POST /api/v1/chat/matches/{matchId}/messages.
7. On HTTP 201 or 200:
   - merge returned server message;
   - assign id and sequenceNumber;
   - set localSendStatus to SENT;
   - retain the same visible bubble.
8. On network or transport failure:
   - set localSendStatus to FAILED;
   - keep the bubble;
   - allow manual retry using the same clientMessageId.
9. On a final backend validation failure:
   - set localSendStatus to FAILED;
   - show an appropriate user-safe message;
   - do not silently retry.
```

Request body:

```json
{
  "client_message_id": "uuid",
  "message_type": "TEXT",
  "body": "Hello!"
}
```

For the first release, the composer should send:

```text
message_type = TEXT
```

Support `ICEBREAKER` and `PROMPT_REPLY` only when the corresponding UI is implemented.

### Retry rules

Reuse the same `clientMessageId` when retrying after:

```text
offline network state;
request timeout;
interrupted connection;
retryable 5xx response;
user pressing Retry.
```

Never generate a new ID for a retry.

Do not automatically retry:

```text
401 UNAUTHORIZED
403 ACCOUNT_NOT_ACTIVE
403 MATCH_ACCESS_DENIED
403 USER_BLOCKED
404 MATCH_NOT_FOUND
409 MATCH_NOT_ACTIVE
409 IDEMPOTENCY_CONFLICT
422 INVALID_MESSAGE
422 INVALID_RECEIPT_SEQUENCE
429 RATE_LIMITED
```

For `429 RATE_LIMITED`:

```text
read Retry-After when provided;
temporarily disable sending for that duration;
show a user-safe rate-limit message.
```

For `409 IDEMPOTENCY_CONFLICT`:

```text
mark the local message as failed;
do not retry automatically;
do not send the same text again using a newly generated ID automatically.
```

---

## 11. Delivery receipt behavior

Delivery means the app has successfully received and merged messages into its local thread state.

Do not mark delivery merely because:

```text
the route opened;
a Realtime event arrived but was not merged;
the app is in background;
the user received a push notification;
the message exists only in an inbox preview.
```

Maintain per thread:

```text
highestMergedSequence
lastDeliveredReceiptSent
```

After initial load, forward sync, or message merge:

```text
1. Find the highest synchronized durable sequence.
2. If it exceeds myLastDeliveredSequence:
   POST /api/v1/chat/matches/{matchId}/receipts/delivered
   { "up_to_sequence": highestSynchronizedSequence }
3. Debounce the request briefly.
4. Send only the highest pending value.
5. Ignore lower scheduled values.
```

Never issue delivery receipts while the app is backgrounded.

The backend ignores lower receipt values, but the frontend should avoid redundant requests.

---

## 12. Read receipt behavior

Read means the user has actually viewed messages in a focused, active chat thread.

Maintain per thread:

```text
highestVisibleReadSequence
lastReadReceiptSent
```

Advance read only when all conditions are true:

```text
the chat route is focused;
the app is active;
the relevant message is visible in the message-list viewport;
the user has not navigated away;
the candidate sequence is greater than myLastReadSequence.
```

Recommended behavior:

```text
When the user is at or near the newest messages:
- mark the highest visible message sequence as read.

When the user scrolls to older history:
- do not advance read beyond messages actually viewed.

When the user returns to newer messages:
- advance to the highest visible sequence.

Debounce read updates briefly.
```

Request:

```json
{
  "up_to_sequence": 42
}
```

Endpoint:

```http
POST /api/v1/chat/matches/{matchId}/receipts/read
```

The backend also advances delivery when read is ahead.

Do not send an extra delivery request for the same sequence when the read request already covers it.

---

## 13. Typing indicators

Typing is ephemeral.

Do not store typing state in local durable storage, message history, analytics, or backend tables.

Use:

```text
match:<matchId>:typing
```

Suggested payload:

```json
{
  "is_typing": true
}
```

Send typing only when:

```text
chat screen is focused;
app is active;
match is active;
composer input is non-empty;
the user is actively entering text.
```

Recommended behavior:

```text
Send is_typing=true no more than once every 2–3 seconds while typing.

Send is_typing=false when:
- input becomes empty;
- a message is sent;
- composer loses focus;
- the user leaves the chat screen;
- the app backgrounds;
- the match ends.
```

On incoming typing events:

```text
is_typing=true
- show "<participant name> is typing…" beneath the message list;
- expire locally after about 5 seconds unless refreshed.

is_typing=false
- remove the indicator immediately.
```

Never send message content, draft content, cursor position, contact data, or device metadata through typing payloads.

---

## 14. Presence behavior

Use:

```text
match:<matchId>:presence
```

Presence is for the currently open chat thread only.

Publish minimal state, for example:

```json
{
  "state": "viewing_chat"
}
```

Do not use Presence as evidence that a user has read messages.

Do not show a globally accurate “online now” label based on match-channel Presence. It reflects only whether a participant is currently connected to that specific thread channel.

When the user leaves the thread or the app backgrounds:

```text
stop Presence tracking;
leave the Presence channel;
clear local Presence state.
```

---

## 15. App lifecycle and reconnect behavior

Use the existing React Native app-lifecycle handling based on `AppState`.

### When the app becomes inactive or backgrounds

```text
1. Publish typing false if possible.
2. Leave typing and Presence match channels.
3. Leave durable match event channel.
4. Pause delivery and read receipt scheduling.
5. Do not mark messages delivered or read.
6. Keep pending outgoing messages in local persistent storage.
```

### When the app returns to foreground

```text
1. Refresh or confirm Supabase session.
2. Update the Realtime authorization token.
3. Reconnect the personal inbox channel.
4. Invalidate or refresh the inbox.
5. If a chat thread is focused:
   - reconnect match channels;
   - fetch fresh chat metadata;
   - run afterSequence synchronization;
   - resume delivery receipt scheduling;
   - resume read scheduling only after visible messages are rendered.
```

### When the network recovers

```text
1. Retry eligible failed sends in original creation order.
2. Retain original clientMessageId values.
3. Reconnect active channels.
4. Synchronize the focused thread with afterSequence.
5. Refresh or invalidate inbox data.
```

Do not depend on background WebSocket delivery for correctness.

Push notifications may later alert the user to new messages, but opening a notification must still run normal REST synchronization.

---

## 16. Match-end and access-loss behavior

Treat these backend conditions as terminal for the active thread:

```text
MATCH_NOT_ACTIVE
MATCH_NOT_FOUND
MATCH_ACCESS_DENIED
USER_BLOCKED
chat.match.ended
inbox.match.removed
```

When any occurs:

```text
disable the composer;
cancel send retries;
cancel receipt timers;
stop typing;
stop Presence;
unsubscribe all match channels;
remove the thread from local inbox state;
invalidate inbox data;
navigate back to inbox or render a neutral unavailable-thread state.
```

Avoid exposing whether the other person blocked the user, unmatched, or was removed administratively.

Use neutral product language such as:

```text
“This conversation is no longer available.”
```

---

## 17. Error handling

Map backend error codes to frontend behavior:

```text
UNAUTHORIZED
- try normal session refresh when appropriate;
- otherwise return to authentication.

ACCOUNT_NOT_ACTIVE
- show account-unavailable state;
- disable all chat actions.

MATCH_NOT_FOUND
- show unavailable thread;
- remove local cached thread;
- return to inbox.

MATCH_ACCESS_DENIED
- show unavailable thread;
- remove cached thread;
- return to inbox.

MATCH_NOT_ACTIVE
- close the composer;
- unsubscribe channels;
- show a neutral closed-chat state;
- return to inbox.

USER_BLOCKED
- close composer;
- unsubscribe channels;
- remove thread from inbox;
- do not reveal blocker identity.

INVALID_MESSAGE
- show inline composer validation feedback.

IDEMPOTENCY_CONFLICT
- mark the pending message failed;
- do not retry automatically;
- show generic send failure UI.

RATE_LIMITED
- show rate-limit feedback;
- obey Retry-After;
- temporarily disable sending.
```

Never display raw backend problem `detail` text directly without approved product wording.

For observability, log only safe metadata:

```text
request ID
endpoint
HTTP status
problem code
match ID when safe
message ID when safe
```

Never log message bodies through analytics or error-reporting services.

---

## 18. Mute settings

Use:

```http
PATCH /api/v1/chat/matches/{matchId}/notification-settings
```

Request:

```json
{
  "muted_until": "2026-12-31T23:59:59Z"
}
```

To unmute:

```json
{
  "muted_until": null
}
```

Rules:

```text
show mute state only to the current user;
do not expose another participant’s mute state;
after update, update the local inbox item;
invalidate the affected inbox query if needed.
```

Mute controls notification behavior only.

Mute must not suppress:

```text
message synchronization;
receipt updates;
match-ended handling;
access-control behavior.
```

---

## 19. Existing-screen migration requirements

### Messages / inbox screen

Replace mock data with the existing app’s real data-fetching and pagination pattern.

Required states:

```text
initial loading
pull to refresh
loading next page
empty inbox
empty unread inbox
network error
match removed while visible
signed-out state
```

### One-to-one chat screen

Replace mock messages with real metadata, history, receipts, and Realtime subscriptions.

Required states:

```text
metadata loading
message history loading
empty conversation
older-message loading
sending
failed send and manual retry
offline state
typing indicator
Presence state
sent / delivered / read state
closed match
access denied
network recovery
```

The screen must never synthesize:

```text
fake delivery receipts
fake read receipts
fake online indicators
fake typing indicators
fake messages
```

---

## 20. Required frontend tests

Add tests using the project’s existing test framework and conventions.

Required coverage:

```text
Inbox first-page loading.
Inbox pagination.
Inbox filter switch resets cursor chain.
Inbox update event invalidates or refreshes data.
Inbox removal event removes a visible row.

Thread initial metadata and history load.
Older-message pagination with beforeSequence.
Reconnect synchronization with afterSequence.
Messages remain logically ordered by sequenceNumber.
Duplicate REST response and Realtime event result in one message bubble.
Out-of-order message event triggers synchronization.
Event ID deduplication.

Optimistic send inserts one local bubble.
Retry reuses the same clientMessageId.
Network failure leaves a retryable failed bubble.
Successful retry reconciles the existing bubble.
HTTP 200 idempotent response reconciles correctly.
Idempotency conflict does not create a duplicate bubble.

Delivery receipt batching.
Read receipt only after messages become visible.
Read receipt does not advance beyond viewed content.
Read request updates local delivered state.
Receipt events correctly derive SENT, DELIVERED, and READ.

Typing is throttled.
Typing expires locally.
Typing stops after send, input clear, blur, screen leave, and backgrounding.

Presence is cleared on leave and background.
Background state stops receipts and match subscriptions.
Foreground state reconnects and runs REST synchronization.
Match-ended event closes an active chat.
MATCH_NOT_ACTIVE response closes an active chat.
No direct Supabase table query exists in chat frontend code.
No service-role key or backend secret is present in mobile configuration.
```

---

## 21. Security requirements

The mobile app may contain:

```text
Supabase project URL
Supabase publishable or anon key
Spring Boot API base URL
```

The mobile app must never contain:

```text
SUPABASE_SERVICE_ROLE_KEY
CHAT_CURSOR_HMAC_SECRET
database passwords
Spring Boot internal credentials
outbox worker credentials
```

Use the authenticated Supabase access token for:

```text
Spring Boot Authorization header
Supabase private Realtime authorization
```

Do not bypass Spring Boot for chat reads, writes, receipts, or inbox retrieval.
