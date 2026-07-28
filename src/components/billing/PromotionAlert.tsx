import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { themedError, themedSuccess } from '@/components/common/ThemedAlert';
import { colors } from '@/constants/theme';
import { useRedeemPromotion } from '@/hooks/billing/useRedeemPromotion';
import { useTheme } from '@/hooks/use-theme';
import type { EligiblePromotionDto } from '@/types/billing';
import { extractApiError } from '@/utils/apiError';

type Props = {
  promotion: EligiblePromotionDto | null;
  onExplicitDismiss: () => void;
  onProgrammaticClose: () => void;
  onSuccess: (campaignKey: string) => void;
};

const PROMOTION_ERROR_MESSAGES: Record<string, string> = {
  promotion_not_found: 'This promotion is no longer available.',
  promotion_not_claimable: 'This promotion cannot be claimed at this time.',
  promotion_not_active: 'This promotion is not currently active.',
  promotion_expired: 'This promotion has expired.',
  promotion_not_eligible: 'You are not eligible for this promotion.',
  promotion_capacity_exhausted: 'This promotion has reached its claim limit.',
  user_has_active_subscription: 'You already have an active subscription.',
};

function formatDurationDays(days: number | null): string | null {
  if (days == null) return null;
  if (days % 30 === 0 && days >= 30) {
    const months = days / 30;
    return months === 1 ? '1 month' : `${months} months`;
  }
  if (days % 7 === 0) {
    const weeks = days / 7;
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  }
  return days === 1 ? '1 day' : `${days} days`;
}

function formatEndDate(endsAt: string | null): string | null {
  if (!endsAt) return null;
  try {
    return new Date(endsAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export function PromotionAlert({ promotion, onExplicitDismiss, onProgrammaticClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const { mutate: redeem, isPending: isRedeeming } = useRedeemPromotion();
  const [isClaiming, setIsClaiming] = useState(false);

  if (!promotion) return null;

  const isUserClaim =
    promotion.trigger_type === 'USER_CLAIM' && promotion.can_redeem;
  const isPurchase = promotion.trigger_type === 'PURCHASE';
  const durationLabel = formatDurationDays(promotion.duration_days);
  const endDateLabel = formatEndDate(promotion.ends_at);

  function handleClaim() {
    if (isClaiming || isRedeeming) return;
    setIsClaiming(true);
    redeem(promotion!.campaign_key, {
      onSuccess: (data) => {
        setIsClaiming(false);
        onSuccess(promotion!.campaign_key);
        themedSuccess(
          t('promotion.claimSuccessTitle', 'Premium Activated!'),
          data.message ||
            t(
              'promotion.claimSuccessBody',
              'Your free premium access is now active.',
            ),
        );
      },
      onError: (err) => {
        setIsClaiming(false);
        const detail = extractApiError(err);
        const errorMsg =
          PROMOTION_ERROR_MESSAGES[detail.code.toLowerCase()] ??
          t('promotion.claimError', 'Something went wrong. Please try again.');
        themedError(
          t('promotion.claimErrorTitle', 'Claim Failed'),
          errorMsg,
        );
        onProgrammaticClose();
      },
    });
  }

  function handleViewOffer() {
    onProgrammaticClose();
    router.push('/(app)/premium' as any);
  }

  return (
    <Modal
      visible={promotion != null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onExplicitDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onExplicitDismiss}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: th.surface, paddingBottom: bottom + 20 },
          ]}
          onPress={() => {}}
        >
          <View style={styles.pill} />

          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isPurchase
                  ? colors.warning + '20'
                  : colors.primary + '20',
              },
            ]}
          >
            <Ionicons
              name={isPurchase ? 'pricetag-outline' : 'diamond-outline'}
              size={28}
              color={isPurchase ? colors.warning : colors.primary}
            />
          </View>

          <Text style={[styles.title, { color: th.text }]}>{promotion.name}</Text>

          {promotion.target_gender && (
            <View style={[styles.genderPill, { backgroundColor: colors.primary + '12' }]}>
              <Ionicons name="person-outline" size={12} color={colors.primary} />
              <Text style={[styles.genderPillText, { color: colors.primary }]}>
                {promotion.target_gender === 'FEMALE'
                  ? t('promotion.forWomen', 'For women')
                  : t('promotion.forMen', 'For men')}
              </Text>
            </View>
          )}

          {promotion.description ? (
            <Text style={[styles.body, { color: th.textSecondary }]}>
              {promotion.description}
            </Text>
          ) : null}

          {durationLabel && (
            <View
              style={[
                styles.pill2,
                { backgroundColor: colors.primary + '15' },
              ]}
            >
              <Ionicons name="time-outline" size={14} color={colors.primary} />
              <Text style={[styles.pillText, { color: colors.primary }]}>
                {t('promotion.freeDays', '{{duration}} free', {
                  duration: durationLabel,
                })}
              </Text>
            </View>
          )}

          {endDateLabel && (
            <Text style={[styles.expiry, { color: th.textSecondary }]}>
              {t('promotion.expiresOn', 'Expires {{date}}', {
                date: endDateLabel,
              })}
            </Text>
          )}

          <View style={styles.actions}>
            {isUserClaim && (
              <Pressable
                style={[
                  styles.primaryBtn,
                  (isClaiming || isRedeeming) && styles.btnDisabled,
                ]}
                onPress={handleClaim}
                disabled={isClaiming || isRedeeming}
                accessibilityRole="button"
                accessibilityLabel={t('promotion.claimNow', 'Claim now')}
              >
                {isClaiming || isRedeeming ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {t('promotion.claimNow', 'Claim now')}
                  </Text>
                )}
              </Pressable>
            )}

            {isPurchase && (
              <Pressable
                style={styles.primaryBtn}
                onPress={handleViewOffer}
                accessibilityRole="button"
                accessibilityLabel={t('promotion.viewOffer', 'View offer')}
              >
                <Text style={styles.primaryBtnText}>
                  {t('promotion.viewOffer', 'View offer')}
                </Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.secondaryBtn, { borderColor: th.border }]}
              onPress={onExplicitDismiss}
              disabled={isClaiming || isRedeeming}
              accessibilityRole="button"
              accessibilityLabel={t('promotion.notNow', 'Not now')}
            >
              <Text style={[styles.secondaryBtnText, { color: th.textSecondary }]}>
                {t('promotion.notNow', 'Not now')}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
  },
  pill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  pill2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  genderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  genderPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  expiry: {
    fontSize: 12,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
