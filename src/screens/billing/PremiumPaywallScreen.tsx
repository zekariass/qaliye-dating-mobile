import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EntitlementSummary } from '@/components/billing/EntitlementSummary';
import { OfferCard } from '@/components/billing/OfferCard';
import { PaymentMethodSheet } from '@/components/billing/PaymentMethodSheet';
import { themedAlert, themedError, themedSuccess } from '@/components/common/ThemedAlert';
import { colors } from '@/constants/theme';
import { useCreateOrder } from '@/hooks/billing/useCreateOrder';
import { useEligiblePromotions } from '@/hooks/billing/useEligiblePromotions';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useOffers } from '@/hooks/billing/useOffers';
import { usePaymentOptions } from '@/hooks/billing/usePaymentOptions';
import { useRedeemPromotion } from '@/hooks/billing/useRedeemPromotion';
import { useRevenueCatPurchase } from '@/hooks/billing/useRevenueCatPurchase';
import { useRevenueCatReconcile } from '@/hooks/billing/useRevenueCatReconcile';
import { useRevenueCatRestore } from '@/hooks/billing/useRevenueCatRestore';
import { useTheme } from '@/hooks/use-theme';
import type { PurchasesPackage } from '@/services/billing/revenueCatService';
import type { ClaimablePromotionDto, PaymentMethodDto } from '@/types/billing';
import { isActiveSubscription, isFreePremiumPlan, isPremiumPlan } from '@/types/billing';
import { extractApiError } from '@/utils/apiError';
import { getPlanLimitDisplays } from '@/utils/entitlements';

const FEATURE_ICONS = {
  see_who_liked_you: 'eye' as const,
  advanced_filters: 'options-outline' as const,
  incognito_mode: 'eye-off' as const,
};

export default function PremiumPaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { colors: th } = useTheme();

  const { entitlements, isLoading: loadingEntitlements } = useEntitlements();
  const { subscriptionOffers, isLoading: loadingOffers, isError: offersError } = useOffers('SUBSCRIPTION');
  const { paymentMethods, resolvedMarketCountryCode } = usePaymentOptions();
  const { reconciledOffers, localOffers, isLoadingRc, hasRcPaymentMethod } = useRevenueCatReconcile(subscriptionOffers, paymentMethods);
  const { purchase, purchaseState, isPurchasing } = useRevenueCatPurchase();
  const { restore, restoreState, restoreResult, isRestoring } = useRevenueCatRestore();
  const { mutate: createOrder, isPending: isCreatingOrder } = useCreateOrder();
  const { data: eligiblePromotions = [] } = useEligiblePromotions();
  const { mutate: redeemPromotion, isPending: isRedeeming } = useRedeemPromotion();
  const [claimingKey, setClaimingKey] = useState<string | null>(null);

  const handleClaimPromotion = useCallback((cp: ClaimablePromotionDto) => {
    if (isRedeeming || claimingKey) return;
    const eligible = eligiblePromotions.find(
      (p) => p.campaign_key === cp.campaign_key && p.can_redeem,
    );
    if (!eligible) return;
    setClaimingKey(cp.campaign_key);
    redeemPromotion(cp.campaign_key, {
      onSuccess: (data) => {
        setClaimingKey(null);
        themedSuccess(
          t('promotion.claimSuccessTitle', 'Premium Activated!'),
          data.message || t('promotion.claimSuccessBody', 'Your free premium access is now active.'),
        );
      },
      onError: (err) => {
        setClaimingKey(null);
        const detail = extractApiError(err);
        themedError(t('promotion.claimErrorTitle', 'Claim Failed'), detail.message);
      },
    });
  }, [isRedeeming, claimingKey, eligiblePromotions, redeemPromotion, t]);

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

  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [showMethodSheet, setShowMethodSheet] = useState(false);

  const isGlobalMarket = subscriptionOffers.some((o) => o.country_code === 'GLOBAL');
  const isPremium = isPremiumPlan(entitlements?.plan) && isActiveSubscription(entitlements?.subscription);
  const isFreePremium = isFreePremiumPlan(entitlements?.plan) && isActiveSubscription(entitlements?.subscription);

  const activeOfferId = isPremium
    ? subscriptionOffers.find(
        (o) =>
          o.product_type === 'SUBSCRIPTION' &&
          o.billing_interval_count === entitlements?.subscription?.billing_interval_count &&
          o.billing_interval_unit === entitlements?.subscription?.billing_interval_unit,
      )?.id ?? null
    : null;

  const isProcessing = purchaseState === 'processing' || purchaseState === 'purchasing';
  const isBusy = isPurchasing || isCreatingOrder || isProcessing;

  const handleSelectOffer = useCallback((offerId: string) => {
    if (!isBusy) setSelectedOfferId(offerId);
  }, [isBusy]);

  const handleRcPurchase = useCallback((pkg: PurchasesPackage) => {
    purchase({ pkg, productType: 'SUBSCRIPTION' }, {
      onError: (e) => themedError('Purchase failed', e.message),
    });
  }, [purchase]);

  const proceedWithMethod = useCallback((offerId: string, method: PaymentMethodDto) => {
    const isRc = method.payment_channel === 'REVENUECAT_APPLE' || method.payment_channel === 'REVENUECAT_GOOGLE';
    if (isRc) {
      const rc = reconciledOffers.find((r) => r.backendOffer.id === offerId);
      if (rc) {
        handleRcPurchase(rc.rcPackage);
        return;
      }
      themedError(t('billing.purchaseFailed', 'Purchase failed'), t('billing.storeUnavailable', 'Store purchase unavailable. Please try again later.'));
      return;
    }

    if (method.payment_channel === 'MANUAL_TRANSFER') {
      router.push({
        pathname: '/(app)/manual-payment',
        params: { methodId: method.id, offerId },
      } as any);
      return;
    }

    createOrder(
      { paymentOfferId: offerId, paymentMethodId: method.id },
      {
        onSuccess: (order) => {
          if (order.provider_checkout_url) {
            router.push({
              pathname: '/(app)/order-status',
              params: { orderId: order.id, checkoutUrl: order.provider_checkout_url },
            } as any);
          } else {
            router.push({
              pathname: '/(app)/manual-payment',
              params: { orderId: order.id },
            } as any);
          }
        },
        onError: (e) => themedError(t('billing.orderFailed', 'Order failed'), (e as Error).message),
      },
    );
  }, [createOrder, reconciledOffers, handleRcPurchase, router, t]);

  const handlePurchase = useCallback(() => {
    if (!selectedOfferId) return;
    if (isGlobalMarket) {
      if (isLoadingRc) return;
      const rcOffer = reconciledOffers.find((r) => r.backendOffer.id === selectedOfferId);
      if (rcOffer) {
        handleRcPurchase(rcOffer.rcPackage);
      } else {
        themedError(t('billing.purchaseFailed', 'Purchase failed'), t('billing.storeUnavailable', 'Store purchase unavailable. Please try again later.'));
      }
      return;
    }
    setShowMethodSheet(true);
  }, [selectedOfferId, isGlobalMarket, reconciledOffers, isLoadingRc, handleRcPurchase, t]);

  const handleMethodConfirm = useCallback((method: PaymentMethodDto) => {
    if (!selectedOfferId) return;
    setShowMethodSheet(false);
    proceedWithMethod(selectedOfferId, method);
  }, [selectedOfferId, proceedWithMethod]);

  const isLoading = loadingEntitlements || loadingOffers || (isGlobalMarket && isLoadingRc);
  const noOffers = !isLoading && (
    isGlobalMarket
      ? reconciledOffers.length === 0 && localOffers.filter((o) => o.country_code === 'GLOBAL').length === 0
      : subscriptionOffers.length === 0
  );

  return (
    <View style={[styles.screen, { backgroundColor: th.background, paddingTop: top }]}>
      <View style={styles.header}>
        <Pressable
          style={[styles.closeBtn, { backgroundColor: th.backgroundElement }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.close', 'Close')}
        >
          <Ionicons name="close" size={20} color={th.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: th.text }]}>
          {t('billing.premiumTitle', 'Go Premium')}
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
            {entitlements && (
              <EntitlementSummary
                entitlements={entitlements}
                textColor={th.text}
                secondaryColor={th.textSecondary}
                surfaceColor={th.surface}
                borderColor={th.border}
              />
            )}

            {isPremium && (
              <View style={[styles.alreadyActiveBanner, { backgroundColor: (isFreePremium ? colors.warning : colors.success) + '18' }]}>
                <Ionicons name={isFreePremium ? 'gift' : 'checkmark-circle'} size={20} color={isFreePremium ? colors.warning : colors.success} />
                <Text style={[styles.alreadyActiveText, { color: th.text }]}>
                  {isFreePremium
                    ? t('billing.freePremiumActive', 'You are currently using Free Premium.')
                    : t('billing.alreadyPremium', 'You already have Premium access.')}
                </Text>
              </View>
            )}

            {!isPremium && (
              <View style={[styles.featuresCard, { backgroundColor: th.surface, borderColor: th.border }]}>
                <Text style={[styles.sectionTitle, { color: th.text }]}>
                  {t('billing.premiumFeatures', 'Premium features')}
                </Text>
                {getPlanLimitDisplays(entitlements).map((item) => (
                  <View key={item.label} style={styles.featureRow}>
                    <Ionicons name={item.icon} size={16} color={colors.primary} />
                    <Text style={[styles.featureLabel, { color: th.text }]}>{item.label}</Text>
                    <Text style={[styles.featureValue, { color: colors.primary }]}>{item.formatted}</Text>
                  </View>
                ))}
                {entitlements?.features && (
                  <>
                    <View style={styles.featureRow}>
                      <Ionicons name={FEATURE_ICONS.see_who_liked_you} size={16} color={colors.primary} />
                      <Text style={[styles.featureLabel, { color: th.text }]}>See who liked you</Text>
                    </View>
                    {entitlements.features.advanced_filters && (
                      <View style={styles.featureRow}>
                        <Ionicons name={FEATURE_ICONS.advanced_filters} size={16} color={colors.primary} />
                        <Text style={[styles.featureLabel, { color: th.text }]}>Advanced filters</Text>
                      </View>
                    )}
                  </>
                )}
                <View style={styles.featureRow}>
                  <Ionicons name={FEATURE_ICONS.incognito_mode} size={16} color={colors.primary} />
                  <Text style={[styles.featureLabel, { color: th.text }]}>Private mode (Incognito)</Text>
                </View>
              </View>
            )}

            {(() => {
              const allClaimable = subscriptionOffers
                .flatMap((o) => o.claimable_promotions ?? [])
                .filter(
                  (cp, idx, arr) =>
                    arr.findIndex((x) => x.campaign_key === cp.campaign_key) === idx,
                );
              if (!allClaimable.length) return null;
              return allClaimable.map((cp) => {
                const isEligible = eligiblePromotions.some(
                  (p) => p.campaign_key === cp.campaign_key && p.can_redeem,
                );
                if (!isEligible) return null;
                const isClaiming = claimingKey === cp.campaign_key;
                return (
                  <View
                    key={cp.campaign_key}
                    style={[styles.claimableBanner, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  >
                    <View style={styles.claimableIconCircle}>
                      <Ionicons name="gift" size={22} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.claimableName}>{cp.name}</Text>
                      {cp.description ? (
                        <Text style={styles.claimableDesc} numberOfLines={2}>
                          {cp.description}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      style={[styles.claimBtn, isClaiming && styles.claimBtnDisabled]}
                      onPress={() => handleClaimPromotion(cp)}
                      disabled={isClaiming || isRedeeming}
                      accessibilityRole="button"
                    >
                      {isClaiming ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Text style={styles.claimBtnText}>
                          {t('promotion.claimNow', 'Claim now')}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                );
              });
            })()}

            {(noOffers || offersError) && !isPremium ? (
              <View style={[styles.unavailableCard, { backgroundColor: th.surface, borderColor: th.border }]}>
                <Ionicons name="alert-circle-outline" size={28} color={th.textSecondary} />
                <Text style={[styles.unavailableTitle, { color: th.text }]}>
                  {t('billing.offersUnavailable', 'Subscription not available')}
                </Text>
                <Text style={[styles.unavailableBody, { color: th.textSecondary }]}>
                  {t('billing.offersUnavailableBody', 'No subscription offers are available for your region or platform right now. Please try again later.')}
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: th.text, marginTop: 10 }]}>
                  {t('billing.choosePlan', 'Choose a plan')}
                </Text>

                {isGlobalMarket
                  ? (
                    reconciledOffers.length > 0
                      ? reconciledOffers.map(({ backendOffer, rcPackage }) => (
                          <OfferCard
                            key={backendOffer.id}
                            offer={backendOffer}
                            rcPackage={rcPackage}
                            isSelected={selectedOfferId === backendOffer.id}
                            isActive={activeOfferId === backendOffer.id}
                            disabled={isPremium && activeOfferId !== backendOffer.id}
                            hasActivePremium={isPremium}
                            onSelect={() => handleSelectOffer(backendOffer.id)}
                            onPurchase={handlePurchase}
                            isPurchasing={isBusy}
                            storeUnavailable={isLoadingRc}
                            textColor={th.text}
                            secondaryColor={th.textSecondary}
                            surfaceColor={th.surface}
                            borderColor={th.border}
                          />
                        ))
                      : localOffers.filter((o) => o.country_code === 'GLOBAL').map((offer) => (
                          <OfferCard
                            key={offer.id}
                            offer={offer}
                            isSelected={selectedOfferId === offer.id}
                            isActive={activeOfferId === offer.id}
                            disabled={isPremium && activeOfferId !== offer.id}
                            hasActivePremium={isPremium}
                            onSelect={() => handleSelectOffer(offer.id)}
                            onPurchase={handlePurchase}
                            isPurchasing={isBusy}
                            storeUnavailable
                            textColor={th.text}
                            secondaryColor={th.textSecondary}
                            surfaceColor={th.surface}
                            borderColor={th.border}
                          />
                        ))
                  )
                  : localOffers.map((offer) => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        isSelected={selectedOfferId === offer.id}
                        isActive={activeOfferId === offer.id}
                        disabled={isPremium && activeOfferId !== offer.id}
                        hasActivePremium={isPremium}
                        onSelect={() => handleSelectOffer(offer.id)}
                        onPurchase={handlePurchase}
                        isPurchasing={isBusy}
                        textColor={th.text}
                        secondaryColor={th.textSecondary}
                        surfaceColor={th.surface}
                        borderColor={th.border}
                      />
                    ))
                }

                {purchaseState === 'processing' && (
                  <View style={[styles.alreadyActiveBanner, { backgroundColor: colors.primary + '15' }]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.alreadyActiveText, { color: th.text }]}>
                      {t('billing.purchaseActivating', 'Activating your subscription…')}
                    </Text>
                  </View>
                )}

                {purchaseState === 'confirmed' && (
                  <View style={[styles.alreadyActiveBanner, { backgroundColor: colors.success + '18' }]}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={[styles.alreadyActiveText, { color: th.text }]}>
                      {t('billing.purchaseConfirmed', 'Purchase confirmed! Premium is now active.')}
                    </Text>
                  </View>
                )}

                {purchaseState === 'pending' && (
                  <View style={[styles.alreadyActiveBanner, { backgroundColor: colors.warning + '18' }]}>
                    <ActivityIndicator size="small" color={colors.warning} />
                    <Text style={[styles.alreadyActiveText, { color: th.text }]}>
                      {t('billing.purchasePending', 'Activating… this may take a moment.')}
                    </Text>
                  </View>
                )}
              </>
            )}

            {Platform.OS !== 'web' && (
              <Pressable
                style={styles.restoreBtn}
                onPress={() => restore()}
                disabled={isRestoring}
                accessibilityRole="button"
              >
                {isRestoring ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.restoreText, { color: colors.primary }]}>
                    {t('billing.restorePurchases', 'Restore Purchases')}
                  </Text>
                )}
              </Pressable>
            )}

            {restoreState === 'done' && (
              <Text style={[styles.restoreDone, { color: colors.success }]}>
                {t('billing.restoreDone', 'Restore complete. Check your plan status above.')}
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <PaymentMethodSheet
        visible={showMethodSheet}
        onConfirm={handleMethodConfirm}
        onDismiss={() => setShowMethodSheet(false)}
        surfaceColor={th.surface}
        borderColor={th.border}
        textColor={th.text}
        secondaryColor={th.textSecondary}
        backgroundColor={th.background}
      />
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
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { paddingHorizontal: 16, gap: 8 },
  centered: { paddingVertical: 60, alignItems: 'center' },
  alreadyActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 12,
  },
  alreadyActiveText: { flex: 1, fontSize: 13, fontWeight: '500' },
  featuresCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureLabel: { flex: 1, fontSize: 14 },
  featureValue: { fontSize: 14, fontWeight: '700' },
  claimableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  claimableIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimableName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  claimableDesc: {
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.85)',
  },
  claimBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    minWidth: 90,
    alignItems: 'center',
  },
  claimBtnDisabled: {
    opacity: 0.6,
  },
  claimBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  unavailableCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  unavailableTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  unavailableBody: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  restoreBtn: { alignItems: 'center', paddingVertical: 12 },
  restoreText: { fontSize: 14, fontWeight: '500' },
  restoreDone: { textAlign: 'center', fontSize: 13 },
});
