import { useAudioPlayer, useAudioPlayerStatus } from '@/utils/expoAudio';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import type { useChatVoiceRecorder } from '@/hooks/messages/useChatVoiceRecorder';
import { useTheme } from '@/hooks/use-theme';
import type { ChatFileAttachment } from '@/types/chat';

// Platform-safe shadows declared at module level to avoid TS overload mismatch
const inputShadow = Platform.select({
  ios: {
    shadowColor: '#8A2CFF' as const,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  default: {},
}) ?? {};

const sendBtnShadow = Platform.select({
  ios: {
    shadowColor: '#8A2CFF' as const,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  default: {},
}) ?? {};


// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MessageComposerProps {
  onSend: (text: string) => void;
  onSendWithAttachments: (
    text: string,
    files: ChatFileAttachment[],
    voiceDurationsMs?: (number | null)[],
  ) => void;
  onPickImage: () => void;
  selectedFiles: ChatFileAttachment[];
  onRemoveFile: (idx: number) => void;
  bottomInset: number;
  onTextChange?: (text: string) => void;
  disabled?: boolean;
  isSending?: boolean;
  isProcessingImages?: boolean;
  voiceRecorder: ReturnType<typeof useChatVoiceRecorder>;
  onSendVoice: (text: string) => void;
  voiceQuotaRemaining?: number | null;
  imageQuotaRemaining?: number | null;
  onQuotaExceeded?: (type: 'voice' | 'image') => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRecordingTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Attachment preview strip
// ---------------------------------------------------------------------------

function AttachmentPreviewStrip({
  files,
  onRemove,
}: {
  files: ChatFileAttachment[];
  onRemove: (idx: number) => void;
}) {
  const { colors: th } = useTheme();
  if (files.length === 0) return null;
  return (
    <View style={previewStyles.strip}>
      {files.map((f, i) => (
        <View key={`${f.uri}_${i}`} style={[previewStyles.chip, { borderColor: th.border }]}>
          <Ionicons name="image-outline" size={14} color={colors.primary} />
          <Text style={[previewStyles.name, { color: th.text }]} numberOfLines={1}>{f.name}</Text>
          <TouchableOpacity
            onPress={() => onRemove(i)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${f.name}`}
          >
            <Ionicons name="close-circle" size={16} color={th.textMuted} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const previewStyles = StyleSheet.create({
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: spacing.md, paddingTop: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, maxWidth: 160, gap: 4 },
  name: { fontSize: 11, flexShrink: 1 },
});

// ---------------------------------------------------------------------------
// Voice recording bar
// ---------------------------------------------------------------------------

const WAVEFORM_BARS = 5;
const WAVEFORM_HEIGHTS = [0.4, 0.7, 1.0, 0.7, 0.4];

function VoiceRecordingBar({
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

  // Pulsing red dot
  const dotOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(dotOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [dotOpacity]);

  // Animated waveform bars
  const waveAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [waveAnim]);

  const containerBg = isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)';
  const containerBorder = isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)';

  return (
    <View style={[
      recordingStyles.wrapper,
      { backgroundColor: containerBg, borderColor: containerBorder },
    ]}>
      <TouchableOpacity
        onPress={onCancel}
        style={recordingStyles.cancelBtn}
        accessibilityRole="button"
        accessibilityLabel={t('chat.cancelRecording')}
      >
        <Ionicons name="close" size={22} color={colors.danger} />
      </TouchableOpacity>
      <View style={recordingStyles.centerSection}>
        <Animated.View
          style={[
            recordingStyles.recDot,
            { opacity: dotOpacity },
          ]}
        />
        <Text
          style={[recordingStyles.timer, { color: th.text }]}
          accessibilityLabel={t('chat.recording')}
        >
          {formatRecordingTime(durationMs)}
        </Text>
        <View style={recordingStyles.waveform}>
          {Array.from({ length: WAVEFORM_BARS }).map((_, i) => (
            <Animated.View
              key={i}
              style={[
                recordingStyles.waveBar,
                {
                  backgroundColor: colors.danger,
                  transform: [{
                    scaleY: waveAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [
                        WAVEFORM_HEIGHTS[i] * 0.5,
                        WAVEFORM_HEIGHTS[i],
                        WAVEFORM_HEIGHTS[i] * 0.5,
                      ],
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
        style={recordingStyles.stopBtn}
        accessibilityRole="button"
        accessibilityLabel={t('chat.stopRecording')}
      >
        <Ionicons name="stop" size={18} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const recordingStyles = StyleSheet.create({
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

// ---------------------------------------------------------------------------
// Voice preview bar (after stop, before send) — with local playback
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
      voicePreviewStyles.wrapper,
      { backgroundColor: isDark ? '#1C1400' : '#FFFBEB', borderColor: isDark ? '#4A3000' : '#FDE68A' },
    ]}>
      <TouchableOpacity
        onPress={handlePlayPause}
        style={[voicePreviewStyles.playBtn, { backgroundColor: '#F59E0B' }]}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause preview' : 'Play preview'}
      >
        {isBuffering
          ? <ActivityIndicator size="small" color="#FFF" />
          : <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#FFF" />
        }
      </TouchableOpacity>
      <View style={voicePreviewStyles.middle}>
        <View style={[voicePreviewStyles.track, { backgroundColor: isDark ? '#4A3000' : '#FDE68A' }]}>
          <View style={[voicePreviewStyles.fill, { backgroundColor: '#F59E0B', width: `${Math.round(progress * 100)}%` as `${number}%` }]} />
        </View>
        <View style={voicePreviewStyles.timeRow}>
          <Text style={[voicePreviewStyles.timeText, { color: th.textMuted }]}>
            {formatRecordingTime(Math.round(currentTime * 1000))}
          </Text>
          <Text style={[voicePreviewStyles.timeText, { color: th.textMuted }]}>
            {formatRecordingTime(durationMs)}
          </Text>
        </View>
      </View>
      <View style={voicePreviewStyles.actions}>
        <TouchableOpacity
          onPress={onRecordAgain}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('chat.recordAgain')}
        >
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('chat.deleteRecording')}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const voicePreviewStyles = StyleSheet.create({
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
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: { flex: 1, gap: 5 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, minWidth: 4 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontSize: 11, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 14, alignItems: 'center' },
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MessageComposer({
  onSend,
  onSendWithAttachments,
  onPickImage,
  selectedFiles,
  onRemoveFile,
  bottomInset,
  onTextChange,
  disabled = false,
  isSending = false,
  isProcessingImages = false,
  voiceRecorder,
  onSendVoice,
  voiceQuotaRemaining,
  imageQuotaRemaining,
  onQuotaExceeded,
}: MessageComposerProps) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const isRecording = voiceRecorder.isRecording;
  const hasRecording = voiceRecorder.recording !== null;
  const showNormalComposer = !isRecording && !hasRecording;

  const canSend = !disabled && !isSending && (text.trim().length > 0 || selectedFiles.length > 0);
  const canSendVoice = !disabled && !isSending && hasRecording;

  const handleTextChange = (value: string) => {
    setText(value);
    onTextChange?.(value);
  };

  const handleSend = () => {
    if (!canSend) return;
    if (selectedFiles.length > 0) {
      onSendWithAttachments(text.trim(), selectedFiles);
    } else {
      onSend(text.trim());
    }
    setText('');
    onTextChange?.('');
  };

  const handleSendVoice = () => {
    if (!canSendVoice) return;
    onSendVoice(text.trim());
    setText('');
    onTextChange?.('');
  };

  const voiceUnlimited = voiceQuotaRemaining === null || voiceQuotaRemaining === undefined;
  const voiceExhausted = !voiceUnlimited && voiceQuotaRemaining === 0;
  const imageUnlimited = imageQuotaRemaining === null || imageQuotaRemaining === undefined;
  const imageExhausted = !imageUnlimited && imageQuotaRemaining === 0;

  const handleMicPress = () => {
    if (voiceExhausted) {
      onQuotaExceeded?.('voice');
      return;
    }
    voiceRecorder.startRecording();
  };

  const handleImagePress = () => {
    if (imageExhausted) {
      onQuotaExceeded?.('image');
      return;
    }
    onPickImage();
  };

  const inputBg = isDark ? th.surface : '#FFFFFF';
  const inputBorder = isDark ? th.border : '#E4D9F7';
  const placeholderColor = isDark ? '#6B6080' : '#B0A0CC';
  const textColor = th.text;
  const actionBorder = isDark ? '#5A3FA0' : '#C4AEF0';
  const sendDisabledBg = isDark ? '#3A2060' : '#DDD0F8';
  const sendDisabledIcon = isDark ? '#7A60A0' : '#B8A0E0';

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: isDark ? th.background : '#FAFAFA',
          paddingBottom: Math.max(bottomInset, spacing.sm),
          borderTopColor: isDark ? th.border : '#EEE6FF',
        },
      ]}
    >
      {/* Recording bar */}
      {isRecording && (
        <VoiceRecordingBar
          durationMs={voiceRecorder.durationMs}
          onStop={() => voiceRecorder.stopRecording()}
          onCancel={() => voiceRecorder.cancelRecording()}
        />
      )}

      {/* Voice preview bar + text input + send voice */}
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
          <AttachmentPreviewStrip files={selectedFiles} onRemove={onRemoveFile} />
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.circleBtn, { borderColor: actionBorder, opacity: disabled || imageExhausted ? 0.4 : 1 }]}
              onPress={handleImagePress}
              disabled={disabled || imageExhausted}
              accessibilityRole="button"
              accessibilityLabel={t('chat.attachImage')}
            >
              {imageExhausted
                ? <Ionicons name="lock-closed" size={18} color={colors.primary} />
                : <Ionicons name="image-outline" size={20} color={colors.primary} />}
            </TouchableOpacity>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  ...(Platform.OS === 'android' ? { elevation: 2 } : inputShadow),
                },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: textColor }]}
                value={text}
                onChangeText={handleTextChange}
                editable={!disabled}
                placeholder={t('chat.typePlaceholder')}
                placeholderTextColor={placeholderColor}
                multiline
                maxLength={2000}
                returnKeyType="default"
                blurOnSubmit={false}
                accessibilityLabel="Message input"
              />
            </View>
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: canSendVoice ? colors.primary : sendDisabledBg }]}
              onPress={handleSendVoice}
              disabled={!canSendVoice}
              accessibilityRole="button"
              accessibilityLabel={t('chat.sendVoiceMessage')}
              accessibilityState={{ disabled: !canSendVoice }}
            >
              {isSending
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Ionicons name="send" size={18} color={canSendVoice ? '#FFF' : sendDisabledIcon} />
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Normal composer */}
      {showNormalComposer && (
        <>
          <AttachmentPreviewStrip files={selectedFiles} onRemove={onRemoveFile} />
          <View style={styles.row}>
            {/* Image picker button */}
            <TouchableOpacity
              style={[styles.circleBtn, { borderColor: actionBorder, opacity: disabled || imageExhausted ? 0.4 : 1 }]}
              onPress={handleImagePress}
              disabled={disabled || isProcessingImages || imageExhausted}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('chat.attachImage')}
            >
              {isProcessingImages
                ? <ActivityIndicator size="small" color={colors.primary} />
                : imageExhausted
                  ? <Ionicons name="lock-closed" size={18} color={colors.primary} />
                  : <Ionicons name="image-outline" size={20} color={colors.primary} />}
            </TouchableOpacity>
            {!imageUnlimited && !imageExhausted && imageQuotaRemaining != null && (
              <Text style={styles.quotaHint}>{imageQuotaRemaining} left</Text>
            )}

            {/* Input row container */}
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  ...(Platform.OS === 'android' ? { elevation: 2 } : inputShadow),
                },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: textColor }]}
                value={text}
                onChangeText={handleTextChange}
                editable={!disabled}
                placeholder={t('chat.typePlaceholder')}
                placeholderTextColor={placeholderColor}
                multiline
                maxLength={2000}
                returnKeyType="default"
                blurOnSubmit={false}
                accessibilityLabel="Message input"
                accessibilityHint="Type your message here"
              />
            </View>

            {/* Mic button */}
            <TouchableOpacity
              style={[styles.circleBtn, { borderColor: actionBorder, opacity: disabled || voiceExhausted ? 0.4 : 1 }]}
              onPress={handleMicPress}
              disabled={disabled || voiceExhausted}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('chat.recordVoiceMessage')}
            >
              {voiceExhausted
                ? <Ionicons name="lock-closed" size={18} color={colors.primary} />
                : <Ionicons name="mic-outline" size={20} color={colors.primary} />}
            </TouchableOpacity>
            {!voiceUnlimited && !voiceExhausted && voiceQuotaRemaining != null && (
              <Text style={styles.quotaHint}>{voiceQuotaRemaining} left</Text>
            )}

            {/* Send button */}
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: canSend ? colors.primary : sendDisabledBg,
                  ...(canSend
                    ? Platform.OS === 'android'
                      ? { elevation: 6 }
                      : sendBtnShadow
                    : {}),
                },
              ]}
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('chat.sendMessage')}
              accessibilityState={{ disabled: !canSend }}
            >
              {isSending
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Ionicons name="send" size={18} color={canSend ? '#FFFFFF' : sendDisabledIcon} />
              }
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Voice recorder error display */}
      {voiceRecorder.error && !isRecording && (
        <Text style={[styles.errorText, { color: colors.danger }]}>
          {voiceRecorder.error.message}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const CIRCLE_BTN_SIZE = 42;

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    gap: 8,
  },
  circleBtn: {
    width: CIRCLE_BTN_SIZE,
    height: CIRCLE_BTN_SIZE,
    borderRadius: CIRCLE_BTN_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1.5,
    borderRadius: radius.xl,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 44,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    paddingTop: Platform.OS === 'ios' ? 4 : 2,
    paddingBottom: Platform.OS === 'ios' ? 4 : 2,
    maxHeight: 108,
  },
  sendBtn: {
    width: CIRCLE_BTN_SIZE,
    height: CIRCLE_BTN_SIZE,
    borderRadius: CIRCLE_BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  errorText: {
    fontSize: 12,
    paddingHorizontal: spacing.md,
    paddingBottom: 4,
  },
  quotaHint: {
    position: 'absolute',
    bottom: -14,
    fontSize: 9,
    fontWeight: '600',
    color: colors.primary,
    opacity: 0.7,
  },
});
