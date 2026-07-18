import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ChatImageAttachment, isImageAttachment } from '@/components/messages/ChatImageAttachment';
import { ChatVoiceMessage, isVoiceAttachment } from '@/components/messages/ChatVoiceMessage';
import { colors, fontSize, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ChatMessageViewModel, LocalSendStatus, ServerDeliveryStatus } from '@/types/chat';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_BUBBLE_WIDTH = '75%';

// ---------------------------------------------------------------------------
// Theme helpers
// ---------------------------------------------------------------------------

function useBubbleTheme() {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  return {
    incomingBg: isDark ? '#2A1D44' : '#EDE8F8',
    incomingText: th.text,
    outgoingBg: colors.primary,
    outgoingText: '#FFFFFF',
    failedBg: isDark ? '#44242A' : '#FEE2E2',
    timestampColor: th.textMuted,
    deliveredColor: colors.primary,
    readColor: colors.verifiedBlue,
    failedColor: colors.danger,
    pendingColor: th.textMuted,
  };
}

// ---------------------------------------------------------------------------
// Status icon for outgoing messages
// ---------------------------------------------------------------------------

type VisibleStatus = 'PENDING' | 'SENDING' | 'FAILED' | 'SENT' | 'DELIVERED' | 'READ';

function resolveVisibleStatus(
  localSendStatus?: LocalSendStatus,
  deliveryStatus?: ServerDeliveryStatus,
): VisibleStatus {
  if (localSendStatus === 'PENDING' || localSendStatus === 'SENDING') return localSendStatus;
  if (localSendStatus === 'FAILED') return 'FAILED';
  if (deliveryStatus === 'READ') return 'READ';
  if (deliveryStatus === 'DELIVERED') return 'DELIVERED';
  return 'SENT';
}

function StatusIndicator({
  status,
  timeLabel,
  onRetry,
}: {
  status: VisibleStatus;
  timeLabel: string;
  onRetry?: () => void;
}) {
  const th = useBubbleTheme();

  let icon: React.ReactNode = null;
  switch (status) {
    case 'PENDING':
    case 'SENDING':
      icon = <Ionicons name="time-outline" size={13} color={th.pendingColor} style={deliveryStyles.icon} />;
      break;
    case 'FAILED':
      icon = (
        <TouchableOpacity
          onPress={onRetry}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Retry sending message"
        >
          <Ionicons name="alert-circle" size={14} color={th.failedColor} style={deliveryStyles.icon} />
        </TouchableOpacity>
      );
      break;
    case 'SENT':
      icon = <Ionicons name="checkmark" size={14} color={th.deliveredColor} style={deliveryStyles.icon} />;
      break;
    case 'DELIVERED':
      icon = <Ionicons name="checkmark-done" size={14} color={th.deliveredColor} style={deliveryStyles.icon} />;
      break;
    case 'READ':
      icon = <Ionicons name="checkmark-done" size={14} color={th.readColor} style={deliveryStyles.icon} />;
      break;
  }

  return (
    <View style={deliveryStyles.row}>
      <Text style={[deliveryStyles.time, { color: th.timestampColor }]}>
        {timeLabel}
      </Text>
      {icon}
    </View>
  );
}

const deliveryStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 3,
  },
  time: {
    fontSize: 11,
    fontWeight: '500',
  },
  icon: {
    marginLeft: 2,
  },
});

// ---------------------------------------------------------------------------
// Incoming bubble
// ---------------------------------------------------------------------------

function IncomingBubble({
  message,
  activeVoiceId,
  onStopAllVoices,
}: {
  message: ChatMessageViewModel;
  activeVoiceId: string | null;
  onStopAllVoices: (id: string) => void;
}) {
  const th = useBubbleTheme();

  const imageAttachments = (message.attachments ?? []).filter(isImageAttachment);
  const voiceAttachments = (message.attachments ?? []).filter(isVoiceAttachment);
  const hasBody = message.body && message.body.length > 0;

  return (
    <View style={styles.incomingRow}>
      <View style={styles.incomingContent}>
        <View
          style={[styles.bubble, styles.incomingBubble, { backgroundColor: th.incomingBg }]}
          accessibilityLabel={`Incoming message: ${message.body}`}
        >
          {hasBody && (
            <Text style={[styles.bubbleText, { color: th.incomingText }]}>
              {message.body}
            </Text>
          )}
          {voiceAttachments.map((att) => (
            <ChatVoiceMessage
              key={att.id}
              attachment={att}
              isOutgoing={false}
              isActive={true}
              activeVoiceId={activeVoiceId}
              onStopAllOthers={onStopAllVoices}
            />
          ))}
          {imageAttachments.map((att) => (
            <ChatImageAttachment
              key={att.id}
              attachment={att}
              isOutgoing={false}
            />
          ))}
        </View>
        {message.showTimestamp && (
          <Text style={[styles.incomingTimestamp, { color: th.timestampColor }]}>
            {message.timeLabel}
          </Text>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Outgoing bubble
// ---------------------------------------------------------------------------

function OutgoingBubble({
  message,
  onRetry,
  activeVoiceId,
  onStopAllVoices,
}: {
  message: ChatMessageViewModel;
  onRetry?: () => void;
  activeVoiceId: string | null;
  onStopAllVoices: (id: string) => void;
}) {
  const th = useBubbleTheme();
  const visibleStatus = resolveVisibleStatus(
    message.localSendStatus,
    message.deliveryStatus,
  );
  const isFailed = visibleStatus === 'FAILED';

  const imageAttachments = (message.attachments ?? []).filter(isImageAttachment);
  const voiceAttachments = (message.attachments ?? []).filter(isVoiceAttachment);
  const pendingImages = message.pendingFiles?.filter((f) => f.type.startsWith('image/')) ?? [];
  const hasBody = message.body && message.body.length > 0;

  return (
    <View style={styles.outgoingRow}>
      <View style={styles.outgoingContent}>
        <View
          style={[
            styles.bubble,
            styles.outgoingBubble,
            { backgroundColor: isFailed ? th.failedBg : th.outgoingBg },
          ]}
          accessibilityLabel={`Your message: ${message.body}`}
        >
          {hasBody && (
            <Text
              style={[
                styles.bubbleText,
                { color: isFailed ? th.failedColor : th.outgoingText },
              ]}
            >
              {message.body}
            </Text>
          )}
          {/* Pending (optimistic) image previews from local files */}
          {pendingImages.map((file, i) => (
            <View
              key={`pending_img_${i}`}
              style={[styles.thumbnailWrap, { borderColor: 'rgba(255,255,255,0.2)' }]}
            >
              <ExpoImage
                source={file.uri}
                style={styles.thumbnail}
                contentFit="cover"
                transition={100}
              />
            </View>
          ))}
          {/* Server-confirmed voice attachments */}
          {voiceAttachments.map((att) => (
            <ChatVoiceMessage
              key={att.id}
              attachment={att}
              isOutgoing={true}
              isActive={true}
              activeVoiceId={activeVoiceId}
              onStopAllOthers={onStopAllVoices}
            />
          ))}
          {/* Server-confirmed image attachments */}
          {imageAttachments.map((att) => (
            <ChatImageAttachment
              key={att.id}
              attachment={att}
              isOutgoing={true}
            />
          ))}
          {/* Pending voice indicator */}
          {message.pendingFiles?.some((f) => f.type.startsWith('audio/')) && (
            <View style={styles.pendingVoiceRow}>
              <Ionicons name="mic" size={14} color={isFailed ? th.failedColor : th.outgoingText} />
              <Text style={{ color: isFailed ? th.failedColor : th.outgoingText, fontSize: 12 }}>
                {message.pendingVoiceDurations?.filter((d): d is number => d != null)
                  .map((d) => `${Math.round(d / 1000)}s`)
                  .join(', ') || 'Voice message'}
              </Text>
            </View>
          )}
        </View>
        {message.showTimestamp && (
          <StatusIndicator
            status={visibleStatus}
            timeLabel={message.timeLabel}
            onRetry={isFailed ? onRetry : undefined}
          />
        )}
        {isFailed && (
          <TouchableOpacity
            onPress={onRetry}
            style={styles.retryRow}
            accessibilityRole="button"
            accessibilityLabel="Tap to retry"
          >
            <Ionicons name="refresh" size={12} color={th.failedColor} />
            <Text style={[styles.retryText, { color: th.failedColor }]}>
              Tap to retry
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// MessageBubble — public memoized export
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  message: ChatMessageViewModel;
  onRetry?: (clientMessageId: string) => void;
  activeVoiceId?: string | null;
  onStopAllVoices?: (id: string) => void;
}

function MessageBubbleInner({
  message,
  onRetry,
  activeVoiceId,
  onStopAllVoices,
}: MessageBubbleProps) {
  const stopAll = onStopAllVoices ?? (() => {});
  if (!message.isMine) {
    return (
      <IncomingBubble
        message={message}
        activeVoiceId={activeVoiceId ?? null}
        onStopAllVoices={stopAll}
      />
    );
  }
  return (
    <OutgoingBubble
      message={message}
      onRetry={onRetry ? () => onRetry(message.clientMessageId) : undefined}
      activeVoiceId={activeVoiceId ?? null}
      onStopAllVoices={stopAll}
    />
  );
}

export const MessageBubble = memo(MessageBubbleInner);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  incomingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  outgoingRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  incomingContent: {
    maxWidth: MAX_BUBBLE_WIDTH,
  },
  outgoingContent: {
    maxWidth: MAX_BUBBLE_WIDTH,
    alignItems: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  incomingBubble: {
    borderBottomLeftRadius: 6,
  },
  outgoingBubble: {
    borderBottomRightRadius: 6,
  },
  bubbleText: {
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  incomingTimestamp: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 4,
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  retryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  thumbnailWrap: {
    width: 200,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginTop: 6,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  pendingVoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
});
