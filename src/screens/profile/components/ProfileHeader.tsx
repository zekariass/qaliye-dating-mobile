import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ProfileHeaderProps {
  avatarUri: string;
  displayName: string;
  age: number;
  isVerified: boolean;
  location: string;
}

const AVATAR_SIZE = 120;
const AVATAR_RADIUS = 18;
const CIRCLE_BTN = 44;

export default function ProfileHeader({
  avatarUri,
  displayName,
  age,
  isVerified,
  location,
}: ProfileHeaderProps) {
  const { top: safeTop } = useSafeAreaInsets();
  const router = useRouter();
  const { colors: th } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: th.background }]}>
      <View style={[styles.lavenderGlow, { height: safeTop + 160, backgroundColor: th.backgroundSelected }]} />

      <View style={[styles.topRow, { paddingTop: safeTop + 8 }]}>
        <Pressable
          style={[styles.circleBtn, { backgroundColor: th.surface }]}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={22} color={th.text} />
        </Pressable>

        <View style={styles.topRight}>
          <Pressable
            style={[styles.circleBtn, { backgroundColor: th.surface }]}
            onPress={() => router.push('/(app)/edit-profile' as any)}
            accessibilityLabel="Edit Profile"
            accessibilityRole="button"
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </Pressable>

          <Pressable
            style={[styles.circleBtn, { backgroundColor: th.surface }]}
            onPress={() => router.push('/(app)/settings' as any)}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Image
          source={{ uri: avatarUri }}
          style={styles.avatar}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text style={[styles.nameText, { color: th.text }]}>{displayName},</Text>
            <Text style={[styles.ageText, { color: th.text }]}> {age}</Text>
            {isVerified && (
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.verifiedBlue}
                style={{ marginLeft: 6 }}
                accessibilityLabel="Verified"
              />
            )}
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={[styles.locationText, { color: th.textSecondary }]} numberOfLines={2}>
              {location}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 12,
  },
  lavenderGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EDE5FF',
    opacity: 0.35,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circleBtn: {
    width: CIRCLE_BTN,
    height: CIRCLE_BTN,
    borderRadius: CIRCLE_BTN / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_RADIUS,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  nameText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1B1340',
    letterSpacing: -0.5,
  },
  ageText: {
    fontSize: 26,
    fontWeight: '400',
    color: '#1B1340',
    letterSpacing: -0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
});
