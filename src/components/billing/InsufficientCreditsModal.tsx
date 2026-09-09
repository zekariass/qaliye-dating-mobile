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
//  │  [ Close          ]           │
//  └───────────────────────────────┘
//
// Title:  action name from getActionName(actionCode)
// Cost:   from entitlements.limits_and_costs[actionCode]
// Balance: from entitlements.credits.credit_balance
//
// Buttons (filtered by country_settings):
//   subscription_enabled → Go Premium
//   credits_enabled      → Buy Credits
//   always               → Close
// ─────────────────────────────────────────────────────────────────────────────

export function InsufficientCreditsModal() {
  const { colors: th } = useTheme();
  const router = useRouter();
  const { entitlements, refetch } = useEntitlements();

  const visible     = useInsufficientCreditsStore((s) => s.visible);
  const actionCode  = useInsufficientCreditsStore((s) => s.actionCode);
  const retryConfig = useInsufficientCreditsStore((s) => s.retryConfig);
  const storeMessage = useInsufficientCreditsStore((s) => s.message);
  const storeIsLimitExceeded     = useInsufficientCreditsStore((s) => s.isLimitExceeded);
  const storeApplyCreditAfterLimit = useInsufficientCreditsStore((s) => s.applyCreditAfterLimit);
  const serverNeeded  = useInsufficientCreditsStore((s) => s.serverNeeded);
  const serverBalance = useInsufficientCreditsStore((s) => s.serverBalance);
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
      console.log('[InsufficientCreditsModal] limits_and_costs map:', entitlements?.limits_and_costs);
      console.log('[InsufficientCreditsModal] action entry:', actionCode ? entitlements?.limits_and_costs?.[actionCode] : undefined);
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

  // When the store says this is a limit-exceeded error (429), trust that over
  // the cached entitlements which may be stale (remaining > 0 in cache but the
  // server just told us the limit is exhausted).
  const isLimitExceeded = storeIsLimitExceeded
    ? !storeApplyCreditAfterLimit  // 429 + apply_credit_after_limit → credits CAN help
    : summary.isLimitExceeded;

  const showGoPremium  = !isLimitExceeded && subscriptionEnabled && !hasPremium;
  const showBuyCredits = !isLimitExceeded && creditsEnabled;

  // ── Cost & balance ────────────────────────────────────────────────────────
  // Server-provided needed/balance (from 402 error details) are authoritative.
  // Fall back to client-side calculation only when the server didn't include them.
  const canonicalCode = normalizeActionCode(actionCode);
  const actionEntry = canonicalCode
    ? entitlements?.limits_and_costs?.[canonicalCode] ?? null
    : null;

  let cost: number | null;
  if (storeIsLimitExceeded && storeApplyCreditAfterLimit) {
    // 429 limit exceeded + credits can buy more → actual_credit_cost
    cost = actionEntry?.actual_credit_cost ?? null;
  } else if (storeIsLimitExceeded && !storeApplyCreditAfterLimit) {
    // 429 limit exceeded + credits can't help → cost is irrelevant (shows "Limit Exceeded")
    cost = null;
  } else if (serverNeeded !== null) {
    // 402 with server-provided needed value — use it directly
    cost = serverNeeded;
  } else if (summary.cost !== null) {
    // 402 without server details: trust getActionCostSummary which picks member vs actual
    cost = summary.cost;
  } else if (actionEntry) {
    // Fallback when summary couldn't compute: pick the right cost based on
    // whether the user still has free quota remaining.
    const remaining = actionEntry.remaining ?? 0;
    cost = remaining > 0
      ? actionEntry.member_credit_cost
      : actionEntry.actual_credit_cost;
  } else {
    cost = null;
  }

  // Balance: prefer server-provided value, fall back to cached entitlements
  const balance = serverBalance !== null ? serverBalance : summary.creditBalance;

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
                {summary.periodType !== 'LIFETIME' && (
                  <Text style={[styles.limitTryAgain, { color: th.textMuted }]}>
                    Try {formatTryAgainLabel(summary.periodType)}
                  </Text>
                )}
              </>
            ) : cost !== null ? (
              <>
                {/* Cost line — label + value, large and bold */}
                <Text style={[styles.costLabel, { color: th.textSecondary }]}>
                  You need:
                </Text>
                <Text style={styles.costValue}>
                  {cost.toLocaleString()} Credits
                </Text>

                {/* Balance line — label + value, large and bold */}
                <Text style={[styles.balanceLabel, { color: th.textSecondary }]}>
                  Your balance:
                </Text>
                <Text style={styles.balanceValue}>
                  {balance.toLocaleString()} Credits
                </Text>
              </>
            ) : (
              /* Fallback: server didn't provide needed/balance and client-side
                 lookup failed — show the server message only. */
              <Text style={[styles.costLabel, { color: th.textSecondary, marginBottom: 8 }]}>
                {storeMessage || "You don't have enough credits for this action."}
              </Text>
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
                      color={colors.danger}
                    />
                    <Text style={[styles.btnTextMuted, { color: colors.danger, opacity: p ? 0.7 : 1 }]}>
                      Close
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
