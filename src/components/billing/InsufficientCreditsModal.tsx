import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { getActionCostSummary, getActionName } from '@/utils/entitlements';

// ─────────────────────────────────────────────────────────────────────────────
// InsufficientCreditsModal
//
// Layout (same for every action — only the title changes):
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
// Title: dynamically set to the action name (e.g. "Reveal Profile",
//        "Super Like", "Incognito Mode", "Boost", etc.)
//
// Button visibility:
//   subscription_enabled → Go Premium
//   credits_enabled AND hasCreditCost → Buy Credits
//   always → Not Now
// ─────────────────────────────────────────────────────────────────────────────

export function InsufficientCreditsModal() {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const router  = useRouter();
  const { entitlements, refetch } = useEntitlements();

  const visible     = useInsufficientCreditsStore((s) => s.visible);
  const actionCode  = useInsufficientCreditsStore((s) => s.actionCode);
  const message     = useInsufficientCreditsStore((s) => s.message);
  const retryConfig = useInsufficientCreditsStore((s) => s.retryConfig);
  const dismiss     = useInsufficientCreditsStore((s) => s.dismiss);

  const [isRetrying, setIsRetrying] = useState(false);
  const didRetryRef = useRef(false);

  const summary = getActionCostSummary(actionCode, entitlements);

  const creditsEnabled      = entitlements?.country_settings?.credits_enabled      ?? true;
  const subscriptionEnabled = entitlements?.country_settings?.subscription_enabled ?? true;

  // Reset state when modal is hidden
  useEffect(() => {
    if (!visible) {
      setIsRetrying(false);
      didRetryRef.current = false;
    }
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
  // Only re-run when visibility or stale flag changes — not on every entitlement update
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
  const showGoPremium  = subscriptionEnabled;
  const showBuyCredits = creditsEnabled && summary.hasCreditCost;

  // ── Body content ─────────────────────────────────────────────────────────
  // Title: the action name (e.g. "Reveal Profile", "Super Like", "Incognito Mode")
  const actionName = getActionName(actionCode);

  // When a credit cost applies: "You need N credits to perform this action."
  // When free allowance is exhausted (no credit path): server message or generic
  const bodyText = summary.hasCreditCost && summary.cost !== null
    ? `You need ${summary.cost} credits to perform this action.`
    : summary.message || message || 'You have run out of access for this action.';

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      {/* Dimmed backdrop — tap outside to close */}
      <Pressable style={styles.overlay} onPress={dismiss}>
        <Pressable
          style={[styles.card, { backgroundColor: th.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* ── Header ───────────────────────────────────────────────── */}
          <View style={[styles.header, { borderBottomColor: th.border }]}>
            <View style={[styles.iconBadge, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="wallet-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: th.text }]}>
              {actionName}
            </Text>
          </View>

          {/* ── Body ─────────────────────────────────────────────────── */}
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
                {/* Cost line */}
                <Text style={[styles.bodyText, { color: th.text }]}>
                  {bodyText}
                </Text>

                {/* Balance line — only when credits apply */}
                {summary.hasCreditCost && summary.cost !== null && (
                  <Text style={[styles.balanceText, { color: th.textSecondary }]}>
                    Your balance:{' '}
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>
                      {summary.creditBalance.toLocaleString()} credits
                    </Text>
                  </Text>
                )}
              </>
            )}
          </View>

          {/* ── Buttons ──────────────────────────────────────────────── */}
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
// Styles
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
    ...cardShadow,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  },

  // Body
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 8,
  },
  bodyText: {
    fontSize: fontSize.sm,
    lineHeight: 22,
    fontWeight: '500',
  },
  balanceText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: fontSize.sm,
  },

  // Buttons
  buttons: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    gap: 10,
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
  },
});
