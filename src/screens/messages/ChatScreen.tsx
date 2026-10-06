import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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
import { VideoCallStatusBanner } from '@/components/messages/VideoCallStatusBanner';
import { NotificationPromptModal } from '@/components/notifications/NotificationPromptModal';
import { colors } from '@/constants/theme';
import { useActivityStatuses } from '@/hooks/activity/useActivityStatuses';
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
import { useNotificationPrompt } from '@/hooks/notifications/useNotificationPrompt';
import { useBlockUser } from '@/hooks/safety/useBlockUser';
import { useReportUser } from '@/hooks/safety/useReportUser';
import { useTheme } from '@/hooks/use-theme';
import i18n from '@/i18n';
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
  getVoiceChatMsgsStatus
} from '@/utils/entitlements';
import { processChatImage } from '@/utils/imageProcessor';
import { isBlindDateMatch } from '@/utils/matchSource';


// ---------------------------------------------------------------------------
// Screen params
// ---------------------------------------------------------------------------

type RawParams = Record<string, string | string[]>;

// ---------------------------------------------------------------------------
// Message → view-model builder
// ---------------------------------------------------------------------------

const MONTH_KEYS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const;

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = i18n.t(h >= 12 ? 'chat.timePm' : 'chat.timeAm');
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

  if (diffDays === 0) return i18n.t('chat.today');
  if (diffDays === 1) return i18n.t('chat.yesterday');
  return i18n.t('chat.dateLabel', {
    month: i18n.t(`chat.months.${MONTH_KEYS[d.getMonth()]}`),
    day: d.getDate(),
    year: d.getFullYear(),
  });
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

type VmCacheEntry = {
  vm: ChatMessageViewModel;
  groupKey: string;
  deliveryStatus: ServerDeliveryStatus | undefined;
};
type VmCache = WeakMap<ChatMessage, VmCacheEntry>;

function buildListData(
  messages: ChatMessage[],
  receiptState: ReceiptState,
  participantIsTyping: boolean,
  vmCache: VmCache,
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
    const deliveryStatus = deriveDeliveryStatus(msg, receiptState);
    const groupKey = `${isFirstInGroup}_${!!isLastInGroup}_${showTimestamp}_${isFirstInGroup && !msg.isMine}`;

    // Reuse cached VM when the message object reference and grouping context
    // haven't changed — this prevents all MessageBubble components from
    // re-rendering when only one message is added or reconciled.
    const cached = vmCache.get(msg);
    if (cached && cached.groupKey === groupKey && cached.deliveryStatus === deliveryStatus) {
      items.push({ kind: 'message', data: cached.vm });
    } else {
      const vm: ChatMessageViewModel = {
        ...msg,
        deliveryStatus,
        timeLabel: formatTime(msg.createdAt),
        showAvatar: isFirstInGroup && !msg.isMine,
        showTimestamp,
        isFirstInGroup,
        isLastInGroup: !!isLastInGroup,
      };
      vmCache.set(msg, { vm, groupKey, deliveryStatus });
      items.push({ kind: 'message', data: vm });
    }

    prevSenderId = msg.senderUserId;
  }

  if (participantIsTyping) {
    items.push({ kind: 'typing_indicator', id: 'typing' });
  }

  // Reverse for inverted FlatList (newest first)
  const reversed = items.reverse();

  // Deduplicate by key to prevent React "unique key" warnings.
  // Duplicate date separators can appear if pagination overlaps or if
  // mergeMessages introduces the same message twice with different references.
  const seen = new Set<string>();
  const deduped = reversed.filter((item) => {
    const key =
      item.kind === 'message'
        ? (item.data.id ?? item.data.clientMessageId ?? `msg_${item.data.matchId}_${item.data.createdAt}`)
        : item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped;
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

const REPORT_OPTIONS: { type: ReportType; labelKey: string }[] = [
  { type: 'FAKE_PROFILE', labelKey: 'chat.reportOptions.fakeProfile' },
  { type: 'HARASSMENT', labelKey: 'chat.reportOptions.harassment' },
  { type: 'HATE_SPEECH', labelKey: 'chat.reportOptions.hateSpeech' },
  { type: 'INAPPROPRIATE_CONTENT', labelKey: 'chat.reportOptions.inappropriateContent' },
  { type: 'SCAM', labelKey: 'chat.reportOptions.scam' },
  { type: 'UNDERAGE', labelKey: 'chat.reportOptions.underage' },
  { type: 'VIOLENCE_OR_THREATS', labelKey: 'chat.reportOptions.violenceOrThreats' },
  { type: 'PRIVACY_VIOLATION', labelKey: 'chat.reportOptions.privacyViolation' },
  { type: 'OFF_PLATFORM_SOLICITATION', labelKey: 'chat.reportOptions.solicitation' },
  { type: 'SPAM', labelKey: 'chat.reportOptions.spam' },
  { type: 'OTHER', labelKey: 'chat.reportOptions.other' },
];

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  return (
    <View style={stateStyles.wrap}>
      <Text style={[stateStyles.title, { color: th.text }]}>{t('common.somethingWentWrong')}</Text>
      <Text style={[stateStyles.sub, { color: th.textSecondary }]}>
        {t('chat.loadError')}
      </Text>
      <TouchableOpacity
        style={[stateStyles.retryBtn, { backgroundColor: colors.primary }]}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t('chat.retryLoad')}
      >
        <Text style={stateStyles.retryText}>{t('common.retry')}</Text>
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
// Empty conversation — match banner for new matches
// ---------------------------------------------------------------------------

function EmptyChatState({ name }: { name: string }) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  return (
    <View style={emptyStyles.wrap}>
      <View
        style={[
          emptyStyles.iconCircle,
          { backgroundColor: isDark ? '#2A1D44' : '#EDE8F8' },
        ]}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={36} color={colors.primary} />
      </View>
      <Text style={[emptyStyles.title, { color: th.text }]}>
        {t('chat.emptyState.title', { name })}
      </Text>
      <Text style={[emptyStyles.sub, { color: th.textSecondary }]}>
        {t('chat.emptyState.subtitle')}
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
    transform: Platform.OS === 'android' ? [{ scale: -1 }] : [{ scaleY: -1 }],
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 6 },
});

// ---------------------------------------------------------------------------
// ChatScreen
// ---------------------------------------------------------------------------

export default function ChatScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: th } = useTheme();
  const queryClient = useQueryClient();
  const currentUserId = useCurrentUserId();

  // ── Route params ─────────────────────────────────────────────────────────
  const params = useLocalSearchParams() as RawParams;
  const matchId = (params.matchId as string) ?? '';
  const displayName = (params.displayName as string) ?? t('chat.unknownUser');
  const rawAvatar = params.avatarUrl as string | undefined;
  const avatarUrl = rawAvatar && rawAvatar.length > 0 ? rawAvatar : null;
  const isVerified = (params.isVerified as string) === '1';
  // Instant badge before the thread metadata finishes loading.
  const paramIsBlindDate = params.matchSource === 'BLIND_DATE';

  // Guard: if there's no matchId, the route is invalid (e.g. stale notification
  // or persisted navigation state). Redirect to the discovery tab instead of
  // rendering a blank "Unknown User" chat screen.
  useEffect(() => {
    if (!matchId) {
      router.replace('/(app)/(tabs)' as any);
    }
  }, [matchId, router]);

  if (!matchId) {
    return (
      <View style={[styles.screen, { backgroundColor: th.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
  const notifPrompt = useNotificationPrompt();

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
  const vmCacheRef = useRef<VmCache>(new WeakMap());

  const listData = useMemo(
    () => buildListData(messages, receiptState, participantIsTyping, vmCacheRef.current),
    [messages, receiptState, participantIsTyping],
  );

  const listRef = useRef<FlatList<ChatListItem>>(null);

  // ── Chat quota helpers ────────────────────────────────────────────────────
  const voiceQuotaStatus = getVoiceChatMsgsStatus(entitlements);
  const imageQuotaStatus = getImageChatMsgsStatus(entitlements);

  const showQuotaUpsell = useCallback(
    (type: 'voice' | 'image' | 'text', serverMessage?: string) => {
      const isVoice = type === 'voice';
      const isText = type === 'text';
      const subscriptionEnabled = entitlements?.country_settings?.subscription_enabled ?? true;
      const fallbackMessage = isVoice
        ? t('chat.voiceLimitReached')
        : isText
        ? t('chat.messageLimitReached')
        : t('chat.imageLimitReached');
      const baseMessage = serverMessage ?? fallbackMessage;
      const title = isVoice
        ? t('chat.voiceLimitTitle')
        : isText
        ? t('chat.messageLimitTitle')
        : t('chat.imageLimitTitle');
      const icon = isVoice ? 'mic-outline' : isText ? 'chatbubble-outline' : 'image-outline';
      themedAlert({
        title,
        message: baseMessage,
        icon,
        iconColor: colors.warning,
        buttons: [
          ...(subscriptionEnabled ? [{
            text: t('common.goPremium'),
            style: 'default' as const,
            icon: 'crown',
            iconFamily: 'material' as const,
            iconColor: '#FFD700',
            onPress: () => {
              router.push('/(app)/premium' as any);
            },
          }] : []),
          { text: t('common.cancel'), style: 'cancel' as const },
        ],
      });
    },
    [router, entitlements, t],
  );

  const handleQuotaExceeded = useCallback(
    (type: 'voice' | 'image' | 'text') => {
      showQuotaUpsell(type);
    },
    [showQuotaUpsell],
  );

  const handleSend = useCallback(
    async (text: string) => {
      stopTyping();
      const quotaError = await send(text);
      if (quotaError) {
        showQuotaUpsell('text', quotaError.message);
      } else {
        notifPrompt.onMessage();
      }
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 50);
    },
    [send, stopTyping, notifPrompt, showQuotaUpsell],
  );

  const handleSendWithAttachments = useCallback(
    async (text: string, files: ChatFileAttachment[], voiceDurationsMs?: (number | null)[]) => {
      stopTyping();
      const quotaError = await sendWithAttachments(text, files, undefined, voiceDurationsMs);
      if (quotaError) {
        const type = quotaError.actionType === 'VOICE_MESSAGE' ? 'voice' : quotaError.actionType === 'MESSAGE' ? 'text' : 'image';
        showQuotaUpsell(type, quotaError.message);
      } else {
        refreshEntitlements();
      }
      setSelectedFiles([]);
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 50);
    },
    [sendWithAttachments, stopTyping, refreshEntitlements, showQuotaUpsell],
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
        const type = quotaError.actionType === 'VOICE_MESSAGE' ? 'voice' : quotaError.actionType === 'MESSAGE' ? 'text' : 'image';
        showQuotaUpsell(type, quotaError.message);
      } else {
        refreshEntitlements();
      }
      voiceRecorder.deleteRecording();
      setSelectedFiles([]);
      setTimeout(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 50);
    },
    [sendWithAttachments, stopTyping, voiceRecorder, refreshEntitlements, showQuotaUpsell],
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
            Alert.alert(t('chat.tooManyImages'), t('chat.tooManyImagesBody'));
            return prev;
          }
          return combined;
        });
        await new Promise<void>((resolve) =>
          InteractionManager.runAfterInteractions(() => resolve()),
        );
      }
    } catch {
      Alert.alert(t('common.error'), t('chat.attachmentPickerError'));
    } finally {
      setIsProcessingImages(false);
    }
  }, [t]);

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
    // Always land on the messages list regardless of how this screen was
    // reached (notification deep-link, matches tab, etc.).
    // router.back() would return to whatever the previous stack entry was,
    // which is not always the messages tab.
    router.replace('/(app)/(tabs)/messages' as any);
  }, [router]);

  // Intercept the Android hardware back button so it uses handleBack too,
  // rather than the Stack navigator's own goBack() which has the same
  // "goes to previous route" problem as router.back().
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true; // prevent default Stack navigator back
    });
    return () => sub.remove();
  }, [handleBack]);

  const handleProfilePress = useCallback(() => {
    const userId = thread?.participant.userId;
    if (userId) {
      router.push({
        pathname: '/(app)/user-profile' as any,
        params: { userId, matchId },
      });
    }
  }, [router, thread, matchId]);

  // One entry point for both call types — the hub shows the live request if
  // one exists, or offers "Request Video Call" / "Request Audio Call" if not.
  const handleCall = useCallback(() => {
    router.push({
      pathname: '/(app)/video-call' as any,
      params: {
        matchId,
        displayName: thread?.participant.displayName ?? displayName,
        avatarUrl: thread?.participant.avatarUrl ?? avatarUrl ?? '',
      },
    });
  }, [router, matchId, thread, displayName, avatarUrl]);


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
      title: t('chat.clearTitle'),
      message: t('chat.clearBody'),
      icon: 'trash-outline',
      iconColor: colors.danger,
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.clear'),
          style: 'destructive',
          onPress: () => {
            clearMessages(matchId, {
              onSuccess: () => {
                themedSuccess(t('chat.clearSuccessTitle'), t('chat.clearSuccessBody'));
              },
              onError: (error: any) => {
                const status = error?.response?.status;
                const code = error?.response?.data?.code;
                let message = t('chat.clearError');
                if (status === 403 && code === 'ACCOUNT_NOT_ACTIVE') {
                  message = t('chat.accountNotActive');
                } else if (status === 403 && code === 'MATCH_ACCESS_DENIED') {
                  message = t('chat.matchAccessDenied');
                } else if (status === 404) {
                  message = t('chat.matchNotFound');
                }
                themedError(t('chat.clearFailedTitle'), message);
              },
            });
          },
        },
      ],
    });
  }, [clearMessages, handleCloseActions, matchId, t]);

  const handleConfirmBlock = useCallback(() => {
    if (!participant?.userId) return;
    blockUser(
      { userId: participant.userId },
      {
        onSuccess: () => {
          themedAlert({
            title: t('chat.blockedTitle'),
            message: t('chat.blockedBody', { name: participant.displayName }),
            icon: 'ban',
            iconColor: colors.danger,
            buttons: [{ text: t('common.ok'), onPress: () => router.back() }],
          });
        },
        onError: (error: any) => {
          const msg = error?.response?.data?.message;
          themedError(
            t('chat.couldNotBlock'),
            msg === 'CANNOT_BLOCK_SELF'
              ? t('chat.cannotBlockSelf')
              : t('common.somethingWentWrong'),
          );
        },
      },
    );
  }, [blockUser, participant, router, t]);

  const handleBlock = useCallback(() => {
    handleCloseActions();
    if (!participant) return;
    themedAlert({
      title: t('chat.blockTitle'),
      message: t('chat.blockBody', { name: participant.displayName }),
      icon: 'ban-outline',
      iconColor: colors.danger,
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.block'), style: 'destructive', onPress: handleConfirmBlock },
      ],
    });
  }, [handleCloseActions, handleConfirmBlock, participant, t]);

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
          themedSuccess(t('chat.reportSubmitted'), t('chat.reportSubmittedBody'));
        },
        onError: (error: any) => {
          const msg = error?.response?.data?.message;
          themedError(
            t('chat.couldNotSubmitReport'),
            msg === 'CANNOT_REPORT_SELF'
              ? t('chat.cannotReportSelf')
              : t('common.somethingWentWrong'),
          );
        },
      },
    );
  }, [participant, reportDescription, reportUser, selectedReportType, t]);

  const reportButtonDisabled = !selectedReportType || isReporting;

  const keyExtractor = useCallback(
    (item: ChatListItem) => {
      if (item.kind === 'message') {
        // Always return a non-undefined string. Fall back to clientMessageId,
        // then to a composite of matchId + createdAt + body to guarantee uniqueness
        // even if id and clientMessageId are both missing (e.g. malformed data).
        return (
          item.data.id ??
          item.data.clientMessageId ??
          `msg_${item.data.matchId}_${item.data.createdAt}_${item.data.body?.slice(0, 20)}`
        );
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

  // Use the same live batch-status endpoint that the discovery screen uses.
  // The chat-thread endpoint can return a stale activity_status, causing a
  // mismatch where a user appears online in discovery but offline in chat.
  const participantUserId = thread?.participant?.userId ?? null;
  const participantUserIds = useMemo(
    () => (participantUserId ? [participantUserId] : []),
    [participantUserId],
  );
  const { getStatus } = useActivityStatuses(participantUserIds);

  // Priority: live batch status > thread-endpoint polled status > initial thread value
  const headerActivityStatus = participantUserId
    ? (getStatus(participantUserId, polledActivityStatus ?? thread?.participant?.activityStatus ?? null) ?? null)
    : (polledActivityStatus ?? thread?.participant?.activityStatus ?? null);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: th.background }]}
      behavior="padding"
    >
      {/* Fixed header */}
      <ChatHeader
        paddingTop={insets.top}
        displayName={thread?.participant.displayName ?? displayName}
        avatarUrl={avatarUrl ?? thread?.participant.avatarUrl ?? null}
        isVerified={thread?.participant.isVerified ?? isVerified}
        isBlindDate={isBlindDateMatch(thread) || paramIsBlindDate}
        activityStatus={headerActivityStatus}
        onBack={handleBack}
        onProfilePress={handleProfilePress}
        onCallPress={handleCall}
        onMorePress={participant ? handleOpenActions : undefined}
      />

      {/* Live video-call request banner */}
      <VideoCallStatusBanner
        matchId={matchId}
        displayName={thread?.participant.displayName ?? displayName}
        avatarUrl={avatarUrl ?? thread?.participant.avatarUrl ?? null}
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
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          contentContainerStyle={[
            styles.listContent,
            listData.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={
            <EmptyChatState
              name={thread?.participant.displayName ?? displayName}
            />
          }
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
            {t('chat.matchEnded')}
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
        voiceCanUseCredits={voiceQuotaStatus.applyCreditAfterLimit}
        imageCanUseCredits={imageQuotaStatus.applyCreditAfterLimit}
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
              <Text style={[styles.actionsText, { color: colors.danger }]}>{t('common.report')}</Text>
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
              <Text style={[styles.actionsText, { color: th.text }]}>{t('chat.blockUser')}</Text>
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
              <Text style={[styles.actionsText, { color: colors.danger }]}>{t('chat.clearConversation')}</Text>
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
            <Text style={[styles.reportTitle, { color: th.text }]}>{t('chat.reportConversation')}</Text>
            <Text style={[styles.reportSubtitle, { color: th.textMuted }]}>{t('chat.reportSubtitle', { name: participant?.displayName ?? t('chat.thisUser') })}</Text>

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
                  ? t(REPORT_OPTIONS.find((o) => o.type === selectedReportType)?.labelKey ?? 'chat.reportOptions.other')
                  : t('chat.selectReason')}
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
                {REPORT_OPTIONS.map(({ type, labelKey }, idx) => {
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
                        {t(labelKey)}
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
              placeholder={t('chat.reportDetailsPlaceholder')}
              placeholderTextColor={th.textMuted}
              value={reportDescription}
              onChangeText={setReportDescription}
              editable={!isReporting}
              textAlignVertical="top"
            />
            <Text style={[styles.reportCharCount, { color: th.textMuted }]}>
              {t('chat.charCount', { count: reportDescription.length })}
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
                <Text style={styles.reportSubmitLabel}>{t('chat.submitReport')}</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Notification prompt — shown on first message send */}
      <NotificationPromptModal
        visible={notifPrompt.visible}
        isLoading={notifPrompt.isLoading}
        onEnable={notifPrompt.handleEnable}
        onDismiss={notifPrompt.handleDismiss}
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
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
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
