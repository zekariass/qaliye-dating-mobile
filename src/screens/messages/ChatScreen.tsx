import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    InteractionManager,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ReportType } from '@/api/safety/safetyApi';
import { themedAlert, themedError, themedSuccess } from '@/components/common/ThemedAlert';
import { ChatHeader } from '@/components/messages/ChatHeader';
import { DateSeparator } from '@/components/messages/DateSeparator';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { MessageComposer } from '@/components/messages/MessageComposer';
import { colors } from '@/constants/theme';
import { useChatMetadataPoller } from '@/hooks/activity/useChatMetadataPoller';
import { useCurrentUserId } from '@/hooks/auth/useCurrentUserId';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useAppStateChat } from '@/hooks/messages/useAppStateChat';
import { useChatChannels } from '@/hooks/messages/useChatChannels';
import { useChatThread } from '@/hooks/messages/useChatThread';
import { useChatVoiceRecorder } from '@/hooks/messages/useChatVoiceRecorder';
import { useClearChatMessages } from '@/hooks/messages/useClearChatMessages';
import { INBOX_QUERY_KEY } from '@/hooks/messages/useInbox';
import { useReceipts } from '@/hooks/messages/useReceipts';
import { useSendMessage } from '@/hooks/messages/useSendMessage';
import { useTypingIndicator } from '@/hooks/messages/useTypingIndicator';
import { useBlockUser } from '@/hooks/safety/useBlockUser';
import { useReportUser } from '@/hooks/safety/useReportUser';
import { useTheme } from '@/hooks/use-theme';
import { useChatStore } from '@/stores/chat-store';
import type {
    ChatFileAttachment,
    ChatListItem,
    ChatMessage,
    ChatMessageViewModel,
    ReceiptState,
    ServerDeliveryStatus,
} from '@/types/chat';
import {
    getImageChatMsgsStatus,
    getVoiceChatMsgsStatus,
} from '@/utils/entitlements';
import { processChatImage } from '@/utils/imageProcessor';


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

const REPORT_OPTIONS: { type: ReportType; label: string }[] = [
  { type: 'FAKE_PROFILE', label: 'Fake profile' },
  { type: 'HARASSMENT', label: 'Harassment' },
  { type: 'HATE_SPEECH', label: 'Hate speech' },
  { type: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content' },
  { type: 'SCAM', label: 'Scam or fraud' },
  { type: 'UNDERAGE', label: 'Underage user' },
  { type: 'VIOLENCE_OR_THREATS', label: 'Violence or threats' },
  { type: 'PRIVACY_VIOLATION', label: 'Privacy violation' },
  { type: 'OFF_PLATFORM_SOLICITATION', label: 'Off-platform solicitation' },
  { type: 'SPAM', label: 'Spam' },
  { type: 'OTHER', label: 'Other' },
];

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
  const [selectedFiles, setSelectedFiles] = useState<ChatFileAttachment[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportDropdownOpen, setReportDropdownOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
  const [reportDescription, setReportDescription] = useState('');

  // ── Voice recorder ───────────────────────────────────────────────────────
  const voiceRecorder = useChatVoiceRecorder();

  // ── Hooks ────────────────────────────────────────────────────────────────
  const { loadThread, loadOlderMessages, syncAfterSequence } = useChatThread(
    matchId,
    currentUserId ?? '',
  );
  const { send, sendWithAttachments, retry } = useSendMessage(matchId, currentUserId ?? '');
  const { scheduleDeliveryReceipt, scheduleReadReceipt, cancelTimers } =
    useReceipts(matchId);
  const { mutate: blockUser, isPending: isBlocking } = useBlockUser();
  const { mutate: reportUser, isPending: isReporting } = useReportUser();
  const { mutate: clearMessages, isPending: isClearing } = useClearChatMessages();
  const { entitlements, refreshEntitlements } = useEntitlements();

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

  const handleSendWithAttachments = useCallback(
    async (text: string, files: ChatFileAttachment[], voiceDurationsMs?: (number | null)[]) => {
      stopTyping();
      const quotaError = await sendWithAttachments(text, files, undefined, voiceDurationsMs);
      if (quotaError) {
        showQuotaUpsell(quotaError.message);
      } else {
        refreshEntitlements();
      }
      setSelectedFiles([]);
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 50);
    },
    [sendWithAttachments, stopTyping, refreshEntitlements],
  );

  const handleSendVoice = useCallback(
    async (text: string) => {
      const rec = voiceRecorder.recording;
      if (!rec) return;
      const file: ChatFileAttachment = {
        uri: rec.uri,
        name: rec.fileName,
        type: rec.mimeType,
        size: rec.fileSizeBytes || undefined,
        durationMs: rec.durationMs,
      };
      stopTyping();
      const quotaError = await sendWithAttachments(text, [file], undefined, [rec.durationMs]);
      if (quotaError) {
        showQuotaUpsell(quotaError.message);
      } else {
        refreshEntitlements();
      }
      voiceRecorder.deleteRecording();
      setSelectedFiles([]);
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 50);
    },
    [sendWithAttachments, stopTyping, voiceRecorder, refreshEntitlements],
  );

  // ── Chat quota helpers ────────────────────────────────────────────────────
  const voiceQuotaStatus = getVoiceChatMsgsStatus(entitlements);
  const imageQuotaStatus = getImageChatMsgsStatus(entitlements);

  const showQuotaUpsell = useCallback(
    (message: string) => {
      themedAlert({
        title: 'Daily limit reached',
        message: message || 'You have reached your daily limit for this message type.',
        icon: 'lock-closed-outline',
        iconColor: colors.warning,
        buttons: [
          {
            text: 'Upgrade to Premium',
            onPress: () => {
              router.push('/(app)/premium' as any);
            },
          },
          { text: 'Not now', style: 'cancel' },
        ],
      });
    },
    [router],
  );

  const handleQuotaExceeded = useCallback(
    (type: 'voice' | 'image') => {
      const msg = type === 'voice'
        ? 'You have reached your daily voice message limit.'
        : 'You have reached your daily image message limit.';
      showQuotaUpsell(msg);
    },
    [showQuotaUpsell],
  );

  const handlePickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 3,
      });
      if (result.canceled) return;
      setIsProcessingImages(true);
      await new Promise<void>((resolve) =>
        InteractionManager.runAfterInteractions(() => resolve()),
      );
      for (const asset of result.assets) {
        const img = await processChatImage(asset, 1080);
        const file: ChatFileAttachment = {
          uri: img.uri,
          name: img.fileName,
          type: img.mimeType,
          size: asset.fileSize,
        };
        setSelectedFiles((prev) => {
          const combined = [...prev, file];
          if (combined.length > 3) {
            Alert.alert('Too many attachments', 'You can attach up to 3 images per message.');
            return prev;
          }
          return combined;
        });
        await new Promise<void>((resolve) =>
          InteractionManager.runAfterInteractions(() => resolve()),
        );
      }
    } catch {
      Alert.alert('Error', 'Could not open image picker.');
    } finally {
      setIsProcessingImages(false);
    }
  }, []);

  const handleRemoveFile = useCallback((idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleStopAllVoices = useCallback((id: string) => {
    setActiveVoiceId(id);
  }, []);

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

  const participant = thread?.participant;

  const handleOpenActions = useCallback(() => {
    if (!participant) return;
    setActionsVisible(true);
  }, [participant]);

  const handleCloseActions = useCallback(() => {
    setActionsVisible(false);
  }, []);

  const handleClearConversation = useCallback(() => {
    handleCloseActions();
    if (!matchId) return;
    themedAlert({
      title: 'Clear conversation?',
      message:
        'This hides the existing messages for you. The other person will still see the chat.',
      icon: 'trash-outline',
      iconColor: colors.danger,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearMessages(matchId, {
              onSuccess: () => {
                themedSuccess('Conversation cleared', 'Only new messages will appear from now on.');
              },
              onError: (error: any) => {
                const status = error?.response?.status;
                const code = error?.response?.data?.code;
                let message = 'Could not clear this conversation. Please try again later.';
                if (status === 403 && code === 'ACCOUNT_NOT_ACTIVE') {
                  message = 'Your account must be active to manage chats.';
                } else if (status === 403 && code === 'MATCH_ACCESS_DENIED') {
                  message = 'You no longer have access to this conversation.';
                } else if (status === 404) {
                  message = 'This match no longer exists.';
                }
                themedError('Clear failed', message);
              },
            });
          },
        },
      ],
    });
  }, [clearMessages, handleCloseActions, matchId]);

  const handleConfirmBlock = useCallback(() => {
    if (!participant?.userId) return;
    blockUser(
      { userId: participant.userId },
      {
        onSuccess: () => {
          themedAlert({
            title: 'User blocked',
            message: `${participant.displayName} has been blocked.`,
            icon: 'ban',
            iconColor: colors.danger,
            buttons: [{ text: 'OK', onPress: () => router.back() }],
          });
        },
        onError: (error: any) => {
          const msg = error?.response?.data?.message;
          themedError(
            'Could not block user',
            msg === 'CANNOT_BLOCK_SELF'
              ? 'You cannot block yourself.'
              : 'Something went wrong. Please try again.',
          );
        },
      },
    );
  }, [blockUser, participant, router]);

  const handleBlock = useCallback(() => {
    handleCloseActions();
    if (!participant) return;
    themedAlert({
      title: 'Block user?',
      message: `Blocking ${participant.displayName} will end the match and hide them from your discovery feed.`,
      icon: 'ban-outline',
      iconColor: colors.danger,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: handleConfirmBlock },
      ],
    });
  }, [handleCloseActions, handleConfirmBlock, participant]);

  const handleOpenReport = useCallback(() => {
    handleCloseActions();
    setSelectedReportType(null);
    setReportDescription('');
    setReportDropdownOpen(false);
    setReportVisible(true);
  }, [handleCloseActions]);

  const handleSubmitReport = useCallback(() => {
    if (!participant?.userId || !selectedReportType) return;
    const body: { report_type: ReportType; description?: string } = {
      report_type: selectedReportType,
    };
    if (reportDescription.trim().length > 0) {
      body.description = reportDescription.trim().slice(0, 2000);
    }
    reportUser(
      { userId: participant.userId, body },
      {
        onSuccess: () => {
          setReportVisible(false);
          setReportDescription('');
          themedSuccess('Report submitted', 'Thank you. Our team will review this conversation.');
        },
        onError: (error: any) => {
          const msg = error?.response?.data?.message;
          themedError(
            'Could not submit report',
            msg === 'CANNOT_REPORT_SELF'
              ? 'You cannot report yourself.'
              : 'Something went wrong. Please try again.',
          );
        },
      },
    );
  }, [participant, reportDescription, reportUser, selectedReportType]);

  const reportButtonDisabled = !selectedReportType || isReporting;

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
          activeVoiceId={activeVoiceId}
          onStopAllVoices={handleStopAllVoices}
        />
      );
    },
    [handleRetry, activeVoiceId, handleStopAllVoices],
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
        onMorePress={participant ? handleOpenActions : undefined}
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
        onSendWithAttachments={handleSendWithAttachments}
        onPickImage={handlePickImage}
        selectedFiles={selectedFiles}
        onRemoveFile={handleRemoveFile}
        bottomInset={insets.bottom}
        onTextChange={onTextChange}
        disabled={isEnded}
        isProcessingImages={isProcessingImages}
        voiceRecorder={voiceRecorder}
        onSendVoice={handleSendVoice}
        voiceQuotaRemaining={voiceQuotaStatus.remaining}
        imageQuotaRemaining={imageQuotaStatus.remaining}
        onQuotaExceeded={handleQuotaExceeded}
      />

      {/* Actions menu */}
      <Modal
        transparent
        visible={actionsVisible}
        animationType="fade"
        onRequestClose={handleCloseActions}
      >
        <Pressable style={styles.actionsOverlay} onPress={handleCloseActions}>
          <View
            style={[
              styles.actionsCard,
              {
                backgroundColor: th.surface,
                borderColor: th.border,
                marginTop: insets.top + 56,
              },
            ]}
          >
            <Pressable
              style={styles.actionsItem}
              onPress={handleOpenReport}
            >
              <Ionicons name="flag-outline" size={18} color={colors.danger} />
              <Text style={[styles.actionsText, { color: colors.danger }]}>Report</Text>
            </Pressable>
            <View style={[styles.actionsDivider, { backgroundColor: th.border }]} />
            <Pressable
              style={[styles.actionsItem, isBlocking && { opacity: 0.6 }]}
              onPress={handleBlock}
              disabled={isBlocking}
            >
              {isBlocking ? (
                <ActivityIndicator size="small" color={th.text} />
              ) : (
                <Ionicons name="ban-outline" size={18} color={th.text} />
              )}
              <Text style={[styles.actionsText, { color: th.text }]}>Block user</Text>
            </Pressable>
            <View style={[styles.actionsDivider, { backgroundColor: th.border }]} />
            <Pressable
              style={[styles.actionsItem, isClearing && { opacity: 0.6 }]}
              onPress={handleClearConversation}
              disabled={isClearing}
            >
              {isClearing ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              )}
              <Text style={[styles.actionsText, { color: colors.danger }]}>Clear conversation</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Report modal */}
      <Modal
        transparent
        visible={reportVisible}
        animationType="slide"
        onRequestClose={() => setReportVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.reportKAV, { paddingBottom: insets.bottom }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={styles.reportBackdrop}
            onPress={() => {
              setReportVisible(false);
              setReportDropdownOpen(false);
            }}
          />
          <Pressable
            style={[styles.reportSheet, { backgroundColor: th.surface }]}
            onPress={() => {}}
          >
            <View style={[styles.reportHandle, { backgroundColor: th.border }]} />
            <Text style={[styles.reportTitle, { color: th.text }]}>Report conversation</Text>
            <Text style={[styles.reportSubtitle, { color: th.textMuted }]}>Why are you reporting {participant?.displayName ?? 'this user'}?</Text>

            <Pressable
              style={[
                styles.reportDropdownBtn,
                {
                  borderColor: reportDropdownOpen ? colors.primary : th.border,
                  backgroundColor: th.backgroundSelected,
                },
              ]}
              onPress={() => {
                Keyboard.dismiss();
                setReportDropdownOpen((prev) => !prev);
              }}
            >
              <Text
                style={[
                  styles.reportDropdownValue,
                  { color: selectedReportType ? th.text : th.textMuted },
                ]}
                numberOfLines={1}
              >
                {selectedReportType
                  ? REPORT_OPTIONS.find((o) => o.type === selectedReportType)?.label
                  : 'Select a reason…'}
              </Text>
              <Ionicons
                name={reportDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={th.textMuted}
              />
            </Pressable>

            {reportDropdownOpen && (
              <ScrollView
                style={[styles.reportOptionsList, { borderColor: th.border, backgroundColor: th.surface }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {REPORT_OPTIONS.map(({ type, label }, idx) => {
                  const selected = selectedReportType === type;
                  return (
                    <Pressable
                      key={type}
                      style={[
                        styles.reportOption,
                        idx < REPORT_OPTIONS.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: th.border,
                        },
                        selected && { backgroundColor: th.backgroundSelected },
                      ]}
                      onPress={() => {
                        setSelectedReportType(type);
                        setReportDropdownOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.reportOptionLabel,
                          { color: selected ? colors.primary : th.text },
                          selected && { fontWeight: '700' },
                        ]}
                      >
                        {label}
                      </Text>
                      {selected && (
                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <TextInput
              style={[
                styles.reportInput,
                {
                  borderColor: th.border,
                  color: th.text,
                  backgroundColor: th.backgroundSelected,
                },
              ]}
              multiline
              numberOfLines={4}
              maxLength={2000}
              placeholder="Add details (optional)"
              placeholderTextColor={th.textMuted}
              value={reportDescription}
              onChangeText={setReportDescription}
              editable={!isReporting}
              textAlignVertical="top"
            />
            <Text style={[styles.reportCharCount, { color: th.textMuted }]}>
              {reportDescription.length}/2000
            </Text>

            <TouchableOpacity
              style={[
                styles.reportSubmitBtn,
                {
                  backgroundColor: reportButtonDisabled ? th.border : colors.danger,
                  opacity: isReporting ? 0.6 : 1,
                },
              ]}
              onPress={handleSubmitReport}
              disabled={reportButtonDisabled}
              activeOpacity={0.85}
            >
              {isReporting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.reportSubmitLabel}>Submit report</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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
  actionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 16,
  },
  actionsCard: {
    alignSelf: 'flex-end',
    width: 240,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    gap: 2,
  },
  actionsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionsText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionsDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  reportKAV: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  reportBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  reportSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 16,
    gap: 14,
  },
  reportHandle: {
    alignSelf: 'center',
    width: 50,
    height: 4,
    borderRadius: 999,
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  reportSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  reportDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reportDropdownValue: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  reportOptionsList: {
    maxHeight: 220,
    borderWidth: 1,
    borderRadius: 14,
  },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reportOptionLabel: {
    fontSize: 15,
    flex: 1,
    marginRight: 12,
  },
  reportInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 110,
    fontSize: 15,
  },
  reportCharCount: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  reportSubmitBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  reportSubmitLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
