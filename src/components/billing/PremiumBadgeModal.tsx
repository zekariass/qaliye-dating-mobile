import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useTheme } from '@/hooks/use-theme';
import { getRevenueCatManagementURL } from '@/services/billing/revenueCatService';
import {
    isActiveSubscription,
    isFreePremiumPlan
} from '@/types/billing';

type ModalState = 'loading' | 'ready' | 'error';

export type PremiumBadgeModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function PremiumBadgeModal({ visible, onClose }: PremiumBadgeModalProps) {
  const { colors: th } = useTheme();
  const router = useRouter();
  const { entitlements, refreshEntitlements, isFetching } = useEntitlements();

  const [state, setState] = useState<ModalState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Refresh entitlements when modal opens
  useEffect(() => {
    if (!visible) {
      setState('loading');
      setErrorMessage(null);
      setIsNavigating(false);
      return;
    }
    setState('loading');
    setErrorMessage(null);
    refreshEntitlements();
  }, [visible, refreshEntitlements]);

  // Transition from loading to ready once entitlements fetch settles
  useEffect(() => {
    if (visible && state === 'loading' && !isFetching) {
      setState('ready');
    }
  }, [visible, state, isFetching]);

  const plan = entitlements?.plan ?? 'FREE';
  const subscription = entitlements?.subscription ?? null;
  const provider = subscription?.provider;
  const isActive = isActiveSubscription(subscription);
  const isFreePremium = isFreePremiumPlan(plan);

  const isRCProvider =
    provider === 'GOOGLE_PLAY' ||
    provider === 'APPLE_APP_STORE' ||
    provider === 'REVENUECAT';

  const handleManageSubscription = useCallback(async () => {
    if (isNavigating) return;
    setIsNavigating(true);

    try {
      let url: string | null = null;

      if (provider === 'GOOGLE_PLAY') {
        url = 'https://play.google.com/store/account/subscriptions';
      } else if (provider === 'APPLE_APP_STORE') {
        url = 'https://apps.apple.com/account/subscriptions';
      } else if (provider === 'REVENUECAT') {
        url = await getRevenueCatManagementURL();
        if (!url) {
          setState('error');
          setErrorMessage(
            'Unable to retrieve your subscription management link. Please try again later or contact support.',
          );
          setIsNavigating(false);
          return;
        }
      }

      if (!url) {
        setState('error');
        setErrorMessage('Subscription management is not available for this provider.');
        setIsNavigating(false);
        return;
      }

      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        setState('error');
        setErrorMessage('Unable to open the subscription management page.');
        setIsNavigating(false);
        return;
      }

      onClose();
      await Linking.openURL(url);
    } catch {
      setState('error');
      setErrorMessage('Something went wrong while opening subscription management.');
    } finally {
      setIsNavigating(false);
    }
  }, [provider, isNavigating, onClose]);

  const handleViewPremiumPlans = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    onClose();
    router.push('/(app)/premium' as any);
    setIsNavigating(false);
  }, [isNavigating, onClose, router]);

  const handleClose = useCallback(() => {
    if (isNavigating) return;
    onClose();
  }, [isNavigating, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={20} color={th.textSecondary} />
          </Pressable>

          {state === 'loading' ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: th.textSecondary }]}>
                Loading subscription info…
              </Text>
            </View>
          ) : state === 'error' ? (
            <View style={styles.contentContainer}>
              <View style={[styles.iconCircle, { backgroundColor: colors.danger + '20' }]}>
                <Ionicons name="alert-circle" size={28} color={colors.danger} />
              </View>
              <Text style={[styles.title, { color: th.text }]}>Something went wrong</Text>
              <Text style={[styles.message, { color: th.textSecondary }]}>
                {errorMessage ?? 'An unexpected error occurred.'}
              </Text>
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setState('loading');
                  setErrorMessage(null);
                  refreshEntitlements();
                }}
              >
                <Text style={styles.primaryBtnText}>Try Again</Text>
              </Pressable>
            </View>
          ) : !isActive && !isFreePremium ? (
            <View style={styles.contentContainer}>
              <View style={[styles.iconCircle, { backgroundColor: colors.warning + '20' }]}>
                <Ionicons name="time-outline" size={28} color={colors.warning} />
              </View>
              <Text style={[styles.title, { color: th.text }]}>Subscription Expired</Text>
              <Text style={[styles.message, { color: th.textSecondary }]}>
                Your premium subscription is no longer active.
              </Text>
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleViewPremiumPlans}
                disabled={isNavigating}
              >
                {isNavigating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>View Premium Plans</Text>
                )}
              </Pressable>
            </View>
          ) : isFreePremium ? (
            <View style={styles.contentContainer}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="gift-outline" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: th.text }]}>Free Premium</Text>
              <Text style={[styles.message, { color: th.textSecondary }]}>
                You are on Free Premium.
              </Text>
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleViewPremiumPlans}
                disabled={isNavigating}
              >
                {isNavigating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="diamond" size={16} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>View Premium Plans</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : isActive && isRCProvider ? (
            <View style={styles.contentContainer}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="diamond" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: th.text }]}>Premium</Text>
              <Text style={[styles.message, { color: th.textSecondary }]}>
                You are a Premium user.
              </Text>
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleManageSubscription}
                disabled={isNavigating}
              >
                {isNavigating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="settings-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.primaryBtnText}>Manage Subscription</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : isActive && !isRCProvider ? (
            <View style={styles.contentContainer}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="diamond" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: th.text }]}>Premium</Text>
              <Text style={[styles.message, { color: th.textSecondary }]}>
                You are a Premium user.
              </Text>
              <Text style={[styles.infoText, { color: th.textMuted }]}>
                Paid using a local payment method.
              </Text>
            </View>
          ) : null}
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
    maxWidth: 360,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 10,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    padding: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  contentContainer: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: spacing.sm,
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
  infoText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radius.sm,
    marginTop: 8,
    minWidth: 200,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
