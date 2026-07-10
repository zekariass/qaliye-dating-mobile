import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { themedAlert, themedError, themedSuccess } from '@/components/common/ThemedAlert';
import { NotificationSettingsSection } from '@/components/notifications/NotificationSettingsSection';
import { ReviewPassedProfilesSheet } from '@/components/settings/ReviewPassedProfilesSheet';
import { colors } from '@/constants/theme';
import { useActivityVisibility } from '@/hooks/activity/useActivityVisibility';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { usePendingOrders } from '@/hooks/billing/useOrders';
import { useRevenueCatRestore } from '@/hooks/billing/useRevenueCatRestore';
import { useSignOutWithDeactivation } from '@/hooks/notifications/useSignOutWithDeactivation';
import { useTheme } from '@/hooks/use-theme';
import { ThemeMode, useThemeStore } from '@/stores/theme-store';
import { isPremiumPlan } from '@/types/billing';
import { getBoostStatus, getRewindsStatus, getSuperLikesStatus } from '@/utils/entitlements';

const THEME_OPTIONS: { key: ThemeMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
  { key: 'system', label: 'System', icon: 'contrast-outline' },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();
  const { colors: th } = useTheme();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const { showActivityStatus, update: updateVisibility, isUpdating: isUpdatingVisibility } = useActivityVisibility();
  const { signOut } = useSignOutWithDeactivation();
  const [revisitSheetVisible, setRevisitSheetVisible] = useState(false);
  const { entitlements } = useEntitlements();
  const { requiresActionCount, pendingCount, refetch: refetchPending } = usePendingOrders(Platform.OS === 'android');
  const { restore, restoreResult, isRestoring } = useRevenueCatRestore();

  useEffect(() => {
    if (restoreResult === 'success') {
      themedSuccess(
        t('billing.restoreSuccess', 'Restore Complete'),
        t('billing.restoreSuccessMsg', 'Your premium subscription has been restored.'),
      );
    } else if (restoreResult === 'no_purchase') {
      themedAlert({
        title: t('billing.restoreNoPurchase', 'No Purchases Found'),
        message: t('billing.restoreNoPurchaseMsg', 'No active purchases were found to restore.'),
        icon: 'information-circle',
        iconColor: colors.warning,
      });
    } else if (restoreResult === 'error') {
      themedError(
        t('billing.restoreError', 'Restore Failed'),
        t('billing.restoreErrorMsg', 'Something went wrong while restoring purchases. Please try again.'),
      );
    }
  }, [restoreResult, t]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
        refetchPending();
      }
    }, [refetchPending]),
  );

  const handleSignOut = useCallback(() => {
    themedAlert({
      title: t('settings.signOutTitle', 'Sign Out'),
      message: t('settings.signOutConfirm', 'Are you sure you want to sign out?'),
      icon: 'log-out-outline',
      iconColor: colors.danger,
      buttons: [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('settings.signOut', 'Sign Out'),
          style: 'destructive',
          onPress: signOut,
        },
      ],
    });
  }, [t, signOut]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/(tabs)/profile' as any);
    }
  }, [router]);

  return (
    <View style={[styles.screen, { backgroundColor: th.background, paddingTop: safeTop }]}>
      <View style={styles.header}>
        <Pressable
          style={[styles.circleBtn, { backgroundColor: th.surface }]}
          onPress={handleBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={22} color={th.text} />
        </Pressable>
        <Text style={[styles.title, { color: th.text }]}>{t('settings.title', 'Settings')}</Text>
        <View style={styles.circleBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: safeBottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
          <Text style={[styles.sectionTitle, { color: th.text }]}>
            {t('settings.appearance', 'Appearance')}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: th.textSecondary }]}>
            {t('settings.themeSubtitle', 'Choose how the app looks to you.')}
          </Text>

          {THEME_OPTIONS.map((option, idx) => {
            const isActive = mode === option.key;
            return (
              <Pressable
                key={option.key}
                style={[
                  styles.optionRow,
                  idx > 0 && { borderTopWidth: 1, borderTopColor: th.border },
                ]}
                onPress={() => setMode(option.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={option.label}
              >
                <View style={[styles.iconCircle, { backgroundColor: th.backgroundSelected }]}>
                  <Ionicons name={option.icon} size={18} color={th.text} />
                </View>
                <Text style={[styles.optionLabel, { color: th.text }]}>{option.label}</Text>
                <View
                  style={[
                    styles.radio,
                    { borderColor: isActive ? colors.primary : th.border },
                    isActive && { backgroundColor: colors.primary },
                  ]}
                >
                  {isActive && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
          <Text style={[styles.sectionTitle, { color: th.text }]}>
            {t('settings.privacy', 'Privacy')}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: th.textSecondary }]}>
            {t('settings.privacySubtitle', 'Control what others can see about you.')}
          </Text>
          <View style={styles.optionRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="eye-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: th.text }]}>
                {t('settings.activityStatus', 'Activity Status')}
              </Text>
              <Text style={[styles.optionSublabel, { color: th.textSecondary }]}>
                {t('settings.activityStatusSub', 'Show others when you’re active')}
              </Text>
            </View>
            <Switch
              value={showActivityStatus}
              onValueChange={updateVisibility}
              disabled={isUpdatingVisibility}
              trackColor={{ false: th.border, true: colors.primary + 'AA' }}
              thumbColor={showActivityStatus ? colors.primary : th.textMuted}
            />
          </View>
          <Pressable
            style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: th.border }]}
            onPress={() => router.push('/(app)/blocked-users' as any)}
            accessibilityRole="button"
            accessibilityLabel="Blocked users"
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="ban-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: th.text }]}>Blocked Users</Text>
              <Text style={[styles.optionSublabel, { color: th.textSecondary }]}>
                Manage users you've blocked
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={th.textSecondary} />
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
          <Text style={[styles.sectionTitle, { color: th.text }]}>
            {t('settings.discovery', 'Discovery')}
          </Text>
          <Pressable
            testID="review-passed-profiles-row"
            style={styles.optionRow}
            onPress={() => setRevisitSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('settings.revisitPassedProfiles', 'Review passed profiles')}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: th.text }]}>
                {t('settings.revisitPassedProfiles', 'Review passed profiles')}
              </Text>
              <Text style={[styles.optionSublabel, { color: th.textSecondary }]}>
                {t(
                  'settings.revisitPassedProfilesSub',
                  'Bring back profiles you previously passed that are still eligible.',
                )}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={th.textSecondary} />
          </Pressable>
        </View>

        <ReviewPassedProfilesSheet
          visible={revisitSheetVisible}
          onClose={() => setRevisitSheetVisible(false)}
        />

        <NotificationSettingsSection />

        <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
          <Text style={[styles.sectionTitle, { color: th.text }]}>
            {t('billing.settingsSection', 'Subscription & Credits')}
          </Text>
          {entitlements && (
            <View style={[styles.planRow, { backgroundColor: isPremiumPlan(entitlements.plan) ? colors.primary + '12' : th.backgroundElement }]}>
              <Ionicons
                name={isPremiumPlan(entitlements.plan) ? 'diamond' : 'person-outline'}
                size={16}
                color={isPremiumPlan(entitlements.plan) ? colors.primary : th.textSecondary}
              />
              <Text style={[styles.planLabel, { color: isPremiumPlan(entitlements.plan) ? colors.primary : th.text }]}>
                {isPremiumPlan(entitlements.plan) ? t('billing.premiumActive', 'Premium') : t('billing.freePlan', 'Free Plan')}
              </Text>
              {entitlements.plan === 'FREE' && (
                <Pressable
                  style={styles.upgradePill}
                  onPress={() => router.push('/(app)/premium' as any)}
                  accessibilityRole="button"
                >
                  <Text style={styles.upgradePillText}>{t('billing.upgrade', 'Upgrade')}</Text>
                </Pressable>
              )}
            </View>
          )}
          <Pressable
            style={[styles.optionRow, { borderTopWidth: entitlements ? 1 : 0, borderTopColor: th.border }]}
            onPress={() => router.push('/(app)/premium' as any)}
            accessibilityRole="button"
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="diamond-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: th.text }]}>
                {t('billing.manageSubscription', 'Manage Subscription')}
              </Text>
              <Text style={[styles.optionSublabel, { color: th.textSecondary }]}>
                {t('billing.manageSubscriptionSub', 'View plans and upgrade')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={th.textSecondary} />
          </Pressable>
          <Pressable
            style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: th.border }]}
            onPress={() => router.push('/(app)/credits-shop' as any)}
            accessibilityRole="button"
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="cart-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: th.text }]}>
                {t('billing.creditsShop', 'Credits Shop')}
              </Text>
              {entitlements && (
                <Text style={[styles.optionSublabel, { color: th.textSecondary }]}>
                  {`${getBoostStatus(entitlements).isUnlimited ? '∞' : getBoostStatus(entitlements).totalAvailable} boosts · ${getSuperLikesStatus(entitlements).isUnlimited ? '∞' : getSuperLikesStatus(entitlements).totalAvailable} super likes · ${getRewindsStatus(entitlements).isUnlimited ? '∞' : getRewindsStatus(entitlements).totalAvailable} rewinds`}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={th.textSecondary} />
          </Pressable>
          {Platform.OS === 'android' && (
            <Pressable
              style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: th.border }]}
              onPress={() => router.push('/(app)/payment-activity' as any)}
              accessibilityRole="button"
              accessibilityLabel={t('billing.paymentActivity', 'Payment Activity')}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="receipt-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionLabel, { color: th.text }]}>
                  {t('billing.paymentActivity', 'Payment Activity')}
                </Text>
                <Text style={[styles.optionSublabel, { color: th.textSecondary }]}>
                  {pendingCount > 0
                    ? t('billing.pendingOrdersSub', '{{count}} pending order', { count: pendingCount })
                    : t('billing.paymentActivitySub', 'View your payment history')}
                </Text>
              </View>
              {requiresActionCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.warning }]}>
                  <Text style={styles.badgeText}>{requiresActionCount}</Text>
                </View>
              )}
              {pendingCount > 0 && requiresActionCount === 0 && (
                <View style={[styles.badge, { backgroundColor: colors.textMuted }]}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={th.textSecondary} />
            </Pressable>
          )}
          <Pressable
            style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: th.border }]}
            onPress={() => restore()}
            disabled={isRestoring}
            accessibilityRole="button"
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.optionLabel, { color: th.text }]}>
              {isRestoring
                ? t('billing.restoring', 'Restoring…')
                : t('billing.restorePurchases', 'Restore Purchases')}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
          <Text style={[styles.sectionTitle, { color: th.text }]}>
            {t('settings.account', 'Account')}
          </Text>
          <Pressable
            style={styles.optionRow}
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel={t('settings.signOut', 'Sign Out')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            </View>
            <Text style={[styles.optionLabel, { color: '#EF4444' }]}>
              {t('settings.signOut', 'Sign Out')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#EF4444" />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 1,
  },
  optionSublabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  planLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  upgradePill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  upgradePillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
