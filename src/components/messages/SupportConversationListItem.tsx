import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SupportConversationStatus } from '@/types/support';

// ---------------------------------------------------------------------------
// Timestamp formatting (same as ConversationRow)
// ---------------------------------------------------------------------------

function formatTimestamp(isoString: string | null): string {
  if (!isoString) return '';
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMinutes < 60) return `${Math.max(diffMinutes, 1)}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// ---------------------------------------------------------------------------
// Unread badge
// ---------------------------------------------------------------------------

function UnreadBadge({ count }: { count: number }) {
  const display = count > 99 ? '99+' : String(count);
  return (
    <View style={[badgeStyles.wrap, count > 9 && badgeStyles.wrapWide]}>
      <Text style={badgeStyles.text} accessibilityLabel={`${count} unread messages`}>
        {display}
      </Text>
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
  wrapWide: { borderRadius: 12 },
  text: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});

// ---------------------------------------------------------------------------
// Support avatar — a distinct shield / headset icon, never a user photo
// ---------------------------------------------------------------------------

function SupportAvatar() {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  return (
    <View
      style={[
        avatarStyles.wrapper,
        { backgroundColor: isDark ? '#2E1A5A' : '#F0E8FF' },
      ]}
      accessibilityElementsHidden
    >
      <Ionicons name="headset" size={26} color={colors.primary} />
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  wrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SupportConversationListItemProps {
  status: SupportConversationStatus;
  lastPublicMessageAt: string | null;
  unreadCount: number;
  isLoading: boolean;
  isError: boolean;
  onPress: () => void;
  onRetry?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SupportConversationListItemInner({
  status,
  lastPublicMessageAt,
  unreadCount,
  isLoading,
  isError,
  onPress,
  onRetry,
}: SupportConversationListItemProps) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const timestampLabel = formatTimestamp(lastPublicMessageAt);

  const subtitleKey: Record<SupportConversationStatus, string> = {
    IDLE: t('support.statusIdle'),
    WAITING_FOR_STAFF: t('support.statusWaiting'),
    WAITING_STAFF: t('support.statusWaiting'),
    ACTIVE: t('support.statusActive'),
    WAITING_USER: t('support.statusActive'),
    CLOSED: t('support.statusClosed'),
  };
  const subtitle = isError
    ? t('support.conversationError')
    : isLoading
    ? '...'
    : subtitleKey[status];

  const accessibilityLabel = [
    t('support.title'),
    t('support.officialSupport'),
    subtitle,
    timestampLabel,
    unreadCount > 0 ? `${unreadCount} unread` : null,
  ]
    .filter(Boolean)
    .join('. ');

  const rowBg = isDark ? th.surface : '#FAF5FF';
  const borderColor = isDark ? '#4B2D8A' : '#DDD0F8';

  return (
    <TouchableOpacity
      style={[
        styles.row,
        { backgroundColor: rowBg, borderColor },
        rowShadow,
      ]}
      onPress={isError && onRetry ? onRetry : onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={t('support.accessLabel')}
    >
      <SupportAvatar />

      <View style={styles.body}>
        {/* Top row */}
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: th.text }]} numberOfLines={1}>
              {t('support.title')}
            </Text>
            {/* Official badge */}
            <View style={[styles.badge, { backgroundColor: isDark ? '#3A2060' : '#EDE0FF' }]}>
              <Ionicons name="shield-checkmark" size={10} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                {t('support.officialSupport')}
              </Text>
            </View>
          </View>
          {timestampLabel.length > 0 && (
            <Text style={[styles.timestamp, { color: isDark ? '#7C6EA0' : '#9CA3AF' }]}>
              {timestampLabel}
            </Text>
          )}
        </View>

        {/* Bottom row */}
        <View style={styles.bottomRow}>
          <Text
            style={[styles.preview, { color: isError ? colors.danger : th.textSecondary }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
          <View style={styles.badgeArea}>
            {unreadCount > 0 && !isError ? (
              <UnreadBadge count={unreadCount} />
            ) : isError ? (
              <Ionicons name="refresh" size={16} color={colors.danger} />
            ) : null}
          </View>
        </View>

        {/* Divider below item */}
        <View style={[styles.divider, { backgroundColor: isDark ? th.border : '#F0EAF9' }]} />
      </View>
    </TouchableOpacity>
  );
}

export const SupportConversationListItem = memo(SupportConversationListItemInner);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const rowShadow = Platform.select({
  ios: {
    shadowColor: '#8A2CFF',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  android: {},
  default: {},
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderLeftWidth: 3,
  },
  body: { flex: 1 },
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
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
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
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 12,
  },
});
