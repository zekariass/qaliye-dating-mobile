import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { apiClient } from '@/api/apiClient';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useTheme } from '@/hooks/use-theme';
import { useInsufficientCreditsStore } from '@/stores/insufficient-credits-store';
import { isPremiumPlan } from '@/types/billing';
import { formatPeriodType, formatTryAgainLabel, getActionCostSummary, getActionName, normalizeActionCode } from '@/utils/entitlements';

// ─────────────────────────────────────────────────────────────────────────────
// InsufficientCreditsModal — reusable for all credit-consuming actions.
//
//  ┌───────────────────────────────┐
//  │       Reveal Profile          │
//  │ ─────────────────────────── │
//  │                               │
//  │  You need:                    │
//  │  5 Credits                    │
//  │                               │
//  │  Your balance:                │
//  │  2 Credits                    │
//  │                               │
//  │  [ Go Premium     ]           │
//  │  [ Buy Credits    ]           │
//  │  [ Not Now        ]           │
//  └───────────────────────────────┘
//
// Title:  action name from getActionName(actionCode)
// Cost:   from entitlements.costs[actionCode]
// Balance: from entitlements.credits.credit_balance
//
// Buttons (filtered by country_settings):
//   subscription_enabled → Go Premium
//   credits_enabled      → Buy Credits
//   always               → Not Now
// ─────────────────────────────────────────────────────────────────────────────

export function InsufficientCreditsModal() {
  const { colors: th } = useTheme();
  const router = useRouter();
  const { entitlements, refetch } = useEntitlements();

  const visible     = useInsufficientCreditsStore((s) => s.visible);
  const actionCode  = useInsufficientCreditsStore((s) => s.actionCode);
  const retryConfig = useInsufficientCreditsStore((s) => s.retryConfig);
  const dismiss     = useInsufficientCreditsStore((s) => s.dismiss);

  const [isRetrying, setIsRetrying] = useState(false);
  const didRetryRef = useRef(false);

  const summary = getActionCostSummary(actionCode, entitlements);
  const actionName = getActionName(actionCode);

  const creditsEnabled      = entitlements?.country_settings?.credits_enabled      ?? true;
  const subscriptionEnabled = entitlements?.country_settings?.subscription_enabled ?? true;

  // Reset state when modal is hidden
  useEffect(() => {
    if (!visible) {
      setIsRetrying(false);
      didRetryRef.current = false;
    }
  }, [visible]);

  // Always refetch entitlements when the modal opens so we have fresh
  // costs/balance data from the backend (the cached query may be stale).
  useEffect(() => {
    if (visible) {
      refetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Debug: log what's in the costs map when the modal opens
  useEffect(() => {
    if (visible && __DEV__) {
      console.log('[InsufficientCreditsModal] actionCode:', actionCode);
      console.log('[InsufficientCreditsModal] costs map:', entitlements?.costs);
      console.log('[InsufficientCreditsModal] costInfo for action:', actionCode ? entitlements?.costs?.[actionCode] : undefined);
      console.log('[InsufficientCreditsModal] summary:', summary);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Stale-entitlement retry: balance >= cost but server still returned 402.
  // Re-fetch entitlements and retry the original request once silently.
  useEffect(() => {
    if (!visible || !actionCode || !retryConfig || isRetrying) return;
    if (!summary.isStale || didRetryRef.current) return;

    didRetryRef.current = true;
    setIsRetrying(true);

    refetch()
      .then((result) => {
        const fresh = result.data ?? entitlements;
        const freshSummary = getActionCostSummary(actionCode, fresh);
        if (!freshSummary.isStale) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return apiClient.request({ ...(retryConfig as any), _insufficientCreditRetry: true });
        }
        throw new Error('still-insufficient');
      })
      .then(() => { setIsRetrying(false); dismiss(); })
      .catch(() => { setIsRetrying(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, summary.isStale]);

  const handleGoPremium = useCallback(() => {
    dismiss();
    router.push('/(app)/premium' as any);
  }, [dismiss, router]);

  const handleBuyCredits = useCallback(() => {
    dismiss();
    router.push('/(app)/credits-shop' as any);
  }, [dismiss, router]);

  // ── Button visibility ────────────────────────────────────────────────────
  // Go Premium: only if subscriptions are enabled AND user is not already premium
  // Buy Credits: only if credits are enabled
  // Both hidden when the issue is a limit being exceeded (credits can't help)
  const hasPremium = isPremiumPlan(entitlements?.plan);
  const isLimitExceeded = summary.isLimitExceeded;
  const showGoPremium  = !isLimitExceeded && subscriptionEnabled && !hasPremium;
  const showBuyCredits = !isLimitExceeded && creditsEnabled;

  // ── Cost & balance (always shown) ─────────────────────────────────────────
  // Primary: from getActionCostSummary (applies limit/remaining logic)
  // Fallback: read actual_credit_cost directly from the costs map (using
  // canonical action code so variants like LIKES → LIKE resolve correctly)
  const canonicalCode = normalizeActionCode(actionCode);
  const directCost = canonicalCode
    ? entitlements?.costs?.[canonicalCode]?.actual_credit_cost ?? null
    : null;
  const cost    = summary.cost ?? directCost;
  const balance = summary.creditBalance;

  if (!visible) return null;

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
          style={[styles.card, { backgroundColor: th.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* ── Header: action name centered ───────────────────────────── */}
          <View style={[styles.header, { borderBottomColor: th.border }]}>
            <View style={[styles.iconBadge, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="wallet-outline" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: th.text }]}>
              {actionName}
            </Text>
          </View>

          {/* ── Body ─────────────────────────────────────────────────────── */}
          <View style={styles.body}>
            {isRetrying ? (
              <View style={styles.retryRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.retryText, { color: th.textSecondary }]}>
                  Checking your account…
                </Text>
              </View>
            ) : isLimitExceeded ? (
              <>
                {/* Limit exceeded message */}
                <Text style={styles.limitExceededMessage}>
                  Limit Exceeded
                </Text>
                <Text style={[styles.limitPeriod, { color: th.textSecondary }]}>
                  Period: {formatPeriodType(summary.periodType)}
                </Text>
                <Text style={[styles.limitTryAgain, { color: th.textMuted }]}>
                  Try {formatTryAgainLabel(summary.periodType)}
                </Text>
              </>
            ) : (
              <>
                {/* Cost line — label + value, large and bold */}
                <Text style={[styles.costLabel, { color: th.textSecondary }]}>
                  You need:
                </Text>
                <Text style={styles.costValue}>
                  {cost !== null ? cost.toLocaleString() : '—'} Credits
                </Text>

                {/* Balance line — label + value, large and bold */}
                <Text style={[styles.balanceLabel, { color: th.textSecondary }]}>
                  Your balance:
                </Text>
                <Text style={styles.balanceValue}>
                  {balance.toLocaleString()} Credits
                </Text>
              </>
            )}
          </View>

          {/* ── Buttons ────────────────────────────────────────────────── */}
          {!isRetrying && (
            <View style={styles.buttons}>
              {showGoPremium && (
                <Pressable
                  onPress={handleGoPremium}
                  style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={['#A020F0', '#6D35FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btnInner}
                  >
                    <Ionicons name="diamond" size={16} color="#fff" />
                    <Text style={styles.btnTextWhite}>Go Premium</Text>
                  </LinearGradient>
                </Pressable>
              )}

              {showBuyCredits && (
                <Pressable
                  onPress={handleBuyCredits}
                  style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={['#FF6B35', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btnInner}
                  >
                    <Ionicons name="add-circle-outline" size={16} color="#fff" />
                    <Text style={styles.btnTextWhite}>Buy Credits</Text>
                  </LinearGradient>
                </Pressable>
              )}

              <Pressable
                onPress={dismiss}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnNotNow,
                  { backgroundColor: th.backgroundElement, borderColor: th.border },
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
              >
                {({ pressed: p }: { pressed: boolean }) => (
                  <View style={styles.btnInner}>
                    <Ionicons
                      name="close-outline"
                      size={16}
                      color={th.textSecondary}
                    />
                    <Text style={[styles.btnTextMuted, { color: th.textSecondary, opacity: p ? 0.7 : 1 }]}>
                      Not Now
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles — everything centered
// ─────────────────────────────────────────────────────────────────────────────

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },
  android: { elevation: 10 },
  default: {},
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    ...cardShadow,
  },

  // Header — centered
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },

  // Body — centered
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  costLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    textAlign: 'center',
  },
  costValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    textAlign: 'center',
  },
  balanceValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 4,
  },
  limitExceededMessage: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  limitPeriod: {
    fontSize: fontSize.base,
    fontWeight: '600',
    textAlign: 'center',
  },
  limitTryAgain: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },

  // Buttons — full width, centered
  buttons: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    gap: 10,
    alignSelf: 'stretch',
  },
  btn: {
    width: '100%',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  btnPressed: {
    opacity: 0.80,
    transform: [{ scale: 0.98 }],
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  btnNotNow: {
    borderWidth: 1.5,
  },
  btnTextWhite: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnTextMuted: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
