import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import PremiumBadgeModal from '@/components/billing/PremiumBadgeModal';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { BillingPlan, CountrySettings } from '@/types/billing';
import { isFreePremiumPlan, isPremiumPlan } from '@/types/billing';

interface ProfileHeaderProps {
  avatarUri: string;
  displayName: string;
  age: number;
  isVerified: boolean;
  isIncognito?: boolean;
  plan?: BillingPlan | null;
  countrySettings?: CountrySettings | null;
}

const AVATAR_SIZE = 120;
const AVATAR_RADIUS = 18;

export default function ProfileHeader({
  avatarUri,
  displayName,
  age,
  isVerified,
  isIncognito = false,
  plan = null,
  countrySettings = null,
}: ProfileHeaderProps) {
  const { top: safeTop } = useSafeAreaInsets();
  const router = useRouter();
  const { colors: th } = useTheme();
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);

  const showPremium = isPremiumPlan(plan);
  const premiumLabel = isFreePremiumPlan(plan) ? 'Free Premium' : 'Premium';

  // Country settings control which purchase buttons are visible
  const subscriptionEnabled = countrySettings?.subscription_enabled ?? true;
  const creditsEnabled = countrySettings?.credits_enabled ?? true;

  return (
    <View style={[styles.container, { backgroundColor: th.background }]}>
      <View style={[styles.lavenderGlow, { height: safeTop + 160, backgroundColor: th.backgroundSelected }]} />

      <View style={[styles.topRow, { paddingTop: safeTop + 8 }]}>
        <View style={styles.topLeft}>
          {showPremium ? (
            <View style={styles.topLeftLinks}>
              {subscriptionEnabled && (
                <Pressable
                  style={[styles.premiumBadge, { backgroundColor: colors.primary }]}
                  onPress={() => setBadgeModalVisible(true)}
                  accessibilityLabel="Premium status"
                  accessibilityRole="button"
                >
                  <Ionicons name="diamond" size={16} color="#FFFFFF" />
                  <Text style={[styles.premiumText, { color: '#FFFFFF' }]}>{premiumLabel}</Text>
                </Pressable>
              )}
              {creditsEnabled && (
                <Pressable
                  style={[styles.linkBtn, { backgroundColor: '#FFD700' }]}
                  onPress={() => router.push('/(app)/credits-shop' as any)}
                  accessibilityLabel="Buy Credits"
                  accessibilityRole="button"
                >
                  <Ionicons name="sparkles" size={14} color="#5B4500" />
                  <Text style={[styles.linkBtnText, { color: '#5B4500' }]}>Buy Credits</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.topLeftLinks}>
              {subscriptionEnabled && (
                <Pressable
                  style={[styles.linkBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/(app)/premium' as any)}
                  accessibilityLabel="Go Premium"
                  accessibilityRole="button"
                >
                  <Ionicons name="diamond" size={14} color="#FFFFFF" />
                  <Text style={styles.linkBtnText}>Go Premium</Text>
                </Pressable>
              )}
              {creditsEnabled && (
                <Pressable
                  style={[styles.linkBtn, { backgroundColor: '#FFD700' }]}
                  onPress={() => router.push('/(app)/credits-shop' as any)}
                  accessibilityLabel="Buy Credits"
                  accessibilityRole="button"
                >
                  <Ionicons name="sparkles" size={14} color="#5B4500" />
                  <Text style={[styles.linkBtnText, { color: '#5B4500' }]}>Buy Credits</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        <Pressable
          style={[styles.balancesBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(app)/balances' as any)}
          accessibilityLabel="View Balances"
          accessibilityRole="button"
        >
          <Ionicons name="wallet-outline" size={15} color="#FFFFFF" />
          <Text style={[styles.balancesBtnText, { color: '#FFFFFF' }]}>Balances</Text>
        </Pressable>
      </View>

      <View style={styles.infoRow}>
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: th.backgroundSelected, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="person" size={48} color={th.textMuted} />
          </View>
        )}
        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text style={[styles.nameText, { color: th.text }]}>{displayName},</Text>
            <Text style={[styles.ageText, { color: th.text }]}> {age}</Text>
          </View>
          <View style={styles.badgeRow}>
            {isVerified && <VerifiedBadge pill />}
            {isIncognito && (
              <View style={[styles.incognitoBadge, { backgroundColor: th.backgroundSelected }]}>
                <Ionicons name="eye-off" size={12} color={colors.primary} />
                <Text style={[styles.incognitoText, { color: colors.primary }]}>Private mode</Text>
              </View>
            )}
          </View>
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionBtn, { borderColor: th.border, borderWidth: 1.5 }]}
              onPress={() => router.push('/(app)/edit-profile' as any)}
              accessibilityLabel="Edit Profile"
              accessibilityRole="button"
            >
              <Ionicons name="pencil" size={14} color={th.textSecondary} />
              <Text style={[styles.actionBtnText, { color: th.textSecondary }]}>Edit</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { borderColor: th.border, borderWidth: 1.5 }]}
              onPress={() => router.push('/(app)/settings' as any)}
              accessibilityLabel="Settings"
              accessibilityRole="button"
            >
              <Ionicons name="settings" size={14} color={th.textSecondary} />
              <Text style={[styles.actionBtnText, { color: th.textSecondary }]}>Settings</Text>
            </Pressable>
            {!isVerified && (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.primary, borderWidth: 1 }]}
                onPress={() => router.push('/(app)/verify-identity' as any)}
                accessibilityLabel="Verify Identity"
                accessibilityRole="button"
              >
                <Ionicons name="shield-checkmark-outline" size={14} color="#FFFFFF" />
                <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Verify</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <PremiumBadgeModal
        visible={badgeModalVisible}
        onClose={() => setBadgeModalVisible(false)}
      />
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
  balancesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  balancesBtnText: {
    fontSize: 13,
    fontWeight: '700',
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
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
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
