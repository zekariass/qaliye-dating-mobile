import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isFreePremiumPlan, isPremiumPlan, type BillingPlan } from '@/types/billing';

interface ProfileHeaderProps {
  avatarUri: string;
  displayName: string;
  age: number;
  isVerified: boolean;
  location: string;
  isIncognito?: boolean;
  plan?: BillingPlan | null;
}

const AVATAR_SIZE = 120;
const AVATAR_RADIUS = 18;
const CIRCLE_BTN = 38;

export default function ProfileHeader({
  avatarUri,
  displayName,
  age,
  isVerified,
  location,
  isIncognito = false,
  plan = null,
}: ProfileHeaderProps) {
  const { top: safeTop } = useSafeAreaInsets();
  const router = useRouter();
  const { colors: th } = useTheme();

  const showPremium = isPremiumPlan(plan);
  const premiumLabel = isFreePremiumPlan(plan) ? 'Free Premium' : 'Premium';

  return (
    <View style={[styles.container, { backgroundColor: th.background }]}>
      <View style={[styles.lavenderGlow, { height: safeTop + 160, backgroundColor: th.backgroundSelected }]} />

      <View style={[styles.topRow, { paddingTop: safeTop + 8 }]}>
        <View style={styles.topLeft}>
          {showPremium ? (
            <View style={[styles.premiumBadge, { backgroundColor: th.surface }]}>
              <Ionicons name="diamond" size={16} color={colors.primary} />
              <Text style={[styles.premiumText, { color: colors.primary }]}>{premiumLabel}</Text>
            </View>
          ) : (
            <View style={styles.topLeftLinks}>
              <Pressable
                style={[styles.linkBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(app)/premium' as any)}
                accessibilityLabel="Go Premium"
                accessibilityRole="button"
              >
                <Ionicons name="diamond" size={14} color="#FFFFFF" />
                <Text style={styles.linkBtnText}>Go Premium</Text>
              </Pressable>
              <Pressable
                style={[styles.linkBtn, { backgroundColor: th.surface }]}
                onPress={() => router.push('/(app)/credits-shop' as any)}
                accessibilityLabel="Credits Shop"
                accessibilityRole="button"
              >
                <Ionicons name="sparkles" size={14} color={colors.primary} />
                <Text style={[styles.linkBtnText, { color: colors.primary }]}>Credits</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.topRight}>
          <Pressable
            style={[styles.circleBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(app)/edit-profile' as any)}
            accessibilityLabel="Edit Profile"
            accessibilityRole="button"
          >
            <Ionicons name="pencil" size={16} color="#FFFFFF" />
          </Pressable>

          <Pressable
            style={[styles.circleBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(app)/settings' as any)}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <Ionicons name="settings" size={16} color="#FFFFFF" />
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
          {isIncognito && (
            <View style={[styles.incognitoBadge, { backgroundColor: th.backgroundSelected }]}>
              <Ionicons name="eye-off" size={12} color={colors.primary} />
              <Text style={[styles.incognitoText, { color: colors.primary }]}>Private mode</Text>
            </View>
          )}
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
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topLeftLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
  },
  linkBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
  incognitoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  incognitoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  premiumText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
