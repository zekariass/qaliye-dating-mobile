import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoostCountdown } from '@/components/billing/BoostCountdown';
import { colors } from '@/constants/theme';
import { useActivateBoost } from '@/hooks/billing/useActivateBoost';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useTheme } from '@/hooks/use-theme';
import { getBoostStatus, isInsufficientCreditsError } from '@/utils/entitlements';

export default function BoostScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { colors: th } = useTheme();

  const { entitlements, isLoading, refreshEntitlements } = useEntitlements();
  const { mutate: activate, isPending: isActivating, error: activationError } = useActivateBoost();

  const boostStatus = getBoostStatus(entitlements);
  const activeBoost = entitlements?.active_boost ?? null;
  const boostCredits = boostStatus.isUnlimited ? '∞' : boostStatus.totalAvailable;
  const hasBoostCredits = boostStatus.canActivate;

  const handleActivate = useCallback(() => {
    activate(undefined, {
      onError: (err: any) => {
        if (isInsufficientCreditsError(err)) {
          return;
        }
      },
    });
  }, [activate]);

  const handleExpire = useCallback(() => {
    refreshEntitlements();
  }, [refreshEntitlements]);

  return (
    <View style={[styles.screen, { backgroundColor: th.background, paddingTop: top }]}>
      <View style={styles.header}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: th.backgroundElement }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', 'Back')}
        >
          <Ionicons name="chevron-back" size={20} color={th.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: th.text }]}>
          {t('billing.boostTitle', 'Boost')}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={[styles.heroCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
              <Ionicons name="rocket" size={48} color={colors.primary} />
              <Text style={[styles.heroTitle, { color: th.text }]}>
                {t('billing.boostHeroTitle', 'Profile Boost')}
              </Text>
              <Text style={[styles.heroBody, { color: th.textSecondary }]}>
                {t('billing.boostHeroBody', 'Get {{minutes}} minutes of increased visibility. More people will see your profile during your boost.', { minutes: boostStatus.durationMinutes })}
              </Text>
            </View>

            {activeBoost ? (
              <>
                <BoostCountdown activeBoost={activeBoost} onExpire={handleExpire} />
                <View style={[styles.infoCard, { backgroundColor: th.surface, borderColor: th.border }]}>
                  <Ionicons name="information-circle-outline" size={18} color={th.textSecondary} />
                  <Text style={[styles.infoText, { color: th.textSecondary }]}>
                    {t('billing.boostActiveInfo', 'Your profile is being boosted right now. You cannot activate another boost while one is active.')}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.creditsRow, { backgroundColor: th.surface, borderColor: th.border }]}>
                  <Ionicons name="rocket-outline" size={20} color={colors.primary} />
                  <Text style={[styles.creditsLabel, { color: th.text }]}>
                    {t('billing.boostCreditsAvailable', 'Boost credits available')}
                  </Text>
                  <Text style={[styles.creditsValue, { color: colors.primary }]}>
                    {boostCredits}
                  </Text>
                </View>

                {activationError?.code === 'BOOST_ALREADY_ACTIVE' && (
                  <View style={[styles.errorBanner, { backgroundColor: colors.warning + '18' }]}>
                    <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
                    <Text style={[styles.errorText, { color: th.text }]}>
                      {t('billing.boostAlreadyActive', 'A boost is already active.')}
                    </Text>
                  </View>
                )}

                {hasBoostCredits ? (
                  <Pressable
                    style={[styles.activateBtn, isActivating && styles.activateBtnDisabled]}
                    onPress={handleActivate}
                    disabled={isActivating}
                    accessibilityRole="button"
                    accessibilityLabel={t('billing.activateBoost', 'Activate Boost')}
                  >
                    {isActivating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="rocket" size={20} color="#fff" />
                        <Text style={styles.activateBtnText}>
                          {t('billing.activateBoost', 'Activate Boost')}
                        </Text>
                      </>
                    )}
                  </Pressable>
                ) : (
                  <>
                    <View style={[styles.noCreditsCard, { backgroundColor: th.surface, borderColor: th.border }]}>
                      <Ionicons name="alert-circle-outline" size={22} color={th.textSecondary} />
                      <Text style={[styles.noCreditsText, { color: th.textSecondary }]}>
                        {t('billing.noBoostCredits', 'You have no boost credits. Purchase a boost pack to continue.')}
                      </Text>
                    </View>
                    {(entitlements?.country_settings?.credits_enabled ?? true) && (
                    <Pressable
                      style={styles.buyBtn}
                      onPress={() => router.push({ pathname: '/(app)/credits-shop' } as any)}
                      accessibilityRole="button"
                    >
                      <Ionicons name="cart-outline" size={18} color="#fff" />
                      <Text style={styles.buyBtnText}>
                        {t('billing.buyBoosts', 'Buy Boost Credits')}
                      </Text>
                    </Pressable>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  centered: { paddingVertical: 60, alignItems: 'center' },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  heroBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  creditsLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  creditsValue: { fontSize: 20, fontWeight: '800' },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 12,
  },
  errorText: { flex: 1, fontSize: 13 },
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  activateBtnDisabled: { opacity: 0.6 },
  activateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  noCreditsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  noCreditsText: { flex: 1, fontSize: 13, lineHeight: 18 },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
  },
  buyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
