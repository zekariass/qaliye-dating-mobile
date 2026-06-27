import { create } from 'zustand';

import type {
  ChatMessage,
  ChatThread,
  MessageDto,
  ReceiptState,
  ThreadStatus,
} from '@/types/chat';

// ---------------------------------------------------------------------------
// DTO → model mapper
// ---------------------------------------------------------------------------

export function mapMessageDto(
  dto: MessageDto,
  currentUserId: string,
): ChatMessage {
  return {
    id: dto.id,
    clientMessageId: dto.client_message_id,
    matchId: dto.match_id,
    sequenceNumber: dto.sequence_number,
    senderUserId: dto.sender_user_id,
    isMine: dto.sender_user_id === currentUserId,
    messageType: dto.message_type,
    body: dto.body,
    createdAt: dto.created_at,
    editedAt: dto.edited_at,
    localSendStatus: 'SENT',
  };
}

// ---------------------------------------------------------------------------
// Dedup helpers
// ---------------------------------------------------------------------------

const MAX_PROCESSED_EVENTS = 200;

function findExistingIndex(
  messages: ChatMessage[],
  msg: ChatMessage,
): number {
  return messages.findIndex(
    (m) =>
      (msg.id && m.id === msg.id) ||
      (msg.clientMessageId && m.clientMessageId === msg.clientMessageId) ||
      (msg.matchId &&
        msg.sequenceNumber != null &&
        m.matchId === msg.matchId &&
        m.sequenceNumber === msg.sequenceNumber),
  );
}

function insertSorted(messages: ChatMessage[], msg: ChatMessage): ChatMessage[] {
  const result = [...messages];
  const existingIdx = findExistingIndex(result, msg);

  if (existingIdx >= 0) {
    const existing = result[existingIdx];
    result[existingIdx] = {
      ...existing,
      ...msg,
      localSendStatus: msg.localSendStatus ?? existing.localSendStatus,
    };
    return result;
  }

  if (msg.sequenceNumber != null) {
    const insertIdx = result.findIndex(
      (m) => m.sequenceNumber != null && m.sequenceNumber > msg.sequenceNumber!,
    );
    if (insertIdx === -1) {
      const lastDurableIdx = result.findLastIndex((m) => m.sequenceNumber != null);
      const firstPendingIdx = result.findIndex(
        (m) => m.sequenceNumber == null,
      );
      if (firstPendingIdx >= 0) {
        result.splice(firstPendingIdx, 0, msg);
      } else {
        result.push(msg);
      }
    } else {
      result.splice(insertIdx, 0, msg);
    }
  } else {
    result.push(msg);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Store state
// ---------------------------------------------------------------------------

interface ChatStoreState {
  // ── Thread metadata ──
  thread: ChatThread | null;
  threadStatus: ThreadStatus | null;

  // ── Messages ──
  messages: ChatMessage[];
  highestKnownSequence: number;
  hasMoreBefore: boolean;
  hasMoreAfter: boolean;
  isLoadingMessages: boolean;
  isLoadingOlder: boolean;

  // ── Receipt tracking ──
  receiptState: ReceiptState;
  lastDeliveredReceiptSent: number;
  lastReadReceiptSent: number;

  // ── Typing ──
  participantIsTyping: boolean;
  typingExpiryTimer: ReturnType<typeof setTimeout> | null;

  // ── Presence ──
  participantPresent: boolean;

  // ── Event dedup ──
  processedEventIds: Set<string>;

  // ── Actions ──
  setThread: (thread: ChatThread) => void;
  setThreadEnded: () => void;
  setMessages: (
    messages: ChatMessage[],
    hasMoreBefore: boolean,
    hasMoreAfter: boolean,
  ) => void;
  mergeMessages: (
    newMessages: ChatMessage[],
    hasMoreBefore?: boolean,
    hasMoreAfter?: boolean,
  ) => void;
  addOptimisticMessage: (msg: ChatMessage) => void;
  reconcileMessage: (clientMessageId: string, serverMsg: ChatMessage) => void;
  markMessageFailed: (clientMessageId: string, errorCode?: string) => void;
  updateReceiptState: (receipt: Partial<ReceiptState>) => void;
  setParticipantTyping: (isTyping: boolean) => void;
  setParticipantPresent: (present: boolean) => void;
  isEventProcessed: (eventId: string) => boolean;
  markEventProcessed: (eventId: string) => void;
  setLoadingMessages: (loading: boolean) => void;
  setLoadingOlder: (loading: boolean) => void;
  reset: () => void;
}

const INITIAL_RECEIPT: ReceiptState = {
  myLastDeliveredSequence: 0,
  myLastReadSequence: 0,
  participantLastDeliveredSequence: 0,
  participantLastReadSequence: 0,
};

export const useChatStore = create<ChatStoreState>((set, get) => ({
  thread: null,
  threadStatus: null,
  messages: [],
  highestKnownSequence: 0,
  hasMoreBefore: false,
  hasMoreAfter: false,
  isLoadingMessages: true,
  isLoadingOlder: false,
  receiptState: { ...INITIAL_RECEIPT },
  lastDeliveredReceiptSent: 0,
  lastReadReceiptSent: 0,
  participantIsTyping: false,
  typingExpiryTimer: null,
  participantPresent: false,
  processedEventIds: new Set(),

  setThread: (thread) =>
    set({
      thread,
      threadStatus: thread.status,
      receiptState: { ...thread.receiptState },
      lastDeliveredReceiptSent: thread.receiptState.myLastDeliveredSequence,
      lastReadReceiptSent: thread.receiptState.myLastReadSequence,
    }),

  setThreadEnded: () => {
    const timer = get().typingExpiryTimer;
    if (timer) clearTimeout(timer);
    set({
      threadStatus: 'ENDED',
      participantIsTyping: false,
      typingExpiryTimer: null,
      participantPresent: false,
    });
  },

  setMessages: (messages, hasMoreBefore, hasMoreAfter) => {
    const highest = messages.reduce(
      (max, m) => (m.sequenceNumber != null && m.sequenceNumber > max ? m.sequenceNumber : max),
      0,
    );
    set({
      messages,
      hasMoreBefore,
      hasMoreAfter,
      highestKnownSequence: highest,
      isLoadingMessages: false,
    });
  },

  mergeMessages: (newMessages, hasMoreBefore, hasMoreAfter) => {
    set((state) => {
      let merged = [...state.messages];
      for (const msg of newMessages) {
        merged = insertSorted(merged, msg);
      }
      const highest = merged.reduce(
        (max, m) =>
          m.sequenceNumber != null && m.sequenceNumber > max
            ? m.sequenceNumber
            : max,
        state.highestKnownSequence,
      );
      return {
        messages: merged,
        highestKnownSequence: highest,
        ...(hasMoreBefore != null ? { hasMoreBefore } : {}),
        ...(hasMoreAfter != null ? { hasMoreAfter } : {}),
        isLoadingOlder: false,
      };
    });
  },

  addOptimisticMessage: (msg) => {
    set((state) => ({
      messages: insertSorted(state.messages, msg),
    }));
  },

  reconcileMessage: (clientMessageId, serverMsg) => {
    set((state) => {
      const idx = state.messages.findIndex(
        (m) => m.clientMessageId === clientMessageId,
      );
      if (idx < 0) {
        return { messages: insertSorted(state.messages, serverMsg) };
      }
      const updated = [...state.messages];
      updated[idx] = {
        ...updated[idx],
        id: serverMsg.id,
        sequenceNumber: serverMsg.sequenceNumber,
        createdAt: serverMsg.createdAt,
        localSendStatus: 'SENT',
        errorCode: undefined,
      };

      const reordered = updated.sort((a, b) => {
        if (a.sequenceNumber != null && b.sequenceNumber != null) {
          return a.sequenceNumber - b.sequenceNumber;
        }
        if (a.sequenceNumber != null) return -1;
        if (b.sequenceNumber != null) return 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      const highest = Math.max(
        state.highestKnownSequence,
        serverMsg.sequenceNumber ?? 0,
      );

      return { messages: reordered, highestKnownSequence: highest };
    });
  },

  markMessageFailed: (clientMessageId, errorCode) => {
    set((state) => {
      const idx = state.messages.findIndex(
        (m) => m.clientMessageId === clientMessageId,
      );
      if (idx < 0) return state;
      const updated = [...state.messages];
      updated[idx] = {
        ...updated[idx],
        localSendStatus: 'FAILED',
        errorCode,
      };
      return { messages: updated };
    });
  },

  updateReceiptState: (receipt) => {
    set((state) => {
      const newState = { ...state.receiptState };
      if (
        receipt.myLastDeliveredSequence != null &&
        receipt.myLastDeliveredSequence > newState.myLastDeliveredSequence
      ) {
        newState.myLastDeliveredSequence = receipt.myLastDeliveredSequence;
      }
      if (
        receipt.myLastReadSequence != null &&
        receipt.myLastReadSequence > newState.myLastReadSequence
      ) {
        newState.myLastReadSequence = receipt.myLastReadSequence;
      }
      if (
        receipt.participantLastDeliveredSequence != null &&
        receipt.participantLastDeliveredSequence >
          newState.participantLastDeliveredSequence
      ) {
        newState.participantLastDeliveredSequence =
          receipt.participantLastDeliveredSequence;
      }
      if (
        receipt.participantLastReadSequence != null &&
        receipt.participantLastReadSequence > newState.participantLastReadSequence
      ) {
        newState.participantLastReadSequence = receipt.participantLastReadSequence;
      }
      return { receiptState: newState };
    });
  },

  setParticipantTyping: (isTyping) => {
    const prev = get().typingExpiryTimer;
    if (prev) clearTimeout(prev);

    if (isTyping) {
      const timer = setTimeout(() => {
        set({ participantIsTyping: false, typingExpiryTimer: null });
      }, 5000);
      set({ participantIsTyping: true, typingExpiryTimer: timer });
    } else {
      set({ participantIsTyping: false, typingExpiryTimer: null });
    }
  },

  setParticipantPresent: (present) => set({ participantPresent: present }),

  isEventProcessed: (eventId) => get().processedEventIds.has(eventId),

  markEventProcessed: (eventId) => {
    set((state) => {
      const newSet = new Set(state.processedEventIds);
      newSet.add(eventId);
      if (newSet.size > MAX_PROCESSED_EVENTS) {
        const iter = newSet.values();
        for (let i = 0; i < newSet.size - MAX_PROCESSED_EVENTS; i++) {
          newSet.delete(iter.next().value as string);
        }
      }
      return { processedEventIds: newSet };
    });
  },

  setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),
  setLoadingOlder: (loading) => set({ isLoadingOlder: loading }),

  reset: () => {
    const timer = get().typingExpiryTimer;
    if (timer) clearTimeout(timer);
    set({
      thread: null,
      threadStatus: null,
      messages: [],
      highestKnownSequence: 0,
      hasMoreBefore: false,
      hasMoreAfter: false,
      isLoadingMessages: true,
      isLoadingOlder: false,
      receiptState: { ...INITIAL_RECEIPT },
      lastDeliveredReceiptSent: 0,
      lastReadReceiptSent: 0,
      participantIsTyping: false,
      typingExpiryTimer: null,
      participantPresent: false,
      processedEventIds: new Set(),
    });
  },
}));
