import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ActivityStatusIndicator } from '@/components/common/ActivityStatusIndicator';
import { colors, fontSize, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ActivityStatus } from '@/types/activity';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ChatHeaderProps {
  /** Top safe-area inset; caller measures via useSafeAreaInsets */
  paddingTop: number;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
  activityStatus: ActivityStatus | null | undefined;
  onBack: () => void;
  /** Optional: tap avatar/name to view the contact's profile */
  onProfilePress?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatHeader({
  paddingTop,
  displayName,
  avatarUrl,
  isVerified,
  activityStatus,
  onBack,
  onProfilePress,
}: ChatHeaderProps) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const dividerColor = isDark ? th.border : '#EEE6FF';
  const onlineTextColor = isDark ? '#9CA3AF' : '#7C6EA0';

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: paddingTop + 10,
          backgroundColor: th.surface,
          borderBottomColor: dividerColor,
        },
      ]}
    >
      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={onBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Back to Messages"
      >
        <Ionicons name="chevron-back" size={26} color={colors.primary} />
      </TouchableOpacity>

      {/* Avatar + name + presence */}
      <TouchableOpacity
        style={styles.contactArea}
        onPress={onProfilePress}
        disabled={!onProfilePress}
        activeOpacity={onProfilePress ? 0.7 : 1}
        accessibilityRole={onProfilePress ? 'button' : 'none'}
        accessibilityLabel={`${displayName}${isVerified ? ', Verified' : ''}${activityStatus === 'ONLINE' ? ', Online' : ''}`}
      >
        {/* Avatar */}
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarPlaceholder,
              { backgroundColor: isDark ? '#3A2A5C' : '#EDE5FF' },
            ]}
          >
            <Ionicons name="person" size={20} color={colors.primary} />
          </View>
        )}

        {/* Name + status */}
        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.displayName, { color: th.text }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {isVerified && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.verifiedBlue}
                style={styles.verifiedIcon}
                accessibilityElementsHidden
              />
            )}
          </View>
          <View style={styles.presenceRow}>
            <ActivityStatusIndicator
              status={activityStatus}
              showLabel
              size={8}
              labelColor={onlineTextColor}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* Right spacer to balance the back button */}
      <View style={styles.rightSpacer} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const AVATAR_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    overflow: 'hidden',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    marginRight: 12,
    flexShrink: 0,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: {
    flex: 1,
    overflow: 'hidden',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayName: {
    fontSize: fontSize.base,
    fontWeight: '700',
    flexShrink: 1,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 5,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  presenceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rightSpacer: {
    width: 36,
  },
});
