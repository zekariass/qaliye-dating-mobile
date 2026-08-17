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

// ── Per-action icon + gradient config ────────────────────────────────────────

type ActionVisual = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  gradient: readonly [string, string];
};

const ACTION_VISUALS: Record<string, ActionVisual> = {
  LIKE:                 { icon: 'heart',                 gradient: ['#FF6B9D', '#E91E8C'] },
  LIKES:                { icon: 'heart',                 gradient: ['#FF6B9D', '#E91E8C'] },
  SUPER_LIKE:           { icon: 'star',                  gradient: ['#F59E0B', '#D97706'] },
  SUPERLIKES:           { icon: 'star',                  gradient: ['#F59E0B', '#D97706'] },
  REWIND:               { icon: 'arrow-undo',            gradient: ['#F97316', '#EA580C'] },
  REWINDS:              { icon: 'arrow-undo',            gradient: ['#F97316', '#EA580C'] },
  BOOST:                { icon: 'rocket',                gradient: ['#A020F0', '#6D35FF'] },
  SEE_WHO_LIKED_YOU:    { icon: 'eye',                   gradient: ['#8A2CFF', '#5B18D6'] },
  RETURN_PASSED_PROFILE:{ icon: 'refresh-circle',        gradient: ['#F97316', '#EA580C'] },
  SUPER_MESSAGE:        { icon: 'chatbubble-ellipses',   gradient: ['#06B6D4', '#0891B2'] },
  VOICE_MESSAGE:        { icon: 'mic',                   gradient: ['#10B981', '#059669'] },
  IMAGE_MESSAGE:        { icon: 'image',                 gradient: ['#3B82F6', '#2563EB'] },
  INCOGNITO_MODE:       { icon: 'glasses',               gradient: ['#374151', '#1F2937'] },
  CHANGE_ADDRESS:       { icon: 'location',              gradient: ['#22C55E', '#16A34A'] },
};

const DEFAULT_VISUAL: ActionVisual = {
  icon: 'diamond',
  gradient: ['#A020F0', '#6D35FF'],
};

function getActionVisual(actionCode: string | null | undefined): ActionVisual {
  return (actionCode ? ACTION_VISUALS[actionCode] : undefined) ?? DEFAULT_VISUAL;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InsufficientCreditsModal() {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const router = useRouter();
  const { entitlements, refetch } = useEntitlements();

  const visible     = useInsufficientCreditsStore((s) => s.visible);
  const actionCode  = useInsufficientCreditsStore((s) => s.actionCode);
  const title       = useInsufficientCreditsStore((s) => s.title);
  const message     = useInsufficientCreditsStore((s) => s.message);
  const retryConfig = useInsufficientCreditsStore((s) => s.retryConfig);
  const dismiss     = useInsufficientCreditsStore((s) => s.dismiss);

  const [isRetrying, setIsRetrying] = useState(false);
  const didRetryRef = useRef(false);

  const actionName = title ?? getActionName(actionCode);
  const summary    = getActionCostSummary(actionCode, entitlements);
  const visual     = getActionVisual(actionCode);

  const creditsEnabled      = entitlements?.country_settings?.credits_enabled ?? true;
  const subscriptionEnabled = entitlements?.country_settings?.subscription_enabled ?? true;

  // Reset retry flag when modal closes
  useEffect(() => {
    if (!visible) {
      setIsRetrying(false);
      didRetryRef.current = false;
    }
  }, [visible]);

  // Stale-entitlement auto-retry: user has enough credits but server returned 402
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Button visibility
  const showGoPremium  = subscriptionEnabled;
  const showBuyCredits = creditsEnabled && summary.hasCreditCost;
  const dismissLabel   = showGoPremium || showBuyCredits
    ? t('promotion.notNow', 'Not Now')
    : t('common.ok', 'OK');

  // Body text – two scenarios per spec
  const bodyText: string = summary.hasCreditCost && summary.cost !== null
    ? t('billing.creditCostBody', 'You need {{cost}} credits for this action.', { cost: summary.cost })
    : summary.message || message || `Your free ${actionName.toLowerCase()}s for this period have been used. Upgrade to ${actionName.toLowerCase()} more.`;

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
        {/* Stop propagation so tapping inside the card doesn't dismiss */}
        <Pressable
          style={[styles.card, { backgroundColor: th.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <Pressable
            onPress={dismiss}
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: pressed ? th.backgroundSelected : 'transparent' },
            ]}
            hitSlop={12}
          >
            <Ionicons name="close" size={20} color={th.textSecondary} />
          </Pressable>

          {/* Action icon */}
          <View style={styles.iconWrap}>
            <LinearGradient
              colors={visual.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name={visual.icon} size={38} color="#FFFFFF" />
            </LinearGradient>
          </View>

          {/* Title */}
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
              {/* Body message */}
              <Text style={[styles.bodyText, { color: th.textSecondary }]}>
                {bodyText}
              </Text>

              {/* Balance pill — only when credits apply */}
              {summary.hasCreditCost && summary.cost !== null && (
                <View style={[styles.balancePill, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="wallet-outline" size={15} color={colors.primary} />
                  <Text style={[styles.balanceText, { color: colors.primary }]}>
                    {t('billing.yourBalance', 'Your balance: {{balance}}', {
                      balance: summary.creditBalance.toLocaleString(),
                    })}
                  </Text>
                </View>
              )}

              {/* Buttons */}
              <View style={styles.buttonStack}>
                {showGoPremium && (
                  <Pressable
                    onPress={handleGoPremium}
                    style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Go Premium"
                  >
                    <LinearGradient
                      colors={['#A020F0', '#6D35FF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.btnGradient}
                    >
                      <Ionicons name="diamond" size={17} color="#FFFFFF" />
                      <Text style={styles.btnTextLight}>
                        {t('billing.goPremium', 'Go Premium')}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                )}

                {showBuyCredits && (
                  <Pressable
                    onPress={handleBuyCredits}
                    style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Buy Credits"
                  >
                    <LinearGradient
                      colors={['#FF6B35', '#F59E0B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.btnGradient}
                    >
                      <Ionicons name="add-circle" size={17} color="#FFFFFF" />
                      <Text style={styles.btnTextLight}>
                        {t('billing.buyCredits', 'Buy Credits')}
                      </Text>
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
                    {dismissLabel}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 12 },
  default: {},
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xl,
    paddingTop: 44,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    ...cardShadow,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 16,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  bodyText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  spinnerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  retryingText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  buttonStack: {
    width: '100%',
    gap: 10,
    marginTop: 14,
  },
  btn: {
    width: '100%',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  btnOutline: {
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnTextLight: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  btnTextMuted: {
    fontSize: 15,
    fontWeight: '600',
  },
});
