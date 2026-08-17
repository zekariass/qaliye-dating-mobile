import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { apiClient } from '@/api/apiClient';
import { colors, radius, spacing } from '@/constants/theme';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useTheme } from '@/hooks/use-theme';
import { useInsufficientCreditsStore } from '@/stores/insufficient-credits-store';
import { getActionCostSummary, getActionName } from '@/utils/entitlements';

const PREMIUM_PURPLE = '#7C3AED';

export function InsufficientCreditsModal() {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const router = useRouter();
  const { entitlements, refetch } = useEntitlements();

  const visible = useInsufficientCreditsStore((s) => s.visible);
  const actionCode = useInsufficientCreditsStore((s) => s.actionCode);
  const title = useInsufficientCreditsStore((s) => s.title);
  const message = useInsufficientCreditsStore((s) => s.message);
  const retryConfig = useInsufficientCreditsStore((s) => s.retryConfig);
  const dismiss = useInsufficientCreditsStore((s) => s.dismiss);

  const [isRetrying, setIsRetrying] = useState(false);
  const didRetryRef = useRef(false);

  const actionName = title ?? getActionName(actionCode);
  const summary = getActionCostSummary(actionCode, entitlements);
  const creditBalance = summary.creditBalance;

  const creditsEnabled = entitlements?.country_settings?.credits_enabled ?? true;
  const subscriptionEnabled = entitlements?.country_settings?.subscription_enabled ?? true;

  useEffect(() => {
    if (!visible) {
      didRetryRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !actionCode || !retryConfig || isRetrying) return;
    if (!summary.isStale || didRetryRef.current) return;

    didRetryRef.current = true;
    setIsRetrying(true);

    refetch()
      .then((result) => {
        const fresh = result.data ?? entitlements;
        const freshSummary = getActionCostSummary(actionCode, fresh);
        if (!freshSummary.isStale && retryConfig) {
          return apiClient.request({ ...(retryConfig as any), _insufficientCreditRetry: true });
        }
        throw new Error('still-insufficient');
      })
      .then(() => {
        setIsRetrying(false);
        dismiss();
      })
      .catch(() => {
        setIsRetrying(false);
      });
  }, [visible, actionCode, entitlements, retryConfig, isRetrying, refetch, dismiss, summary.isStale]);

  const handleGoPremium = useCallback(() => {
    dismiss();
    router.push('/(app)/premium' as any);
  }, [dismiss, router]);

  const handleBuyCredits = useCallback(() => {
    dismiss();
    router.push('/(app)/credits-shop' as any);
  }, [dismiss, router]);

  const bodyText = summary.message || message || t('billing.insufficientCreditBody', 'Insufficient credits for this action.');
  const showBuyCredits = creditsEnabled && summary.hasCreditCost;
  const showGoPremium = subscriptionEnabled;
  const okText = !showGoPremium && !showBuyCredits ? t('common.ok', 'OK') : t('promotion.notNow', 'Not Now');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={dismiss}>
        <Pressable
          style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="diamond-outline" size={28} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: th.text }]}>{actionName}</Text>

          {isRetrying ? (
            <View style={styles.spinnerWrap}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.retryingText, { color: th.textSecondary }]}>
                {t('billing.checkingEntitlements', 'Checking your account…')}
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.message, { color: th.textSecondary }]}>{bodyText}</Text>

              {summary.hasCreditCost && summary.cost !== null && (
                <View style={[styles.balancePill, { backgroundColor: `${colors.primary}12` }]}>
                  <Ionicons name="wallet-outline" size={16} color={colors.primary} />
                  <Text style={[styles.balanceText, { color: colors.primary }]}>
                    {t('billing.yourBalance', 'Your balance: {{balance}}', { balance: creditBalance.toLocaleString() })}
                  </Text>
                </View>
              )}
            </>
          )}

          <View style={styles.buttonCol}>
            {showGoPremium && (
              <Pressable style={[styles.button, styles.buttonPremium]} onPress={handleGoPremium}>
                <Ionicons name="diamond-outline" size={16} color="#fff" />
                <Text style={styles.buttonPrimaryText}>{t('billing.goPremium', 'Go Premium')}</Text>
              </Pressable>
            )}
            {showBuyCredits && (
              <Pressable style={[styles.button, styles.buttonPrimary]} onPress={handleBuyCredits}>
                <Ionicons name="cart-outline" size={16} color="#fff" />
                <Text style={styles.buttonPrimaryText}>{t('billing.buyCredits', 'Buy Credits')}</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.button, styles.buttonSecondary, { borderColor: th.border }]}
              onPress={dismiss}
            >
              <Text style={[styles.buttonText, { color: th.textSecondary }]}>{okText}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  buttonCol: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 120,
  },
  buttonSecondary: {
    borderWidth: 1,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonPremium: {
    backgroundColor: PREMIUM_PURPLE,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  spinnerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  retryingText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
