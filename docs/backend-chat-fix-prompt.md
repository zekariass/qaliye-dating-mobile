# Backend Chat Realtime Fix Request

## Symptoms

1. **Messages not delivered in real-time** - When a user sends a message, the other user does not receive it without refreshing. The events channel subscribes successfully (`SUBSCRIBED`), but no `chat.message.created` events are received.

2. **Presence channel authorization error** - The presence channel fails with:
   ```
   Unauthorized: You do not have permissions to read from this Channel topic: match:{matchId}:presence
   ```

3. **Typing indicators work** - The typing channel subscribes and broadcasts successfully.

## Client Logs

```
LOG  [useChatChannels] Events channel status: SUBSCRIBED
LOG  [useChatChannels] Typing channel status: SUBSCRIBED
LOG  [useChatChannels] Presence channel failed (will not retry): [Error: Unauthorized: You do not have permissions to read from this Channel topic: match:291fc94d-cfef-49d4-a5fa-243f7a92321d:presence]
```

No `chat.message.created` events are ever received, even though the events channel is subscribed.

## Expected Behavior (from docs)

- `match:{matchId}:events` - Server publishes durable events (message created, receipt updated, match ended)
- `match:{matchId}:typing` - Clients publish ephemeral typing indicators (working)
- `match:{matchId}:presence` - Clients publish online/offline presence (failing auth)

## Investigation Checklist

### Issue 1: Messages not published via Realtime

1. **Check outbox events table** - When `POST /api/v1/chat/matches/{matchId}/messages` is called, verify:
   - A row is created in `chat_outbox_events` table
   - `event_type = 'chat.message.created'`
   - `topic = 'match:{matchId}:events'`
   - `status = 'PENDING'`

2. **Check ChatOutboxPublisher worker** - Verify:
   - The `@Scheduled` worker is running
   - Logs show `ChatOutboxPublisher` activity
   - Events are being claimed (`status = PROCESSING`)
   - Events are being published (`status = PUBLISHED`)
   - Check `CHAT_OUTBOX_POLL_INTERVAL` (default 500ms)

3. **Check Supabase service role key** - Verify:
   - `SUPABASE_SERVICE_ROLE_KEY` is set in backend environment variables
   - The key has permissions to publish to Supabase Realtime
   - The key is not expired or invalid

4. **Check Realtime broadcast URL** - Verify:
   - `SUPABASE_REALTIME_BROADCAST_URL` is configured
   - Defaults to `${SUPABASE_URL}/realtime/v1/api/broadcast`
   - The URL is accessible from the backend server

5. **Check migration V8** - Verify:
   - Migration `V8__configure_chat_private_realtime_broadcast.sql` was applied
   - RLS policies for `match:*:events` allow subscription by match participants
   - The `chat_realtime_is_active_match_member` function exists and works

### Issue 2: Presence channel authorization error

1. **Check migration V8 RLS policies** - Verify:
   - The presence channel policy allows subscription by match participants
   - The policy checks `chat_realtime_is_active_match_member` function
   - The function correctly returns true for active match participants

2. **Check the presence channel topic format** - Verify:
   - Client subscribes to `match:{matchId}:presence`
   - Backend policy expects the same format
   - No case sensitivity or format mismatches

## Relevant Documentation

- `docs/chat-backend-api-description.md` - Full backend spec including Realtime setup
- `docs/chat-and-message-list-implementation.md` - Client implementation details

## Key Backend Components

- `ChatOutboxPublisher` - Scheduled worker that publishes events from `chat_outbox_events`
- `chat_realtime_is_active_match_member` - Security definer function for RLS
- Migration V8 - Configures Realtime private Broadcast/Presence RLS policies

## Environment Variables to Check

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_REALTIME_BROADCAST_URL`
- `CHAT_OUTBOX_POLL_INTERVAL`
- `CHAT_OUTBOX_BATCH_SIZE`
- `CHAT_OUTBOX_LEASE_SECONDS`

## Expected Fix

1. Ensure `ChatOutboxPublisher` is running and successfully publishing events to Supabase Realtime
2. Fix the RLS policy for `match:*:presence` to allow subscription by active match participants
3. Verify all environment variables are correctly configured
4. Test end-to-end: send message → verify outbox event → verify worker publishes → verify client receives event
