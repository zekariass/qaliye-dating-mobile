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
import { getActionCostSummary, getActionName } from '@/utils/entitlements';

// ─────────────────────────────────────────────────────────────────────────────
// InsufficientCreditsModal — reusable for all credit-consuming actions.
//
//  ┌───────────────────────────────┐
//  │       Reveal Profile          │
//  │ ─────────────────────────── │
//  │                               │
//  │  You need 5 credits to        │
//  │  perform this action.         │
//  │                               │
//  │  Your balance: 2 credits      │
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
  const hasPremium = isPremiumPlan(entitlements?.plan);
  const showGoPremium  = subscriptionEnabled && !hasPremium;
  const showBuyCredits = creditsEnabled;

  // ── Cost & balance (always shown) ─────────────────────────────────────────
  // Primary: from getActionCostSummary (applies limit/remaining logic)
  // Fallback: read member_credit_cost directly from the costs map
  const directCost = actionCode
    ? entitlements?.costs?.[actionCode]?.member_credit_cost ?? null
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

          {/* ── Body: cost + balance, all centered ─────────────────────── */}
          <View style={styles.body}>
            {isRetrying ? (
              <View style={styles.retryRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.retryText, { color: th.textSecondary }]}>
                  Checking your account…
                </Text>
              </View>
            ) : (
              <>
                {/* Cost line — number styled prominently */}
                <Text style={[styles.costText, { color: th.text }]}>
                  You need{' '}
                  <Text style={styles.costHighlight}>
                    {cost !== null ? cost : '—'}
                  </Text>
                  {' '}credits to perform this action.
                </Text>

                {/* Balance line — number styled prominently */}
                <Text style={[styles.balanceText, { color: th.textSecondary }]}>
                  Your balance:{' '}
                  <Text style={styles.balanceHighlight}>
                    {balance.toLocaleString()} credits
                  </Text>
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
                  styles.btnOutline,
                  { borderColor: th.border },
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
              >
                <Text style={[styles.btnTextMuted, { color: th.textSecondary }]}>
                  Not Now
                </Text>
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
  costText: {
    fontSize: fontSize.sm,
    lineHeight: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
  costHighlight: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.primary,
  },
  balanceText: {
    fontSize: fontSize.sm,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 6,
  },
  balanceHighlight: {
    fontSize: fontSize.base,
    fontWeight: '800',
    color: colors.primary,
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
  btnOutline: {
    borderWidth: 1.5,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
