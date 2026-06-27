import { useEffect, useRef } from 'react';

import type { InboxFilter } from '@/api/chat/chatApi';
import { useInbox } from '@/hooks/messages/useInbox';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Hook — subscribes to user:<userId>:inbox for inbox update notifications
// ---------------------------------------------------------------------------

export function useInboxChannel(
  currentUserId: string | undefined,
  filter: InboxFilter,
) {
  const { invalidate, removeMatch } = useInbox(filter);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Stable refs so the channel subscription doesn't recreate on filter change
  const invalidateRef = useRef(invalidate);
  const removeMatchRef = useRef(removeMatch);
  invalidateRef.current = invalidate;
  removeMatchRef.current = removeMatch;

  // ── Keep Realtime auth token in sync with the Supabase session ──────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') &&
          session?.access_token
        ) {
          supabase.realtime.setAuth(session.access_token);
        }
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;

    async function connect() {
      // Spec §8: set JWT on Realtime client before joining private channel
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      const topic = `user:${currentUserId}:inbox`;
      const channel = supabase.channel(topic, {
        config: { private: true },
      });

      channel.on('broadcast', { event: 'inbox.match.updated' }, () => {
        invalidateRef.current();
      });

      channel.on('broadcast', { event: 'inbox.match.removed' }, (payload) => {
        const matchId = payload?.payload?.matchId ?? payload?.payload?.match_id;
        if (matchId) {
          removeMatchRef.current(matchId);
        }
        invalidateRef.current();
      });

      channel.subscribe();
      channelRef.current = channel;
    }

    connect();

    return () => {
      cancelled = true;
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [currentUserId]);
}
