import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);

  const showPremium = isPremiumPlan(plan);
  const premiumLabel = isFreePremiumPlan(plan) ? t('billing.freePremiumActive') : t('billing.premiumActive');

  // Country settings control which purchase buttons are visible
  const subscriptionEnabled = countrySettings?.subscription_enabled ?? true;
  const creditsEnabled = countrySettings?.credits_enabled ?? true;

  return (
    <View style={[styles.container, { backgroundColor: th.background }]}>
      <View style={[styles.lavenderGlow, { height: safeTop + 160, backgroundColor: th.backgroundSelected }]} />

      <View style={[styles.topRow, { paddingTop: safeTop + 8 }]}>
       <View
         style={[
           styles.topBarCard,
           {
             // Same treatment as the profile details cards below.
             backgroundColor: th.surface,
             borderColor: isDark ? 'rgba(46,31,80,0.22)' : 'rgba(233,221,248,0.5)',
             ...Platform.select({
               ios: { shadowColor: '#8A2CFF', shadowOpacity: isDark ? 0.15 : 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
               android: { elevation: 3 },
             }) as any,
           },
         ]}
       >
        <View style={styles.topLeft}>
          {showPremium ? (
            <View style={styles.topLeftLinks}>
              {subscriptionEnabled && (
                <Pressable
                  style={[styles.premiumBadge, { backgroundColor: colors.primary }]}
                  onPress={() => setBadgeModalVisible(true)}
                  accessibilityLabel={t('profile.header.premiumStatus')}
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
                  accessibilityLabel={t('common.buyCredits')}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="hand-coin" size={15} color="#5B4500" />
                  <Text style={[styles.linkBtnText, { color: '#5B4500' }]}>{t('common.buyCredits')}</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.topLeftLinks}>
              {subscriptionEnabled && (
                <Pressable
                  style={[styles.linkBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/(app)/premium' as any)}
                  accessibilityLabel={t('common.goPremium')}
                  accessibilityRole="button"
                >
                  <Ionicons name="diamond" size={14} color="#FFFFFF" />
                  <Text style={styles.linkBtnText}>{t('common.goPremium')}</Text>
                </Pressable>
              )}
              {creditsEnabled && (
                <Pressable
                  style={[styles.linkBtn, { backgroundColor: '#FFD700' }]}
                  onPress={() => router.push('/(app)/credits-shop' as any)}
                  accessibilityLabel={t('common.buyCredits')}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="hand-coin" size={15} color="#5B4500" />
                  <Text style={[styles.linkBtnText, { color: '#5B4500' }]}>{t('common.buyCredits')}</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        <Pressable
          style={[styles.balancesBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(app)/balances' as any)}
          accessibilityLabel={t('profile.header.viewBalances')}
          accessibilityRole="button"
        >
          <Ionicons name="wallet-outline" size={15} color="#FFFFFF" />
          <Text style={[styles.balancesBtnText, { color: '#FFFFFF' }]}>{t('billing.balances.title')}</Text>
        </Pressable>
       </View>
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
            {isIncognito && (
              <View style={[styles.incognitoBadge, { backgroundColor: th.backgroundSelected }]}>
                <Ionicons name="eye-off" size={12} color={colors.primary} />
                <Text style={[styles.incognitoText, { color: colors.primary }]}>{t('profile.header.privateMode')}</Text>
              </View>
            )}
          </View>
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionBtn, { borderColor: th.border, borderWidth: 1.5 }]}
              onPress={() => router.push('/(app)/edit-profile' as any)}
              accessibilityLabel={t('profile.editTitle')}
              accessibilityRole="button"
            >
              <Ionicons name="pencil" size={14} color={th.text} />
              <Text style={[styles.actionBtnText, { color: th.text }]}>{t('profile.header.edit')}</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { borderColor: th.border, borderWidth: 1.5 }]}
              onPress={() => router.push('/(app)/settings' as any)}
              accessibilityLabel={t('profile.header.settings')}
              accessibilityRole="button"
            >
              <Ionicons name="settings" size={14} color={th.text} />
              <Text style={[styles.actionBtnText, { color: th.text }]}>{t('profile.header.settings')}</Text>
            </Pressable>
            {isVerified ? (
              <VerifiedBadge pill />
            ) : (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.primary, borderWidth: 1 }]}
                onPress={() => router.push('/(app)/verify-identity' as any)}
                accessibilityLabel={t('profile.verifyIdentity')}
                accessibilityRole="button"
              >
                <Ionicons name="shield-checkmark-outline" size={14} color="#FFFFFF" />
                <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>{t('profile.header.verify')}</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.actionBtn, { borderColor: th.border, borderWidth: 1.5 }]}
              onPress={() => router.push('/(app)/help' as any)}
              accessibilityLabel={t('help.title')}
              accessibilityRole="button"
            >
              <Ionicons name="help-circle-outline" size={14} color={th.text} />
              <Text style={[styles.actionBtnText, { color: th.text }]}>{t('help.title')}</Text>
            </Pressable>
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
    marginBottom: 12,
  },
  topBarCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
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
