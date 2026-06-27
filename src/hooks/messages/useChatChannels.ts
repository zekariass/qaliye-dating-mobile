import { useCallback, useEffect, useRef } from 'react';

import { supabase } from '@/lib/supabase';
import { mapMessageDto, useChatStore } from '@/stores/chat-store';
import type {
    ChatMessage,
    MessageCreatedData,
    ReceiptUpdatedData
} from '@/types/chat';

// ---------------------------------------------------------------------------
// Hook — subscribes to match:<matchId>:events, :typing, :presence
// ---------------------------------------------------------------------------

export function useChatChannels(
  matchId: string,
  currentUserId: string,
  isActive: boolean,
  onMatchEnded: () => void,
  onSyncNeeded: () => void,
) {
  const eventsRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const presenceFailedRef = useRef(false);

  const unsubscribeAll = useCallback(() => {
    if (eventsRef.current) {
      eventsRef.current.unsubscribe();
      eventsRef.current = null;
    }
    if (typingRef.current) {
      typingRef.current.unsubscribe();
      typingRef.current = null;
    }
    if (presenceRef.current) {
      presenceRef.current.unsubscribe();
      presenceRef.current = null;
    }
    useChatStore.getState().setParticipantTyping(false);
    useChatStore.getState().setParticipantPresent(false);
    presenceFailedRef.current = false;
  }, []);

  // ── Keep Realtime auth token in sync with the Supabase session ─────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') &&
          session?.access_token
        ) {
          supabase.realtime.setAuth(session.access_token);
          if (event === 'TOKEN_REFRESHED') {
            onSyncNeeded();
          }
        }
      },
    );
    return () => subscription.unsubscribe();
  }, [onSyncNeeded]);

  useEffect(() => {
    if (!isActive || !matchId || !currentUserId) {
      unsubscribeAll();
      return;
    }

    let cancelled = false;

    async function connect() {
      // ── Spec §8: obtain token and set it on the Realtime client ───────
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
        console.log('[useChatChannels] Realtime auth token set');
      }

      // ── Events channel (server-published, durable) ─────────────────
      const eventsTopic = `match:${matchId}:events`;
      const eventsChannel = supabase.channel(eventsTopic, {
        config: { private: true },
      });

      eventsChannel.on(
      'broadcast',
      { event: 'chat.message.created' },
      (payload) => {
        const data = payload.payload as any;
        const eventId = data.eventId ?? data.event_id;
        const store = useChatStore.getState();

        if (eventId && store.isEventProcessed(eventId)) return;
        if (eventId) store.markEventProcessed(eventId);

        const msgData: MessageCreatedData = data.data ?? data;
        const msg: ChatMessage = mapMessageDto(
          {
            id: msgData.id,
            client_message_id: msgData.client_message_id,
            match_id: msgData.match_id ?? matchId,
            sequence_number: msgData.sequence_number,
            sender_user_id: msgData.sender_user_id,
            message_type: msgData.message_type,
            body: msgData.body,
            created_at: msgData.created_at,
            edited_at: msgData.edited_at,
          },
          currentUserId,
        );

        const currentHighest = store.highestKnownSequence;
        if (
          msg.sequenceNumber != null &&
          msg.sequenceNumber > currentHighest + 1
        ) {
          onSyncNeeded();
        }

        store.mergeMessages([msg]);
      },
    );

    eventsChannel.on(
      'broadcast',
      { event: 'chat.receipt.updated' },
      (payload) => {
        const data = payload.payload as any;
        const eventId = data.eventId ?? data.event_id;
        const store = useChatStore.getState();

        if (eventId && store.isEventProcessed(eventId)) return;
        if (eventId) store.markEventProcessed(eventId);

        const receiptData: ReceiptUpdatedData = data.data ?? data;

        // Backend sends user_id to indicate which user's receipt was updated
        const isMyReceipt = receiptData.user_id === currentUserId;

        if (isMyReceipt) {
          store.updateReceiptState({
            myLastDeliveredSequence: receiptData.delivered_sequence,
            myLastReadSequence: receiptData.read_sequence,
          });
        } else {
          store.updateReceiptState({
            participantLastDeliveredSequence: receiptData.delivered_sequence,
            participantLastReadSequence: receiptData.read_sequence,
          });
        }
      },
    );

    eventsChannel.on(
      'broadcast',
      { event: 'chat.match.ended' },
      (payload) => {
        const data = payload.payload as any;
        const eventId = data.eventId ?? data.event_id;
        const store = useChatStore.getState();

        if (eventId && store.isEventProcessed(eventId)) return;
        if (eventId) store.markEventProcessed(eventId);

        store.setThreadEnded();
        onMatchEnded();
      },
    );

    eventsChannel.subscribe((status) => {
      console.log('[useChatChannels] Events channel status:', status);
    });
    eventsRef.current = eventsChannel;

    // ── Typing channel (ephemeral) ──────────────────────────────────────
    const typingTopic = `match:${matchId}:typing`;
    const typingChannel = supabase.channel(typingTopic, {
      config: { private: true },
    });

    typingChannel.on('broadcast', { event: 'typing' }, (payload) => {
      const data = payload.payload as any;
      console.log('[useChatChannels] Typing event received:', data);
      if (data.user_id === currentUserId) return;
      useChatStore.getState().setParticipantTyping(!!data.is_typing);
    });

    typingChannel.subscribe((status) => {
      console.log('[useChatChannels] Typing channel status:', status);
    });
    typingRef.current = typingChannel;

    // ── Presence channel ────────────────────────────────────────────────
    const presenceTopic = `match:${matchId}:presence`;
    const presenceChannel = supabase.channel(presenceTopic, {
      config: {
        private: true,
        presence: {
          key: currentUserId,
        },
      },
    });

    presenceChannel.on('presence', { event: 'sync' }, () => {
      const presState = presenceChannel.presenceState();
      console.log('[useChatChannels] Presence sync state:', presState);
      const otherPresent = Object.values(presState).some((entries: any) =>
        entries.some((e: any) => e.user_id !== currentUserId),
      );
      useChatStore.getState().setParticipantPresent(otherPresent);
    });

    presenceChannel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('[useChatChannels] Presence join:', newPresences);
      const otherJoined = newPresences.some(
        (p: any) => p.user_id !== currentUserId,
      );
      if (otherJoined) useChatStore.getState().setParticipantPresent(true);
    });

    presenceChannel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('[useChatChannels] Presence leave:', leftPresences);
      const otherLeft = leftPresences.some(
        (p: any) => p.user_id !== currentUserId,
      );
      if (otherLeft) useChatStore.getState().setParticipantPresent(false);
    });

    presenceChannel.subscribe(async (status: string, err?: unknown) => {
      if (status === 'CHANNEL_ERROR' && err) {
        if (!presenceFailedRef.current) {
          console.log('[useChatChannels] Presence channel failed (will not retry):', err);
          presenceFailedRef.current = true;
        }
        return;
      }
      console.log('[useChatChannels] Presence channel status:', status);
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          user_id: currentUserId,
          state: 'viewing_chat',
        });
        console.log('[useChatChannels] Presence tracked for user:', currentUserId);
      }
    });
    presenceRef.current = presenceChannel;
  }

    connect();

    return () => {
      cancelled = true;
      unsubscribeAll();
    };
  }, [matchId, currentUserId, isActive, onMatchEnded, onSyncNeeded, unsubscribeAll]);

  // ── Typing broadcast (for local user) ─────────────────────────────────

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!typingRef.current) return;
      typingRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: currentUserId, is_typing: isTyping },
      });
    },
    [currentUserId],
  );

  return { unsubscribeAll, sendTyping };
}
