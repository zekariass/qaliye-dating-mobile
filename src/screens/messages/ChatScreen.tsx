import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatHeader } from '@/components/messages/ChatHeader';
import { DateSeparator } from '@/components/messages/DateSeparator';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { MessageComposer } from '@/components/messages/MessageComposer';
import { colors } from '@/constants/theme';
import { useChatMetadataPoller } from '@/hooks/activity/useChatMetadataPoller';
import { useCurrentUserId } from '@/hooks/auth/useCurrentUserId';
import { useAppStateChat } from '@/hooks/messages/useAppStateChat';
import { useChatChannels } from '@/hooks/messages/useChatChannels';
import { useChatThread } from '@/hooks/messages/useChatThread';
import { INBOX_QUERY_KEY } from '@/hooks/messages/useInbox';
import { useReceipts } from '@/hooks/messages/useReceipts';
import { useSendMessage } from '@/hooks/messages/useSendMessage';
import { useTypingIndicator } from '@/hooks/messages/useTypingIndicator';
import { useTheme } from '@/hooks/use-theme';
import { useChatStore } from '@/stores/chat-store';
import type {
    ChatListItem,
    ChatMessage,
    ChatMessageViewModel,
    ReceiptState,
    ServerDeliveryStatus,
} from '@/types/chat';


import { supabase } from '@/lib/supabase';

supabase.auth.getSession().then(({ data: { session } }) => {
  console.log('Session exists:', !!session);
  console.log('User ID:', session?.user?.id);
  console.log('Access token (first 50 chars):', session?.access_token?.substring(0, 50));
});

// ---------------------------------------------------------------------------
// Screen params
// ---------------------------------------------------------------------------

type RawParams = Record<string, string | string[]>;

// ---------------------------------------------------------------------------
// Message → view-model builder
// ---------------------------------------------------------------------------

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor(
    (today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function deriveDeliveryStatus(
  msg: ChatMessage,
  receiptState: ReceiptState,
): ServerDeliveryStatus | undefined {
  if (!msg.isMine || msg.sequenceNumber == null) return undefined;
  if (msg.sequenceNumber <= receiptState.participantLastReadSequence) return 'READ';
  if (msg.sequenceNumber <= receiptState.participantLastDeliveredSequence) return 'DELIVERED';
  return 'SENT';
}

function buildListData(
  messages: ChatMessage[],
  receiptState: ReceiptState,
  participantIsTyping: boolean,
): ChatListItem[] {
  const items: ChatListItem[] = [];

  // Messages ordered ascending by sequence/time — we'll reverse for inverted FlatList
  const sorted = [...messages].sort((a, b) => {
    if (a.sequenceNumber != null && b.sequenceNumber != null) {
      return a.sequenceNumber - b.sequenceNumber;
    }
    if (a.sequenceNumber != null) return -1;
    if (b.sequenceNumber != null) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  let prevDateKey = '';
  let prevSenderId = '';

  for (let i = 0; i < sorted.length; i++) {
    const msg = sorted[i];
    const dateKey = new Date(msg.createdAt).toDateString();
    const next = sorted[i + 1] as ChatMessage | undefined;
    const nextSameGroup = next?.senderUserId === msg.senderUserId;

    // Date separator
    if (dateKey !== prevDateKey) {
      items.push({
        kind: 'date_separator',
        id: `sep_${dateKey}`,
        label: formatDateLabel(msg.createdAt),
      });
      prevDateKey = dateKey;
      prevSenderId = '';
    }

    const isFirstInGroup = msg.senderUserId !== prevSenderId;
    const isLastInGroup = !nextSameGroup || (next && new Date(next.createdAt).toDateString() !== dateKey);
    const showTimestamp = !!isLastInGroup;

    const vm: ChatMessageViewModel = {
      ...msg,
      deliveryStatus: deriveDeliveryStatus(msg, receiptState),
      timeLabel: formatTime(msg.createdAt),
      showAvatar: isFirstInGroup && !msg.isMine,
      showTimestamp,
      isFirstInGroup,
      isLastInGroup: !!isLastInGroup,
    };

    items.push({ kind: 'message', data: vm });
    prevSenderId = msg.senderUserId;
  }

  if (participantIsTyping) {
    items.push({ kind: 'typing_indicator', id: 'typing' });
  }

  // Reverse for inverted FlatList (newest first)
  return items.reverse();
}

// ---------------------------------------------------------------------------
// Typing indicator bubble
// ---------------------------------------------------------------------------

function TypingBubble() {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  return (
    <View style={typingStyles.row}>
      <View
        style={[
          typingStyles.bubble,
          { backgroundColor: isDark ? '#2A1D44' : '#EDE8F8' },
        ]}
      >
        <Text style={[typingStyles.dots, { color: th.textMuted }]}>...</Text>
      </View>
    </View>
  );
}

const typingStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  bubble: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
  },
  dots: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
  },
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { colors: th } = useTheme();
  return (
    <View style={stateStyles.wrap}>
      <Text style={[stateStyles.title, { color: th.text }]}>Something went wrong</Text>
      <Text style={[stateStyles.sub, { color: th.textSecondary }]}>
        Could not load messages.
      </Text>
      <TouchableOpacity
        style={[stateStyles.retryBtn, { backgroundColor: colors.primary }]}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry loading messages"
      >
        <Text style={stateStyles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const stateStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  title: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 11, borderRadius: 999, marginTop: 8 },
  retryText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});

// ---------------------------------------------------------------------------
// ChatScreen
// ---------------------------------------------------------------------------

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: th } = useTheme();
  const queryClient = useQueryClient();
  const currentUserId = useCurrentUserId();

  // ── Route params ─────────────────────────────────────────────────────────
  const params = useLocalSearchParams() as RawParams;
  const matchId = (params.matchId as string) ?? '';
  const displayName = (params.displayName as string) ?? 'Unknown';
  const rawAvatar = params.avatarUrl as string | undefined;
  const avatarUrl = rawAvatar && rawAvatar.length > 0 ? rawAvatar : null;
  const isVerified = (params.isVerified as string) === '1';

  // ── Store selectors ──────────────────────────────────────────────────────
  const messages = useChatStore((s) => s.messages);
  const receiptState = useChatStore((s) => s.receiptState);
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);
  const isLoadingOlder = useChatStore((s) => s.isLoadingOlder);
  const hasMoreBefore = useChatStore((s) => s.hasMoreBefore);
  const threadStatus = useChatStore((s) => s.threadStatus);
  const participantIsTyping = useChatStore((s) => s.participantIsTyping);
  const thread = useChatStore((s) => s.thread);

  const [loadError, setLoadError] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // ── Hooks ────────────────────────────────────────────────────────────────
  const { loadThread, loadOlderMessages, syncAfterSequence } = useChatThread(
    matchId,
    currentUserId ?? '',
  );
  const { send, retry } = useSendMessage(matchId, currentUserId ?? '');
  const { scheduleDeliveryReceipt, scheduleReadReceipt, cancelTimers } =
    useReceipts(matchId);

  const handleMatchEnded = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [INBOX_QUERY_KEY] });
  }, [queryClient]);

  const handleSyncNeeded = useCallback(() => {
    syncAfterSequence().catch(() => {});
  }, [syncAfterSequence]);

  const { sendTyping } = useChatChannels(
    matchId,
    currentUserId ?? '',
    isActive,
    handleMatchEnded,
    handleSyncNeeded,
  );

  const { onTextChange, stopTyping } = useTypingIndicator(sendTyping);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId || !matchId) return;
    setLoadError(false);
    loadThread().catch(() => setLoadError(true));
    return () => {
      stopTyping();
      cancelTimers();
      useChatStore.getState().reset();
    };
  }, [currentUserId, matchId, loadThread, stopTyping, cancelTimers]);

  // ── Mark incoming messages as delivered & read ────────────────────────────
  useEffect(() => {
    if (!isActive || messages.length === 0) return;
    const incomingMsgs = messages.filter(
      (m) => !m.isMine && m.sequenceNumber != null,
    );
    if (incomingMsgs.length === 0) return;
    const maxIncomingSeq = Math.max(
      ...incomingMsgs.map((m) => m.sequenceNumber!),
    );
    scheduleDeliveryReceipt(maxIncomingSeq);
    scheduleReadReceipt(maxIncomingSeq);
  }, [messages, isActive, scheduleDeliveryReceipt, scheduleReadReceipt]);

  // ── App lifecycle ────────────────────────────────────────────────────────
  useAppStateChat(
    useCallback(() => {
      setIsActive(true);
      syncAfterSequence().catch(() => {});
    }, [syncAfterSequence]),
    useCallback(() => {
      setIsActive(false);
      stopTyping();
    }, [stopTyping]),
  );

  // ── Build list data ──────────────────────────────────────────────────────
  const listData = useMemo(
    () => buildListData(messages, receiptState, participantIsTyping),
    [messages, receiptState, participantIsTyping],
  );

  const listRef = useRef<FlatList<ChatListItem>>(null);

  const handleSend = useCallback(
    (text: string) => {
      stopTyping();
      send(text);
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 50);
    },
    [send, stopTyping],
  );

  const handleRetry = useCallback(
    (clientMessageId: string) => retry(clientMessageId),
    [retry],
  );

  const handleLoadMore = useCallback(() => {
    if (hasMoreBefore && !isLoadingOlder) {
      loadOlderMessages();
    }
  }, [hasMoreBefore, isLoadingOlder, loadOlderMessages]);

  const handleBack = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [INBOX_QUERY_KEY] });
    router.back();
  }, [router, queryClient]);

  const handleProfilePress = useCallback(() => {
    const userId = thread?.participant.userId;
    if (userId) {
      router.push({
        pathname: '/(app)/user-profile' as any,
        params: { userId, matchId },
      });
    }
  }, [router, thread, matchId]);

  const keyExtractor = useCallback(
    (item: ChatListItem) => {
      if (item.kind === 'message') {
        return item.data.id ?? item.data.clientMessageId;
      }
      return item.id;
    },
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => {
      if (item.kind === 'date_separator') {
        return <DateSeparator label={item.label} />;
      }
      if (item.kind === 'typing_indicator') {
        return <TypingBubble />;
      }
      return (
        <MessageBubble
          message={item.data}
          onRetry={handleRetry}
        />
      );
    },
    [handleRetry],
  );

  const isEnded = threadStatus === 'ENDED';

  const { activityStatus: polledActivityStatus } =
    useChatMetadataPoller(matchId, !isEnded && !!matchId);

  const headerActivityStatus =
    polledActivityStatus ?? thread?.participant?.activityStatus ?? null;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: th.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Fixed header */}
      <ChatHeader
        paddingTop={insets.top}
        displayName={thread?.participant.displayName ?? displayName}
        avatarUrl={thread?.participant.avatarUrl ?? avatarUrl}
        isVerified={thread?.participant.isVerified ?? isVerified}
        activityStatus={headerActivityStatus}
        onBack={handleBack}
        onProfilePress={handleProfilePress}
      />

      {/* Message timeline */}
      {isLoadingMessages ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : loadError ? (
        <ErrorState
          onRetry={() => {
            setLoadError(false);
            loadThread().catch(() => setLoadError(true));
          }}
        />
      ) : (
        <FlatList
          ref={listRef}
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          inverted
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          initialNumToRender={20}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingOlder ? (
              <View style={styles.olderLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      {/* Thread ended banner */}
      {isEnded && (
        <View style={styles.endedBanner}>
          <Text style={styles.endedText}>
            This match has ended. You can no longer send messages.
          </Text>
        </View>
      )}

      {/* Composer */}
      <MessageComposer
        onSend={handleSend}
        bottomInset={insets.bottom}
        onTextChange={onTextChange}
        disabled={isEnded}
      />
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  olderLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  endedBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  endedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    textAlign: 'center',
  },
});
