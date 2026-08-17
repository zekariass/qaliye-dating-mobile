import i18n from '@/i18n';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { themedAlert, themedError, themedSuccess } from '@/components/common/ThemedAlert';
import { NotificationSettingsSection } from '@/components/notifications/NotificationSettingsSection';
import { ReviewPassedProfilesSheet } from '@/components/settings/ReviewPassedProfilesSheet';
import { colors } from '@/constants/theme';
import { useActivityVisibility } from '@/hooks/activity/useActivityVisibility';
import { useDeleteAccount } from '@/hooks/auth/useDeleteAccount';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { usePendingOrders } from '@/hooks/billing/useOrders';
import { useRevenueCatRestore } from '@/hooks/billing/useRevenueCatRestore';
import { useSignOutWithDeactivation } from '@/hooks/notifications/useSignOutWithDeactivation';
import { useTheme } from '@/hooks/use-theme';
import { useRateUs } from '@/hooks/useRateUs';
import { LANGUAGE_LABELS, LANGUAGE_LIST, useLanguageStore } from '@/stores/language-store';
import { ThemeMode, useThemeStore } from '@/stores/theme-store';
import { isActiveSubscription, isFreePremiumPlan, isPremiumPlan } from '@/types/billing';
import { extractApiError, getApiErrorTitle } from '@/utils/apiError';

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
  const { signOut, isSigningOut } = useSignOutWithDeactivation();
  const { confirmDelete, deleteStatus } = useDeleteAccount();
  const [revisitSheetVisible, setRevisitSheetVisible] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const { entitlements } = useEntitlements();
  const { requiresActionCount, pendingCount, refetch: refetchPending } = usePendingOrders(Platform.OS === 'android');
  const { restore, restoreResult, isRestoring } = useRevenueCatRestore();
  const { rateUs } = useRateUs();

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

  const handleDeleteAccount = useCallback(() => {
    themedAlert({
      title: t('settings.deleteAccountTitle', 'Delete Account'),
      message: t(
        'settings.deleteAccountWarning',
        'This will permanently delete your account, profile, photos, matches, and messages. This action cannot be undone and your data cannot be recovered.',
      ),
      icon: 'warning-outline',
      iconColor: colors.danger,
      buttons: [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.continue', 'Continue'),
          style: 'destructive',
          onPress: () => {
            themedAlert({
              title: t('settings.deleteAccountConfirmTitle', 'Are you absolutely sure?'),
              message: t(
                'settings.deleteAccountConfirmBody',
                'You are about to permanently delete your Qaliye account. This cannot be undone.',
              ),
              icon: 'trash-outline',
              iconColor: colors.danger,
              buttons: [
                { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                {
                  text: t('settings.deleteAccountBtn', 'Delete My Account'),
                  style: 'destructive',
                  onPress: () =>
                    confirmDelete().catch((err) => {
                      const detail = extractApiError(err);
                      themedError(
                        getApiErrorTitle(detail.code),
                        detail.code?.toLowerCase() === 'recent_auth_required'
                          ? t(
                              'settings.deleteAccountReauth',
                              'Your session has expired. Please sign in again and retry.',
                            )
                          : t(
                              'settings.deleteAccountError',
                              'Account deletion failed. Please try again.',
                            ),
                      );
                    }),

                },
              ],
            });
          },
        },
      ],
    });
  }, [t, confirmDelete, deleteStatus]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/(tabs)/profile' as any);
    }
  }, [router]);

  return (
    <>
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
        {/* ── Subscription & Credits ── */}
        <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
          <Text style={[styles.sectionTitle, { color: th.text }]}>
            {isPremiumPlan(entitlements?.plan)
              ? t('billing.settingsSection', 'Subscription & Credits')
              : t('billing.creditsSection', 'Credits')}
          </Text>
          {entitlements && isPremiumPlan(entitlements.plan) && (
            <View style={[styles.planRow, { backgroundColor: isFreePremiumPlan(entitlements.plan) ? colors.warning + '12' : colors.primary + '12' }]}>
              <Ionicons
                name={isFreePremiumPlan(entitlements.plan) ? 'gift' : 'diamond'}
                size={16}
                color={isFreePremiumPlan(entitlements.plan) ? colors.warning : colors.primary}
              />
              <Text style={[styles.planLabel, { color: isFreePremiumPlan(entitlements.plan) ? colors.warning : colors.primary }]}>
                {isFreePremiumPlan(entitlements.plan) ? t('billing.freePremiumActive', 'Free Premium') : t('billing.premiumActive', 'Premium')}
              </Text>
            </View>
          )}
          {isPremiumPlan(entitlements?.plan) && isActiveSubscription(entitlements?.subscription) && (
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
          )}
          {(entitlements?.country_settings?.credits_enabled ?? true) && (
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
                    {`${entitlements.credits.credit_balance.toLocaleString()} credits`}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={th.textSecondary} />
            </Pressable>
          )}
          <Pressable
            style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: th.border }]}
            onPress={() => router.push('/(app)/promotions' as any)}
            accessibilityRole="button"
            accessibilityLabel={t('promotion.history.title', 'My Rewards')}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="gift-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: th.text }]}>
                {t('promotion.history.title', 'My Rewards')}
              </Text>
              <Text style={[styles.optionSublabel, { color: th.textSecondary }]}>
                {t('promotion.history.settingsSub', 'View your claimed promotions')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={th.textSecondary} />
          </Pressable>
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

        {/* ── Notifications ── */}
        <NotificationSettingsSection />

        {/* ── Discovery ── */}
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

        {/* ── Language ── */}
        <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
          <Text style={[styles.sectionTitle, { color: th.text }]}>
            {t('settings.language', 'Language')}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: th.textSecondary }]}>
            {t('settings.languageSubtitle', 'Choose your preferred language.')}
          </Text>
          <Pressable
            style={styles.optionRow}
            onPress={() => setLangOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('settings.language', 'Language')}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="language-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: th.text }]}>
                {LANGUAGE_LABELS[language].native}
              </Text>
              <Text style={[styles.optionSublabel, { color: th.textSecondary }]}>
                {LANGUAGE_LABELS[language].label}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={th.textSecondary} />
          </Pressable>
        </View>

        {/* ── Appearance ── */}
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

        {/* ── Privacy ── */}
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
                {t('settings.activityStatus', 'Online Status')}
              </Text>
              <Text style={[styles.optionSublabel, { color: th.textSecondary }]}>
                {t('settings.activityStatusSub', "Show others when you're online")}
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

        {/* ── Rate Us ── */}
        <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
          <Pressable
            style={styles.optionRow}
            onPress={rateUs}
            accessibilityRole="button"
            accessibilityLabel={t('settings.rateUs', 'Rate Us')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="star-outline" size={18} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: th.text }]}>
                {t('settings.rateUs', 'Rate Us')}
              </Text>
              <Text style={[styles.optionSublabel, { color: th.textSecondary }]}>
                {t('settings.rateUsSub', 'Love Qaliye? Leave us a review')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={th.textSecondary} />
          </Pressable>
        </View>

        {/* ── Account ── */}
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
          <Pressable
            style={[styles.optionRow, { borderTopWidth: 1, borderTopColor: th.border }]}
            onPress={handleDeleteAccount}
            disabled={deleteStatus !== 'idle'}
            accessibilityRole="button"
            accessibilityLabel={t('settings.deleteAccount', 'Delete Account')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: '#EF4444' }]}>
                {t('settings.deleteAccount', 'Delete Account')}
              </Text>
              <Text style={[styles.optionSublabel, { color: th.textSecondary }]}>
                {t('settings.deleteAccountSub', 'Permanently delete your account and all data')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#EF4444" />
          </Pressable>
        </View>
      </ScrollView>
    </View>

      {/* ── Account Deletion Overlay ─────────────────────────────────────── */}
      <Modal
        visible={deleteStatus === 'deleting'}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={overlayStyles.backdrop}>
          <View style={[overlayStyles.card, { backgroundColor: th.surface }]}>
            <ActivityIndicator size="large" color={colors.danger} style={{ marginBottom: 20 }} />
            <Text style={[overlayStyles.title, { color: th.text }]}>
              {t('settings.deletingTitle', 'Deleting your account…')}
            </Text>
            <Text style={[overlayStyles.subtitle, { color: th.textSecondary }]}>
              {t('settings.deletingSubtitle', 'Please wait, this may take a moment.')}
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── Language picker modal ── */}
      <Modal
        visible={langOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLangOpen(false)}
      >
        <Pressable style={langStyles.overlay} onPress={() => setLangOpen(false)}>
          <View style={[langStyles.dropdown, { backgroundColor: th.surface, borderColor: th.border }]}>
            <Text style={[langStyles.dropdownTitle, { color: th.textMuted }]}>
              {t('settings.selectLanguage', 'Select Language')}
            </Text>
            {LANGUAGE_LIST.map((code) => {
              const active = code === language;
              const { native, label } = LANGUAGE_LABELS[code];
              return (
                <TouchableOpacity
                  key={code}
                  style={[
                    langStyles.option,
                    active && { backgroundColor: th.backgroundSelected },
                  ]}
                  onPress={async () => {
                    setLanguage(code);
                    await i18n.changeLanguage(code);
                    setLangOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={langStyles.optionTextCol}>
                    <Text style={[langStyles.optionNative, { color: th.text }]}>{native}</Text>
                    <Text style={[langStyles.optionLabel, { color: th.textMuted }]}>{label}</Text>
                  </View>
                  {active && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* ── Sign-out loading overlay ── */}
      <Modal
        visible={isSigningOut}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={overlayStyles.backdrop}>
          <View style={[overlayStyles.card, { backgroundColor: th.surface }]}>
            <View style={signOutStyles.iconWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
            <Text style={[overlayStyles.title, { color: th.text }]}>
              {t('settings.signingOutTitle', 'Signing out…')}
            </Text>
            <Text style={[overlayStyles.subtitle, { color: th.textSecondary }]}>
              {t('settings.signingOutSubtitle', 'Please wait a moment.')}
            </Text>
          </View>
        </View>
      </Modal>
    </>
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

const overlayStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 6, 51, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});

const signOutStyles = StyleSheet.create({
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(138, 44, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
});

const langStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 6, 51, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  dropdown: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  optionTextCol: {
    flex: 1,
  },
  optionNative: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionLabel: {
    fontSize: 13,
  },
});
