import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { ActivityStatusIndicator } from '@/components/common/ActivityStatusIndicator';
import { BlindDateBadge } from '@/components/common/BlindDateBadge';
import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import i18n from '@/i18n';
import type { ActivityStatus } from '@/types/activity';
import type { InboxItem, InboxVideoCallRequest } from '@/types/chat';
import { isBlindDateMatch } from '@/utils/matchSource';

// ---------------------------------------------------------------------------
// Timestamp formatting
// ---------------------------------------------------------------------------

const MONTH_KEYS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const;

function formatTimestamp(isoString: string | null): {
  label: string;
  isRecent: boolean;
} {
  if (!isoString) return { label: '', isRecent: false };
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMinutes < 60) {
    return {
      label: i18n.t('matches.minutesAgo', { minutes: Math.max(diffMinutes, 1) }),
      isRecent: true,
    };
  }
  if (diffHours < 24) {
    return { label: i18n.t('matches.hoursAgo', { hours: diffHours }), isRecent: true };
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return { label: i18n.t('chat.yesterday'), isRecent: false };
  }
  return {
    label: i18n.t('chat.dateLabelShort', {
      month: i18n.t(`chat.months.${MONTH_KEYS[date.getMonth()]}`),
      day: date.getDate(),
    }),
    isRecent: false,
  };
}

// ---------------------------------------------------------------------------
// Theme helper
// ---------------------------------------------------------------------------

function useRowTheme() {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  return {
    bg: th.background,
    nameColor: th.text,
    previewColor: th.textSecondary,
    divider: isDark ? th.border : '#F0EAF9',
    recentTimestamp: colors.primary,
    oldTimestamp: isDark ? '#7C6EA0' : '#9CA3AF',
    badgeBg: colors.primary,
    badgeText: '#FFFFFF',
    onlineDot: colors.success,
    offlineDot: isDark ? '#4A3F6B' : '#C4BAD8',
    verifiedColor: colors.primary,
  };
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

interface AvatarProps {
  uri: string | null;
  activityStatus?: ActivityStatus | null;
  hasVideoCall?: boolean;
  videoCallType?: 'VIDEO' | 'AUDIO';
}

function Avatar({ uri, activityStatus, hasVideoCall, videoCallType }: AvatarProps) {
  return (
    <View style={avatarStyles.wrapper} accessibilityElementsHidden>
      {uri ? (
        <Image
          source={{ uri }}
          style={avatarStyles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[avatarStyles.image, avatarStyles.placeholder]}>
          <Ionicons name="person" size={24} color="#999" />
        </View>
      )}
      {(activityStatus === 'ONLINE' || activityStatus === 'RECENTLY_ACTIVE') && (
        <ActivityStatusIndicator
          status={activityStatus}
          size={12}
          style={avatarStyles.statusDot}
        />
      )}
      {hasVideoCall && (
        <View style={avatarStyles.videoChip}>
          <Ionicons name={videoCallType === 'AUDIO' ? 'call' : 'videocam'} size={10} color="#FFF" />
        </View>
      )}
    </View>
  );
}

const AVATAR_SIZE = 56;

const avatarStyles = StyleSheet.create({
  wrapper: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    marginRight: 14,
    position: 'relative',
  },
  image: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E5E5',
  },
  statusDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 2,
  },
  videoChip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

// ---------------------------------------------------------------------------
// Unread badge
// ---------------------------------------------------------------------------

function UnreadBadge({ count }: { count: number }) {
  const display = count > 99 ? '99+' : String(count);
  const isWide = count > 9;
  return (
    <View style={[badgeStyles.wrap, isWide && badgeStyles.wrapWide]}>
      <Text style={badgeStyles.text}>{display}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  wrapWide: {
    borderRadius: 12,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

// ---------------------------------------------------------------------------
// Video-call request badge
// ---------------------------------------------------------------------------

const VC_STATE = {
  respond: {
    label: (ct: 'VIDEO' | 'AUDIO') => ct === 'AUDIO' ? 'Accept audio call' : 'Accept video call',
    bg: colors.primary,
  },
  join: {
    label: (ct: 'VIDEO' | 'AUDIO') => ct === 'AUDIO' ? 'Audio call in progress' : 'Video call in progress',
    bg: colors.success,
  },
  waiting: {
    label: (ct: 'VIDEO' | 'AUDIO') => ct === 'AUDIO' ? 'Audio call request sent' : 'Video call request sent',
    bg: colors.verifiedBlue,
  },
} as const;

function vcState(request: InboxVideoCallRequest): keyof typeof VC_STATE {
  if (request.canAccept) return 'respond';
  if (request.canJoin) return 'join';
  return 'waiting';
}

/**
 * Compact call badge — icon combo only:
 *   direction arrow (incoming ↙ / outgoing ↗) + call-type icon (📞 / 📹).
 * State is carried by the pill colour (purple = accept, green = in progress,
 * blue = request sent). The full label stays on accessibilityLabel.
 */
function VideoCallBadge({
  request,
  onPress,
}: {
  request: InboxVideoCallRequest;
  onPress: () => void;
}) {
  const meta = VC_STATE[vcState(request)];
  const label = meta.label(request.callType);
  return (
    <TouchableOpacity
      style={[vcBadgeStyles.pill, { backgroundColor: meta.bg }]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons
        name={request.callType === 'AUDIO' ? 'call' : 'videocam'}
        size={12}
        color="#FFFFFF"
      />
      <Text style={vcBadgeStyles.arrow}>
        {request.isRequester ? '↗' : '↙'}
      </Text>
      {request.canAccept && (
        <Ionicons name="chevron-forward" size={11} color="#FFFFFF" />
      )}
    </TouchableOpacity>
  );
}

const vcBadgeStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    maxWidth: '100%',
  },
  arrow: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 14,
  },
});

// ---------------------------------------------------------------------------
// Platform card shadow
// ---------------------------------------------------------------------------

const rowShadow = Platform.select({
  ios: { shadowColor: '#8A2CFF', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  android: {},
  default: {},
});

// ---------------------------------------------------------------------------
// ConversationRow
// ---------------------------------------------------------------------------

interface ConversationRowProps {
  item: InboxItem;
  onPress: (item: InboxItem) => void;
  isLast: boolean;
  activityStatus?: ActivityStatus | null;
}

function ConversationRowInner({ item, onPress, isLast, activityStatus }: ConversationRowProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const th = useRowTheme();
  const { label: timestampLabel, isRecent } = formatTimestamp(
    item.lastMessageAt ?? item.matchedAt,
  );
  const timestampColor = isRecent ? th.recentTimestamp : th.oldTimestamp;

  const preview = item.lastMessage?.preview ?? t('chat.newMatchPreview');
  const isMuted =
    item.mutedUntil != null && new Date(item.mutedUntil) > new Date();
  const isBlindDate = isBlindDateMatch(item);

  const accessibilityLabel = [
    item.participant.displayName,
    item.participant.isVerified ? t('profile.status.verified') : null,
    isBlindDate ? t('blindDate.common.blindDate', { defaultValue: 'Blind Date' }) : null,
    t('chat.lastMessage', { preview }),
    timestampLabel,
    item.unreadCount > 0 ? t('chat.unread', { count: item.unreadCount }) : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <TouchableOpacity
      style={[styles.row, rowShadow]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {/* Avatar */}
      <Avatar
        uri={item.participant.avatarUrl}
        activityStatus={activityStatus ?? item.participant.activityStatus}
        hasVideoCall={item.videoCallRequest != null}
        videoCallType={item.videoCallRequest?.callType}
      />

      {/* Content + metadata */}
      <View style={styles.body}>
        {/* Top row: name + timestamp */}
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { color: th.nameColor }]}
              numberOfLines={1}
            >
              {item.participant.displayName}
            </Text>
            {item.participant.isVerified && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={th.verifiedColor}
                style={styles.verifiedIcon}
              />
            )}
            {isBlindDate && (
              <BlindDateBadge size={14} style={styles.blindDateIcon} />
            )}
          </View>
          <Text style={[styles.timestamp, { color: timestampColor }]}>
            {timestampLabel}
          </Text>
        </View>

        {/* Bottom row: preview + right column (call pill under the
            timestamp, then unread/muted) */}
        <View style={styles.bottomRow}>
          <Text
            style={[styles.preview, { color: th.previewColor }]}
            numberOfLines={2}
          >
            {preview}
          </Text>

          <View style={styles.badgeArea}>
            {item.videoCallRequest && (
              <VideoCallBadge
                request={item.videoCallRequest}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/video-call' as never,
                    params: {
                      matchId: item.matchId,
                      displayName: item.participant.displayName,
                      avatarUrl: item.participant.avatarUrl ?? '',
                      requestId: item.videoCallRequest!.id,
                    },
                  })
                }
              />
            )}
            {isMuted ? (
              <Ionicons
                name="notifications-off-outline"
                size={17}
                color={th.oldTimestamp}
              />
            ) : item.unreadCount > 0 ? (
              <UnreadBadge count={item.unreadCount} />
            ) : null}
          </View>
        </View>

        {/* Divider — hidden on last row */}
        {!isLast && (
          <View style={[styles.divider, { backgroundColor: th.divider }]} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export const ConversationRow = memo(ConversationRowInner);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  body: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  verifiedIcon: {
    marginLeft: 4,
    flexShrink: 0,
  },
  blindDateIcon: {
    marginLeft: 4,
    flexShrink: 0,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  preview: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
    marginRight: 8,
  },
  badgeArea: {
    minWidth: 22,
    alignItems: 'flex-end',
    marginTop: 1,
    gap: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 12,
    marginLeft: 0,
  },
});
