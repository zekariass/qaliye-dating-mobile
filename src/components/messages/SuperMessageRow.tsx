import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SuperMessageDto } from '@/types/superMessage';

// ---------------------------------------------------------------------------
// SuperMessageRow
// ---------------------------------------------------------------------------

export interface SuperMessageRowProps {
  item: SuperMessageDto;
  direction: 'sent' | 'received';
  isLast: boolean;
  onPress: (item: SuperMessageDto, direction: 'sent' | 'received') => void;
}

function SuperMessageRowInner({ item, direction, isLast, onPress }: SuperMessageRowProps) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const isSent = direction === 'sent';
  const isUnread = !isSent && !item.viewed_at;

  // For sent messages: show receiver info; for received: show sender info
  const otherParty = isSent ? item.receiver : item.sender;
  const displayName = otherParty?.display_name ?? 'Unknown';
  const photoUrl = otherParty?.photo_url ?? null;

  const previewText = isSent ? `You: ${item.message}` : item.message;

  return (
    <TouchableOpacity
      style={[rowShadow, styles.row]}
      onPress={() => onPress(item, direction)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${displayName}: ${previewText}`}
    >
      {/* Avatar — profile photo with star badge overlay */}
      <View style={styles.avatarWrap}>
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: isDark ? '#2E1A5A' : '#EDE0FF' }]}>
            <Ionicons name="person" size={24} color={colors.primary} />
          </View>
        )}
        {/* Star badge */}
        <View style={styles.starBadge}>
          <Ionicons name="star" size={12} color="#FFFFFF" />
        </View>
        {isUnread && (
          <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
        )}
      </View>

      <View style={styles.body}>
        {/* Top row: name */}
        <View style={styles.topRow}>
          <Text
            style={[styles.name, { color: th.text }, isUnread && styles.nameUnread]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
        </View>

        {/* Bottom row: preview + status pill */}
        <View style={styles.bottomRow}>
          <Text
            style={[styles.preview, { color: th.textSecondary }]}
            numberOfLines={2}
          >
            {previewText}
          </Text>

          <View style={styles.badgeArea}>
            {isUnread ? (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]} />
            ) : null}
          </View>
        </View>

        {!isLast && (
          <View style={[styles.divider, { backgroundColor: isDark ? th.border : '#F0EAF9' }]} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export const SuperMessageRow = memo(SuperMessageRowInner);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const rowShadow = Platform.select({
  ios: { shadowColor: '#F59E0B', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  android: {},
  default: {},
});

const AVATAR_SIZE = 56;
const STAR_BADGE_SIZE = 20;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    marginRight: 14,
    position: 'relative',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: STAR_BADGE_SIZE,
    height: STAR_BADGE_SIZE,
    borderRadius: STAR_BADGE_SIZE / 2,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  nameUnread: {
    fontWeight: '700',
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
    alignItems: 'flex-end',
    marginTop: 1,
  },
  unreadBadge: {
    minWidth: 10,
    height: 10,
    borderRadius: 5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 12,
  },
});
