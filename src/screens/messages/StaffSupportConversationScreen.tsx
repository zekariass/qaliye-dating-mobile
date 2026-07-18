import { useAudioPlayer, useAudioPlayerStatus } from '@/utils/expoAudio';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Animated,
    AppState,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStaffAttachmentDownloadUrl } from '@/api/support/staffSupportApi';
import { DateSeparator } from '@/components/messages/DateSeparator';
import { SupportImageAttachment, isImageAttachment } from '@/components/messages/SupportImageAttachment';
import { SupportVoiceMessage, isVoiceAttachment } from '@/components/messages/SupportVoiceMessage';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useMarkStaffRead } from '@/hooks/support/useMarkStaffRead';
import { useSendStaffMessage } from '@/hooks/support/useSendStaffMessage';
import { useStaffAttachmentDownload } from '@/hooks/support/useStaffAttachmentDownload';
import {
    useCloseStaffConversation,
    useReopenStaffConversation,
} from '@/hooks/support/useStaffConversationActions';
import { useStaffConversationDetail } from '@/hooks/support/useStaffConversationDetail';
import { useStaffMessages } from '@/hooks/support/useStaffMessages';
import { useStaffNotes } from '@/hooks/support/useStaffNotes';
import { useStaffPriority } from '@/hooks/support/useStaffPriority';
import { useVoiceRecorder } from '@/hooks/support/useVoiceRecorder';
import { useTheme } from '@/hooks/use-theme';
import type {
    StaffConversationDetailDto,
    StaffNoteDto,
    SupportAttachment,
    SupportConversationStatus,
    SupportFileAttachment,
    SupportMessageDto,
    SupportPendingMessage
} from '@/types/support';
import {
    SUPPORT_ALLOWED_MIME_TYPES,
    SUPPORT_MAX_ATTACHMENTS,
    SUPPORT_MAX_FILE_SIZE,
} from '@/types/support';
import { isImageMimeType, processChatImage } from '@/utils/imageProcessor';

const POLL_INTERVAL = Number(process.env.EXPO_PUBLIC_SUPPORT_POLL_INTERVAL_MS) || 30_000;

// ---------------------------------------------------------------------------
// List item types
// ---------------------------------------------------------------------------

type StaffListItem =
  | { kind: 'message'; data: SupportMessageDto }
  | { kind: 'pending'; data: SupportPendingMessage }
  | { kind: 'date_separator'; id: string; label: string };

// ---------------------------------------------------------------------------
// Helpers (shared with user screen)
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
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function buildListData(
  messages: SupportMessageDto[],
  pending: SupportPendingMessage[],
): StaffListItem[] {
  const sorted = [...messages].sort((a, b) => a.sequence_number - b.sequence_number);
  const items: StaffListItem[] = [];
  let prevDateKey = '';

  for (const msg of sorted) {
    const dateKey = new Date(msg.created_at).toDateString();
    if (dateKey !== prevDateKey) {
      items.push({ kind: 'date_separator', id: `sep_${dateKey}`, label: formatDateLabel(msg.created_at) });
      prevDateKey = dateKey;
    }
    items.push({ kind: 'message', data: msg });
  }

  for (const pm of pending) {
    const dateKey = new Date(pm.createdAt).toDateString();
    if (dateKey !== prevDateKey) {
      items.push({ kind: 'date_separator', id: `sep_${dateKey}_p`, label: formatDateLabel(pm.createdAt) });
      prevDateKey = dateKey;
    }
    items.push({ kind: 'pending', data: pm });
  }

  return items.reverse();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AttachmentChip({
  attachment,
  onOpen,
  isOpening,
}: {
  attachment: SupportAttachment;
  onOpen: (id: string) => void;
  isOpening: boolean;
}) {
  const { colors: th } = useTheme();
  if (isVoiceAttachment(attachment) || isImageAttachment(attachment)) {
    return null;
  }
  return (
    <TouchableOpacity
      style={[chipStyles.chip, { backgroundColor: th.surface, borderColor: th.border }]}
      onPress={() => onOpen(attachment.id)}
      disabled={isOpening}
      accessibilityRole="button"
      accessibilityLabel={`Open attachment: ${attachment.file_name}`}
    >
      {isOpening ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 4 }} />
      ) : (
        <Ionicons name="attach" size={14} color={colors.primary} style={{ marginRight: 4 }} />
      )}
      <Text style={[chipStyles.name, { color: th.text }]} numberOfLines={1}>
        {attachment.file_name}
      </Text>
    </TouchableOpacity>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    maxWidth: 200,
  },
  name: { fontSize: 12, flexShrink: 1 },
});

function StaffMessageBubble({
  msg,
  userDisplayName,
  onOpenAttachment,
  openingAttachmentId,
  activeVoiceId,
  onStopAllVoices,
  downloadUrlFetcher,
}: {
  msg: SupportMessageDto;
  userDisplayName: string;
  onOpenAttachment: (id: string) => void;
  openingAttachmentId: string | null;
  activeVoiceId: string | null;
  onStopAllVoices: (id: string) => void;
  downloadUrlFetcher: (attachmentId: string) => Promise<{ download_url: string }>;
}) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  // For staff: STAFF messages are "mine" (right side), USER messages are "theirs" (left side)
  const isMine = msg.sender_type === 'STAFF';
  const timeLabel = formatTime(msg.created_at);

  const bubbleBg = isMine
    ? colors.primary
    : isDark ? '#2A1D44' : '#EDE8F8';
  const textColor = isMine ? '#FFFFFF' : th.text;

  const voiceAttachments = msg.attachments.filter(isVoiceAttachment);
  const imageAttachments = msg.attachments.filter(isImageAttachment);
  const nonVoiceAttachments = msg.attachments.filter(
    (a) => !isVoiceAttachment(a) && !isImageAttachment(a),
  );

  return (
    <View style={[bubbleStyles.row, isMine ? bubbleStyles.outRow : bubbleStyles.inRow]}>
      {!isMine && (
        <View style={[bubbleStyles.userAvatar, { backgroundColor: isDark ? '#1A2A4A' : '#E0E8FF' }]}>
          <Ionicons name="person" size={14} color="#3B82F6" />
        </View>
      )}
      <View style={bubbleStyles.content}>
        {!isMine && (
          <Text style={[bubbleStyles.senderLabel, { color: '#3B82F6' }]} numberOfLines={1}>
            {msg.sender_display_name || userDisplayName}
          </Text>
        )}
        {isMine && msg.sender_display_name && (
          <Text style={[bubbleStyles.senderLabel, { color: colors.primary, textAlign: 'right' }]} numberOfLines={1}>
            {msg.sender_display_name}
          </Text>
        )}
        <View style={[bubbleStyles.bubble, { backgroundColor: bubbleBg }]}>
          {msg.body ? (
            <Text style={[bubbleStyles.bodyText, { color: textColor }]}>{msg.body}</Text>
          ) : null}
          {voiceAttachments.map((att) => (
            <SupportVoiceMessage
              key={att.id}
              attachment={att}
              isOutgoing={isMine}
              isActive={true}
              activeVoiceId={activeVoiceId}
              onStopAllOthers={onStopAllVoices}
              downloadUrlFetcher={downloadUrlFetcher}
            />
          ))}
          {imageAttachments.map((att) => (
            <SupportImageAttachment
              key={att.id}
              attachment={att}
              isOutgoing={isMine}
            />
          ))}
          {nonVoiceAttachments.map((att) => (
            <AttachmentChip
              key={att.id}
              attachment={att}
              onOpen={onOpenAttachment}
              isOpening={openingAttachmentId === att.id}
            />
          ))}
        </View>
        <Text style={[bubbleStyles.time, { color: th.textMuted }]}>{timeLabel}</Text>
      </View>
    </View>
  );
}

const BUBBLE_MAX_WIDTH = '75%';

const bubbleStyles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, paddingVertical: 3, flexDirection: 'row', alignItems: 'flex-end' },
  inRow: { justifyContent: 'flex-start' },
  outRow: { justifyContent: 'flex-end' },
  userAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 8, flexShrink: 0 },
  content: { maxWidth: BUBBLE_MAX_WIDTH },
  senderLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2, marginLeft: 2 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bodyText: { fontSize: fontSize.base - 1, lineHeight: 22 },
  time: { fontSize: 11, marginTop: 3, marginHorizontal: 2 },
});

function PendingBubble({
  pm,
  onRetry,
  onDismiss,
}: {
  pm: SupportPendingMessage;
  onRetry: (pm: SupportPendingMessage) => void;
  onDismiss: (id: string) => void;
}) {
  const { colors: th } = useTheme();
  const isFailed = pm.localSendStatus === 'FAILED';

  return (
    <View style={[bubbleStyles.row, bubbleStyles.outRow]}>
      <View style={bubbleStyles.content}>
        <View style={[bubbleStyles.bubble, { backgroundColor: isFailed ? '#FEE2E2' : colors.primary, opacity: isFailed ? 1 : 0.7 }]}>
          {pm.body ? (
            <Text style={[bubbleStyles.bodyText, { color: isFailed ? '#DC2626' : '#FFFFFF' }]}>{pm.body}</Text>
          ) : null}
          {pm.files.length > 0 && (
            <Text style={{ color: isFailed ? '#DC2626' : '#FFFFFF', fontSize: 12, marginTop: 2 }}>
              {pm.files.length} file{pm.files.length > 1 ? 's' : ''}
            </Text>
          )}
          {pm.voiceDurationsMs && pm.voiceDurationsMs.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons name="mic" size={12} color={isFailed ? '#DC2626' : '#FFFFFF'} />
              <Text style={{ color: isFailed ? '#DC2626' : '#FFFFFF', fontSize: 12 }}>
                {pm.voiceDurationsMs.filter((d): d is number => d != null).map((d) => `${Math.round(d / 1000)}s`).join(', ')}
              </Text>
            </View>
          )}
        </View>
        {isFailed && pm.errorMessage ? (
          <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 2, marginHorizontal: 2 }}>
            {pm.errorMessage}
          </Text>
        ) : null}
        {isFailed ? (
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 3 }}>
            <TouchableOpacity onPress={() => onRetry(pm)} accessibilityRole="button" accessibilityLabel="Retry sending">
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDismiss(pm.clientMessageId)} accessibilityRole="button" accessibilityLabel="Dismiss failed message">
              <Text style={{ color: th.textMuted, fontSize: 12 }}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
            <ActivityIndicator size="small" color={th.textMuted} style={{ transform: [{ scale: 0.7 }] }} />
            <Text style={{ color: th.textMuted, fontSize: 11, marginLeft: 4 }}>Sending…</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Voice preview bar (after stop, before send) — themed + local playback
// ---------------------------------------------------------------------------

function VoicePreviewBar({
  durationMs,
  uri,
  onDelete,
  onRecordAgain,
}: {
  durationMs: number;
  uri: string;
  onDelete: () => void;
  onRecordAgain: () => void;
}) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const isPlaying = status.playing;
  const isBuffering = status.isBuffering;
  const currentTime = status.currentTime || 0;
  const totalDuration = status.duration > 0 ? status.duration : durationMs / 1000;
  const progress = totalDuration > 0 ? Math.min(currentTime / totalDuration, 1) : 0;

  useEffect(() => () => { try { player.pause(); } catch { /* noop */ } }, [player]);

  const handlePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      if (status.duration > 0 && status.currentTime >= status.duration - 0.1) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  return (
    <View style={[
      pvStyles.wrapper,
      { backgroundColor: isDark ? '#1C1400' : '#FFFBEB', borderColor: isDark ? '#4A3000' : '#FDE68A' },
    ]}>
      <TouchableOpacity
        onPress={handlePlayPause}
        style={[pvStyles.playBtn, { backgroundColor: '#F59E0B' }]}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause' : 'Play preview'}
      >
        {isBuffering
          ? <ActivityIndicator size="small" color="#FFF" />
          : <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#FFF" />
        }
      </TouchableOpacity>
      <View style={pvStyles.middle}>
        <View style={[pvStyles.track, { backgroundColor: isDark ? '#4A3000' : '#FDE68A' }]}>
          <View style={[pvStyles.fill, { backgroundColor: '#F59E0B', width: `${Math.round(progress * 100)}%` as `${number}%` }]} />
        </View>
        <View style={pvStyles.timeRow}>
          <Text style={[pvStyles.timeText, { color: th.textMuted }]}>
            {formatRecordingTime(Math.round(currentTime * 1000))}
          </Text>
          <Text style={[pvStyles.timeText, { color: th.textMuted }]}>
            {formatRecordingTime(durationMs)}
          </Text>
        </View>
      </View>
      <View style={pvStyles.actions}>
        <TouchableOpacity
          onPress={onRecordAgain}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('support.recordAgain')}
        >
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('support.deleteRecording')}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const pvStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: spacing.md,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  playBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, gap: 5 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, minWidth: 4 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontSize: 11, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 14, alignItems: 'center' },
});

// ---------------------------------------------------------------------------
// Composer (reused from user screen with minor label differences)
// ---------------------------------------------------------------------------

function formatRecordingTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

const WAVEFORM_BARS = 5;
const WAVEFORM_HEIGHTS = [0.4, 0.7, 1.0, 0.7, 0.4];

function StaffVoiceRecordingBar({
  durationMs,
  onStop,
  onCancel,
}: {
  durationMs: number;
  onStop: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const dotOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [dotOpacity]);

  const waveAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(waveAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [waveAnim]);

  const containerBg = isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)';
  const containerBorder = isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)';

  return (
    <View style={[staffRecStyles.wrapper, { backgroundColor: containerBg, borderColor: containerBorder }]}>
      <TouchableOpacity
        onPress={onCancel}
        style={staffRecStyles.cancelBtn}
        accessibilityRole="button"
        accessibilityLabel={t('support.cancelRecording')}
      >
        <Ionicons name="close" size={22} color={colors.danger} />
      </TouchableOpacity>
      <View style={staffRecStyles.centerSection}>
        <Animated.View style={[staffRecStyles.recDot, { opacity: dotOpacity }]} />
        <Text style={[staffRecStyles.timer, { color: th.text }]} accessibilityLabel={t('support.recording')}>
          {formatRecordingTime(durationMs)}
        </Text>
        <View style={staffRecStyles.waveform}>
          {Array.from({ length: WAVEFORM_BARS }).map((_, i) => (
            <Animated.View
              key={i}
              style={[
                staffRecStyles.waveBar,
                {
                  backgroundColor: colors.danger,
                  transform: [{
                    scaleY: waveAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [WAVEFORM_HEIGHTS[i] * 0.5, WAVEFORM_HEIGHTS[i], WAVEFORM_HEIGHTS[i] * 0.5],
                    }),
                  }],
                },
              ]}
            />
          ))}
        </View>
      </View>
      <TouchableOpacity
        onPress={onStop}
        style={staffRecStyles.stopBtn}
        accessibilityRole="button"
        accessibilityLabel={t('support.stopRecording')}
      >
        <Ionicons name="stop" size={18} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const staffRecStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginVertical: 8,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: 10,
  },
  cancelBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.danger,
  },
  timer: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
    marginLeft: 2,
  },
  waveBar: {
    width: 3,
    height: 20,
    borderRadius: 1.5,
  },
  stopBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function StaffComposer({
  onSend,
  disabled,
  selectedFiles,
  onPickImage,
  onRemoveFile,
  bottomInset,
  isSending,
  voiceRecorder,
  onSendVoice,
}: {
  onSend: (text: string, files: SupportFileAttachment[]) => void;
  disabled: boolean;
  selectedFiles: SupportFileAttachment[];
  onPickImage: () => void;
  onRemoveFile: (idx: number) => void;
  bottomInset: number;
  isSending: boolean;
  voiceRecorder: ReturnType<typeof useVoiceRecorder>;
  onSendVoice: (text: string) => void;
}) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const [text, setText] = useState('');

  const isRecording = voiceRecorder.isRecording;
  const hasRecording = voiceRecorder.recording !== null;
  const showNormalComposer = !isRecording && !hasRecording;

  const canSend = !disabled && !isSending && (text.trim().length > 0 || selectedFiles.length > 0);
  const canSendVoice = !disabled && !isSending && hasRecording;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim(), selectedFiles);
    setText('');
  };

  const handleSendVoice = () => {
    if (!canSendVoice) return;
    onSendVoice(text.trim());
    setText('');
  };

  const handleMicPress = () => {
    if (voiceRecorder.error) {
      Alert.alert(t('support.title'), voiceRecorder.error.message);
      return;
    }
    voiceRecorder.startRecording();
  };

  return (
    <View style={[composerStyles.wrapper, { backgroundColor: isDark ? th.background : '#FAFAFA', paddingBottom: Math.max(bottomInset, spacing.sm), borderTopColor: isDark ? th.border : '#EEE6FF' }]}>
      {/* Recording bar */}
      {isRecording && (
        <StaffVoiceRecordingBar
          durationMs={voiceRecorder.durationMs}
          onStop={() => voiceRecorder.stopRecording()}
          onCancel={() => voiceRecorder.cancelRecording()}
        />
      )}

      {/* Voice preview bar + send */}
      {!isRecording && hasRecording && voiceRecorder.recording && (
        <View>
          <VoicePreviewBar
            durationMs={voiceRecorder.recording.durationMs}
            uri={voiceRecorder.recording.uri}
            onDelete={voiceRecorder.deleteRecording}
            onRecordAgain={() => {
              voiceRecorder.deleteRecording();
              voiceRecorder.startRecording();
            }}
          />
          {selectedFiles.length > 0 && (
            <View style={composerStyles.previewStrip}>
              {selectedFiles.map((f, i) => (
                <View key={`${f.uri}_${i}`} style={[composerStyles.previewChip, { borderColor: th.border }]}>
                  <Ionicons name="image-outline" size={14} color={colors.primary} />
                  <Text style={[composerStyles.previewName, { color: th.text }]} numberOfLines={1}>{f.name}</Text>
                  <TouchableOpacity
                    onPress={() => onRemoveFile(i)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${f.name}`}
                  >
                    <Ionicons name="close-circle" size={16} color={th.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={composerStyles.row}>
            <TouchableOpacity
              style={[composerStyles.circleBtn, { borderColor: isDark ? '#5A3FA0' : '#C4AEF0', opacity: disabled ? 0.4 : 1 }]}
              onPress={onPickImage}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={t('support.attachImage')}
            >
              <Ionicons name="image-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <View style={[composerStyles.inputWrap, { backgroundColor: isDark ? th.surface : '#FFF', borderColor: isDark ? th.border : '#E4D9F7' }]}>
              <TextInput
                style={[composerStyles.input, { color: th.text }]}
                value={text}
                onChangeText={setText}
                editable={!disabled}
                placeholder={disabled ? t('support.closedPlaceholder') : t('support.typePlaceholder')}
                placeholderTextColor={isDark ? '#6B6080' : '#B0A0CC'}
                multiline
                maxLength={4000}
                returnKeyType="default"
                blurOnSubmit={false}
                accessibilityLabel="Message input"
              />
            </View>
            <TouchableOpacity
              style={[composerStyles.sendBtn, { backgroundColor: canSendVoice ? colors.primary : (isDark ? '#3A2060' : '#DDD0F8') }]}
              onPress={handleSendVoice}
              disabled={!canSendVoice}
              accessibilityRole="button"
              accessibilityLabel={t('support.sendVoiceMessage')}
              accessibilityState={{ disabled: !canSendVoice }}
            >
              {isSending
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Ionicons name="send" size={18} color={canSendVoice ? '#FFF' : (isDark ? '#7A60A0' : '#B8A0E0')} />
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Normal composer */}
      {showNormalComposer && (
        <>
          {selectedFiles.length > 0 && (
            <View style={composerStyles.previewStrip}>
              {selectedFiles.map((f, i) => (
                <View key={`${f.uri}_${i}`} style={[composerStyles.previewChip, { borderColor: th.border }]}>
                  <Ionicons name="image-outline" size={14} color={colors.primary} />
                  <Text style={[composerStyles.previewName, { color: th.text }]} numberOfLines={1}>{f.name}</Text>
                  <TouchableOpacity
                    onPress={() => onRemoveFile(i)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${f.name}`}
                  >
                    <Ionicons name="close-circle" size={16} color={th.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={composerStyles.row}>
            <TouchableOpacity
              style={[composerStyles.circleBtn, { borderColor: isDark ? '#5A3FA0' : '#C4AEF0', opacity: disabled ? 0.4 : 1 }]}
              onPress={onPickImage}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={t('support.attachImage')}
            >
              <Ionicons name="image-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <View style={[composerStyles.inputWrap, { backgroundColor: isDark ? th.surface : '#FFF', borderColor: isDark ? th.border : '#E4D9F7' }]}>
              <TextInput
                style={[composerStyles.input, { color: th.text }]}
                value={text}
                onChangeText={setText}
                editable={!disabled}
                placeholder={disabled ? t('support.closedPlaceholder') : t('support.typePlaceholder')}
                placeholderTextColor={isDark ? '#6B6080' : '#B0A0CC'}
                multiline
                maxLength={4000}
                returnKeyType="default"
                blurOnSubmit={false}
                accessibilityLabel="Message input"
              />
            </View>
            <TouchableOpacity
              style={[composerStyles.circleBtn, { borderColor: isDark ? '#5A3FA0' : '#C4AEF0', opacity: disabled ? 0.4 : 1 }]}
              onPress={handleMicPress}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={t('support.recordVoiceMessage')}
            >
              <Ionicons name="mic-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[composerStyles.sendBtn, { backgroundColor: canSend ? colors.primary : (isDark ? '#3A2060' : '#DDD0F8') }]}
              onPress={handleSend}
              disabled={!canSend}
              accessibilityRole="button"
              accessibilityLabel={t('support.sendMessage')}
              accessibilityState={{ disabled: !canSend }}
            >
              {isSending
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Ionicons name="send" size={18} color={canSend ? '#FFF' : (isDark ? '#7A60A0' : '#B8A0E0')} />
              }
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Error display */}
      {voiceRecorder.error && !isRecording && (
        <Text style={[composerStyles.errorText, { color: colors.danger }]}>
          {voiceRecorder.error.message}
        </Text>
      )}
    </View>
  );
}

const BTN_SIZE = 42;

const composerStyles = StyleSheet.create({
  wrapper: { borderTopWidth: StyleSheet.hairlineWidth },
  previewStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: spacing.md, paddingTop: 6 },
  previewChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, maxWidth: 160, gap: 4 },
  previewName: { fontSize: 11, flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.sm + 2, gap: 8 },
  circleBtn: { width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE / 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  inputWrap: { flex: 1, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, minHeight: 44, maxHeight: 120 },
  input: { fontSize: 15, lineHeight: 21, paddingTop: Platform.OS === 'ios' ? 2 : 0, paddingBottom: Platform.OS === 'ios' ? 2 : 0, maxHeight: 100 },
  sendBtn: { width: BTN_SIZE, height: BTN_SIZE, borderRadius: BTN_SIZE / 2, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  errorText: { fontSize: 12, paddingHorizontal: spacing.md, paddingBottom: 4 },
});

// ---------------------------------------------------------------------------
// Priority / Assignment info bar
// ---------------------------------------------------------------------------

const PRIORITY_COLORS: Record<number, string> = {
  1: '#9CA3AF',
  2: '#3B82F6',
  3: '#F59E0B',
  4: '#F97316',
  5: '#EF4444',
};

function ConversationInfoBar({
  conversation,
  onSetPriority,
  isSettingPriority,
}: {
  conversation: StaffConversationDetailDto;
  onSetPriority: (p: number) => void;
  isSettingPriority: boolean;
}) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <View style={[infoStyles.bar, { backgroundColor: isDark ? '#0D0820' : '#F8F5FF', borderBottomColor: th.border }]}>
      {/* Priority buttons */}
      <View style={infoStyles.section}>
        <Text style={[infoStyles.sectionLabel, { color: th.textMuted }]}>PRIORITY</Text>
        <View style={infoStyles.priorityRow}>
          {[1, 2, 3, 4, 5].map((p) => {
            const active = conversation.priority === p;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => onSetPriority(p)}
                disabled={isSettingPriority}
                style={[
                  infoStyles.priorityBtn,
                  {
                    backgroundColor: active ? PRIORITY_COLORS[p] : 'transparent',
                    borderColor: PRIORITY_COLORS[p],
                  },
                ]}
              >
                <Text
                  style={[
                    infoStyles.priorityBtnText,
                    { color: active ? '#FFF' : PRIORITY_COLORS[p] },
                  ]}
                >
                  P{p}
                </Text>
              </TouchableOpacity>
            );
          })}
          {isSettingPriority && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 4 }} />}
        </View>
      </View>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  section: { flexDirection: 'column', gap: 5 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priorityBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBtnText: { fontSize: 14, fontWeight: '800' },
});

// ---------------------------------------------------------------------------
// Notes panel (modal)
// ---------------------------------------------------------------------------

function formatNoteTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function NotesPanel({
  conversationId,
  visible,
  onClose,
}: {
  conversationId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const insets = useSafeAreaInsets();
  const { notes, isLoading, addNote, isAdding, addError } = useStaffNotes(conversationId);
  const [noteText, setNoteText] = useState('');

  const handleSubmit = useCallback(async () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    try {
      await addNote(trimmed);
      setNoteText('');
    } catch { /* shown via addError */ }
  }, [noteText, addNote]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[notesStyles.root, { backgroundColor: th.background }]}
        behavior="padding"
      >
        {/* Header */}
        <View style={[notesStyles.header, { paddingTop: insets.top + 12, borderBottomColor: th.border }]}>
          <View style={notesStyles.headerLeft}>
            <Ionicons name="document-text-outline" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={[notesStyles.title, { color: th.text }]}>Internal Notes</Text>
            {notes.length > 0 && (
              <View style={notesStyles.countBadge}>
                <Text style={notesStyles.countText}>{notes.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={notesStyles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close notes"
          >
            <Ionicons name="close" size={22} color={th.text} />
          </TouchableOpacity>
        </View>

        {/* Notes list */}
        {isLoading ? (
          <View style={notesStyles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={notesStyles.listContent} keyboardShouldPersistTaps="handled">
            {notes.length === 0 ? (
              <View style={notesStyles.emptyState}>
                <Ionicons name="document-text-outline" size={44} color={th.textMuted} />
                <Text style={[notesStyles.emptyText, { color: th.textMuted }]}>
                  No internal notes yet
                </Text>
                <Text style={[notesStyles.emptySub, { color: th.textSecondary }]}>
                  Notes are only visible to staff
                </Text>
              </View>
            ) : (
              notes.map((note: StaffNoteDto) => (
                <View
                  key={note.id}
                  style={[
                    notesStyles.noteCard,
                    {
                      backgroundColor: isDark ? '#1A1232' : '#FFFBEB',
                      borderColor: isDark ? '#3A2A5A' : '#FDE68A',
                    },
                  ]}
                >
                  <Text style={[notesStyles.noteBody, { color: th.text }]}>{note.body}</Text>
                  <Text style={[notesStyles.noteMeta, { color: th.textMuted }]}>
                    {note.staff_display_name || 'Unknown staff'} · {formatNoteTime(note.created_at)}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* Composer */}
        <View
          style={[notesStyles.composer, { backgroundColor: isDark ? '#0D0820' : '#FFFBEB', borderTopColor: th.border, paddingBottom: insets.bottom + 8 }]}
        >
          {addError && (
            <Text style={notesStyles.addError}>Failed to save note. Try again.</Text>
          )}
          <View style={notesStyles.inputRow}>
            <TextInput
              style={[
                notesStyles.input,
                { color: th.text, borderColor: th.border, backgroundColor: th.background },
              ]}
              placeholder="Write an internal note..."
              placeholderTextColor={th.textMuted}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                notesStyles.submitBtn,
                { backgroundColor: noteText.trim() ? '#F59E0B' : (isDark ? '#2A2A3A' : '#E5E7EB') },
              ]}
              onPress={handleSubmit}
              disabled={!noteText.trim() || isAdding}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="send" size={15} color={noteText.trim() ? '#FFF' : th.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const notesStyles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700' },
  countBadge: {
    marginLeft: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: spacing.md, gap: 10 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15, fontWeight: '600' },
  emptySub: { fontSize: 13 },
  noteCard: { borderRadius: 10, padding: 12, borderWidth: 1, gap: 4 },
  noteBody: { fontSize: 14, lineHeight: 21 },
  noteMeta: { fontSize: 11 },
  composer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingTop: 10 },
  addError: { color: '#EF4444', fontSize: 12, marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 100,
  },
  submitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function StaffSupportConversationScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const { colors: th } = useTheme();
  const [isActive, setIsActive] = useState(true);
  const [isFocused, setIsFocused] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<SupportFileAttachment[]>([]);
  const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const voiceRecorder = useVoiceRecorder();

  const pollInterval = isActive && isFocused ? POLL_INTERVAL : (false as const);

  const { conversation, isLoading: convLoading, isError: convError, refetch: convRefetch } =
    useStaffConversationDetail(conversationId, { refetchInterval: pollInterval });
  const { messages, isLoading: msgsLoading, isError: msgsError, isFetchingNextPage, hasNextPage, fetchNextPage, refetch: msgsRefetch } =
    useStaffMessages(conversationId, { refetchInterval: pollInterval });
  const { send, retry, dismissFailed, pendingMessages, isSending } = useSendStaffMessage(conversationId);
  const { markRead } = useMarkStaffRead(conversationId);
  const { close, isClosing } = useCloseStaffConversation(conversationId);
  const { reopen, isReopening } = useReopenStaffConversation(conversationId);
  const { openAttachment, openingAttachmentId } = useStaffAttachmentDownload(conversationId);
  const { setPriority, isSettingPriority } = useStaffPriority(conversationId);
  const { notes } = useStaffNotes(conversationId);

  const listRef = useRef<FlatList<StaffListItem>>(null);
  const status: SupportConversationStatus = conversation?.status ?? 'IDLE';
  const isClosed = status === 'CLOSED';
  const isLoading = convLoading || msgsLoading;

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      convRefetch();
      msgsRefetch();
      return () => setIsFocused(false);
    }, [convRefetch, msgsRefetch]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setIsActive(state === 'active');
      if (state === 'active') {
        convRefetch();
        msgsRefetch();
      }
    });
    return () => sub.remove();
  }, [convRefetch, msgsRefetch]);

  // Mark read after messages load — staff uses my_last_read_sequence
  const highestSeq = useMemo(
    () => (messages.length > 0 ? Math.max(...messages.map((m) => m.sequence_number)) : 0),
    [messages],
  );

  useEffect(() => {
    if (!isFocused || !isActive || highestSeq <= 0 || !conversation) return;
    if (highestSeq > conversation.my_last_read_sequence) {
      markRead(highestSeq);
    }
  }, [isFocused, isActive, highestSeq, conversation, markRead]);

  const listData = useMemo(
    () => buildListData(messages, pendingMessages),
    [messages, pendingMessages],
  );

  const userDisplayName = useMemo(
    () => conversation?.user_display_name || `User ${conversation?.user_id.slice(0, 8) ?? ''}`,
    [conversation?.user_display_name, conversation?.user_id],
  );

  const handleSend = useCallback(
    (text: string, files: SupportFileAttachment[]) => {
      setSelectedFiles([]);
      send(text || null, files);
      setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);
    },
    [send],
  );

  const handleSendVoice = useCallback(
    (text: string) => {
      const rec = voiceRecorder.recording;
      if (!rec) return;
      const allFiles: SupportFileAttachment[] = [
        ...selectedFiles,
        { uri: rec.uri, name: rec.fileName, type: rec.mimeType, size: rec.fileSizeBytes },
      ];
      const voiceDurations = [...selectedFiles.map(() => null as number | null), rec.durationMs];
      setSelectedFiles([]);
      voiceRecorder.deleteRecording();
      send(text || null, allFiles, undefined, voiceDurations);
      setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);
    },
    [send, voiceRecorder, selectedFiles],
  );

  const handleStopAllVoices = useCallback(
    (currentId: string) => {
      setActiveVoiceId(currentId);
    },
    [],
  );

  const staffDownloadUrlFetcher = useCallback(
    (attachmentId: string) => getStaffAttachmentDownloadUrl(conversationId, attachmentId),
    [conversationId],
  );

  const handlePickImage = useCallback(async () => {
    const { status: permStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permStatus !== 'granted') {
      Alert.alert(t('support.title'), t('support.attachmentPickerError'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: SUPPORT_MAX_ATTACHMENTS - selectedFiles.length,
      quality: 0.9,
    });
    if (result.canceled) return;
    const newFiles: SupportFileAttachment[] = [];
    for (const asset of result.assets) {
      if (selectedFiles.length + newFiles.length >= SUPPORT_MAX_ATTACHMENTS) {
        Alert.alert(t('support.title'), t('support.tooManyAttachments'));
        break;
      }
      if (asset.fileSize && asset.fileSize > SUPPORT_MAX_FILE_SIZE) {
        Alert.alert(t('support.title'), t('support.attachmentTooLarge'));
        continue;
      }
      const mimeType = asset.mimeType ?? 'image/jpeg';
      if (!SUPPORT_ALLOWED_MIME_TYPES.includes(mimeType as typeof SUPPORT_ALLOWED_MIME_TYPES[number])) {
        Alert.alert(t('support.title'), t('support.attachmentWrongType'));
        continue;
      }
      if (isImageMimeType(mimeType)) {
        const img = await processChatImage(asset);
        newFiles.push({ uri: img.uri, name: img.fileName, type: img.mimeType, size: asset.fileSize });
      } else {
        const name = asset.fileName ?? `file_${Date.now()}`;
        newFiles.push({ uri: asset.uri, name, type: mimeType, size: asset.fileSize });
      }
    }
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  }, [selectedFiles.length, t]);

  const handleClose = useCallback(() => {
    Alert.alert(
      t('support.closeConfirmTitle'),
      t('support.closeConfirmBody'),
      [
        { text: t('support.closeConfirmNo'), style: 'cancel' },
        {
          text: t('support.closeConfirmYes'),
          style: 'destructive',
          onPress: () => close(),
        },
      ],
    );
  }, [close, t]);

  const handleReopen = useCallback(() => {
    reopen();
  }, [reopen]);

  const keyExtractor = useCallback((item: StaffListItem) => {
    if (item.kind === 'message') return item.data.id;
    if (item.kind === 'pending') return item.data.clientMessageId;
    return item.id;
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: StaffListItem }) => {
      if (item.kind === 'date_separator') return <DateSeparator label={item.label} />;
      if (item.kind === 'pending') {
        return (
          <PendingBubble
            pm={item.data}
            onRetry={retry}
            onDismiss={dismissFailed}
          />
        );
      }
      return (
        <StaffMessageBubble
          msg={item.data}
          userDisplayName={userDisplayName}
          onOpenAttachment={openAttachment}
          openingAttachmentId={openingAttachmentId}
          activeVoiceId={activeVoiceId}
          onStopAllVoices={handleStopAllVoices}
          downloadUrlFetcher={staffDownloadUrlFetcher}
        />
      );
    },
    [openAttachment, openingAttachmentId, retry, dismissFailed, userDisplayName, activeVoiceId, handleStopAllVoices, staffDownloadUrlFetcher],
  );

  const handleRefresh = useCallback(() => {
    convRefetch();
    msgsRefetch();
  }, [convRefetch, msgsRefetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!conversationId) {
    return (
      <View style={[screenStyles.screen, { backgroundColor: th.background }, screenStyles.centered]}>
        <Text style={{ color: th.text, fontSize: 16 }}>{t('support.conversationError')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[screenStyles.screen, { backgroundColor: th.background }]}
      behavior="padding"
    >
      {/* Header */}
      <View style={[screenStyles.header, { paddingTop: insets.top, backgroundColor: th.background, borderBottomColor: th.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={screenStyles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={22} color={th.text} />
        </TouchableOpacity>
        <View style={screenStyles.headerCenter}>
          <Ionicons name="headset" size={18} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[screenStyles.headerTitle, { color: th.text }]} numberOfLines={1}>
            {conversation?.user_display_name || t('support.staffChatTitle')}
          </Text>
        </View>
        {/* Notes toggle */}
        <TouchableOpacity
          style={screenStyles.backBtn}
          onPress={() => setShowNotes(true)}
          accessibilityRole="button"
          accessibilityLabel="Internal notes"
        >
          <View>
            <Ionicons name="document-text-outline" size={22} color="#F59E0B" />
            {notes.length > 0 && (
              <View style={screenStyles.notesBadge}>
                <Text style={screenStyles.notesBadgeText}>
                  {notes.length > 9 ? '9+' : String(notes.length)}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        {conversation && !isClosed && (
          <TouchableOpacity
            onPress={handleClose}
            style={screenStyles.backBtn}
            disabled={isClosing}
            accessibilityRole="button"
            accessibilityLabel={t('support.closeConversation')}
          >
            {isClosing
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="close-circle-outline" size={22} color={th.text} />
            }
          </TouchableOpacity>
        )}
        {conversation && isClosed && (
          <TouchableOpacity
            onPress={handleReopen}
            style={screenStyles.backBtn}
            disabled={isReopening}
            accessibilityRole="button"
            accessibilityLabel={t('support.reopenConversation')}
          >
            {isReopening
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="refresh-outline" size={22} color={colors.primary} />
            }
          </TouchableOpacity>
        )}
      </View>

      {/* Conversation info bar: priority */}
      {conversation && (
        <ConversationInfoBar
          conversation={conversation}
          onSetPriority={setPriority}
          isSettingPriority={isSettingPriority}
        />
      )}

      {/* Internal notes modal */}
      <NotesPanel
        conversationId={conversationId}
        visible={showNotes}
        onClose={() => setShowNotes(false)}
      />

      {/* Content */}
      {isLoading && !messages.length ? (
        <View style={screenStyles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (convError || msgsError) && !messages.length ? (
        <View style={screenStyles.centered}>
          <Text style={[screenStyles.errorText, { color: th.text }]}>{t('support.loadError')}</Text>
          <TouchableOpacity
            style={[screenStyles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={handleRefresh}
            accessibilityRole="button"
          >
            <Text style={screenStyles.retryBtnText}>{t('support.retryLoad')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          inverted
          contentContainerStyle={screenStyles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          initialNumToRender={20}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          onRefresh={handleRefresh}
          refreshing={false}
          ListEmptyComponent={
            !isLoading ? (
              <View style={screenStyles.emptyState}>
                <Ionicons name="chatbubble-ellipses-outline" size={48} color={th.textMuted} />
                <Text style={[screenStyles.emptyTitle, { color: th.text }]}>
                  {t('support.staffEmptyState')}
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={screenStyles.olderLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      {/* Closed banner */}
      {isClosed && (
        <View style={screenStyles.closedBanner}>
          <Ionicons name="lock-closed-outline" size={16} color="#92400E" />
          <Text style={screenStyles.closedText}>{t('support.closedStateBody')}</Text>
        </View>
      )}

      {/* Composer */}
      <StaffComposer
        onSend={handleSend}
        disabled={isClosed}
        selectedFiles={selectedFiles}
        onPickImage={handlePickImage}
        onRemoveFile={(idx) => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
        bottomInset={insets.bottom}
        isSending={isSending}
        voiceRecorder={voiceRecorder}
        onSendVoice={handleSendVoice}
      />
    </KeyboardAvoidingView>
  );
}

const screenStyles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999, marginTop: 4 },
  retryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  listContent: { paddingTop: 12, paddingBottom: 8 },
  olderLoader: { paddingVertical: 16, alignItems: 'center' },
  emptyState: { padding: 40, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: '#FEF3C7',
  },
  closedText: { color: '#92400E', fontSize: 13, fontWeight: '600', flex: 1 },
  notesBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notesBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
});
