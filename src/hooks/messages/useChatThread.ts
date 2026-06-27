import { useCallback, useEffect, useRef } from 'react';

import { fetchChatThread, fetchMessages } from '@/api/chat/chatApi';
import { mapMessageDto, useChatStore } from '@/stores/chat-store';
import type { ChatThread, MessageDto } from '@/types/chat';

// ---------------------------------------------------------------------------
// DTO → domain mapper
// ---------------------------------------------------------------------------

function mapChatThreadDto(dto: import('@/types/chat').ChatThreadDto): ChatThread {
  return {
    matchId: dto.match_id,
    status: dto.status,
    participant: {
      userId: dto.participant.user_id,
      displayName: dto.participant.display_name,
      avatarUrl: dto.participant.avatar_url,
      isVerified: dto.participant.is_verified,
      activityStatus: dto.participant.activity_status,
    },
    receiptState: {
      myLastDeliveredSequence: dto.receipt_state.my_last_delivered_sequence,
      myLastReadSequence: dto.receipt_state.my_last_read_sequence,
      participantLastDeliveredSequence:
        dto.receipt_state.participant_last_delivered_sequence,
      participantLastReadSequence:
        dto.receipt_state.participant_last_read_sequence,
    },
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChatThread(matchId: string, currentUserId: string) {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const syncAfterSequence = useCallback(async () => {
    let afterSeq = useChatStore.getState().highestKnownSequence;
    let hasMore = true;

    while (hasMore) {
      const res = await fetchMessages(matchId, {
        afterSequence: afterSeq,
        limit: 100,
      });
      if (!isMounted.current) return;
      if (res.items.length > 0) {
        const mapped = res.items.map((dto: MessageDto) =>
          mapMessageDto(dto, currentUserId),
        );
        useChatStore.getState().mergeMessages(mapped, undefined, res.has_more_after);
        const maxSeq = res.items.reduce(
          (max, m) => Math.max(max, m.sequence_number),
          afterSeq,
        );
        afterSeq = maxSeq;
      }
      hasMore = res.has_more_after;
    }
  }, [matchId, currentUserId]);

  const loadThread = useCallback(async () => {
    useChatStore.getState().setLoadingMessages(true);
    try {
      const [threadDto, messagesRes] = await Promise.all([
        fetchChatThread(matchId),
        fetchMessages(matchId, { limit: 50 }),
      ]);

      if (!isMounted.current) return;

      const thread = mapChatThreadDto(threadDto);
      useChatStore.getState().setThread(thread);

      const messages = messagesRes.items.map((dto: MessageDto) =>
        mapMessageDto(dto, currentUserId),
      );
      useChatStore.getState().setMessages(
        messages,
        messagesRes.has_more_before,
        messagesRes.has_more_after,
      );

      // Synchronize any messages that arrived while the screen was closed.
      // The initial page may return a stale snapshot; this catches the gap.
      await syncAfterSequence();
    } catch (error) {
      if (isMounted.current) {
        useChatStore.getState().setLoadingMessages(false);
      }
      throw error;
    }
  }, [matchId, currentUserId, syncAfterSequence]);

  const loadOlderMessages = useCallback(async () => {
    const { messages, hasMoreBefore, isLoadingOlder } = useChatStore.getState();
    if (!hasMoreBefore || isLoadingOlder) return;

    const lowestSeq = messages.reduce(
      (min, m) =>
        m.sequenceNumber != null && (min === null || m.sequenceNumber < min)
          ? m.sequenceNumber
          : min,
      null as number | null,
    );
    if (lowestSeq == null) return;

    useChatStore.getState().setLoadingOlder(true);
    try {
      const res = await fetchMessages(matchId, {
        beforeSequence: lowestSeq,
        limit: 50,
      });
      if (!isMounted.current) return;
      const mapped = res.items.map((dto: MessageDto) =>
        mapMessageDto(dto, currentUserId),
      );
      useChatStore.getState().mergeMessages(mapped, res.has_more_before);
    } catch {
      if (isMounted.current) useChatStore.getState().setLoadingOlder(false);
    }
  }, [matchId, currentUserId]);

  return {
    loadThread,
    loadOlderMessages,
    syncAfterSequence,
  };
}
