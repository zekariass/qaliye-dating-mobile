import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfferCard } from '@/components/billing/OfferCard';
import { PaymentMethodSheet } from '@/components/billing/PaymentMethodSheet';
import { PurchaseSuccessModal } from '@/components/billing/PurchaseSuccessModal';
import { themedAlert, themedError, themedSuccess } from '@/components/common/ThemedAlert';
import { colors } from '@/constants/theme';
import { useCreateOrder } from '@/hooks/billing/useCreateOrder';
import { useEligiblePromotions } from '@/hooks/billing/useEligiblePromotions';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useManageSubscription } from '@/hooks/billing/useManageSubscription';
import { useOffers } from '@/hooks/billing/useOffers';
import { usePaymentOptions } from '@/hooks/billing/usePaymentOptions';
import { useRedeemPromotion } from '@/hooks/billing/useRedeemPromotion';
import { useRevenueCatPurchase } from '@/hooks/billing/useRevenueCatPurchase';
import { useRevenueCatReconcile } from '@/hooks/billing/useRevenueCatReconcile';
import { useRevenueCatRestore } from '@/hooks/billing/useRevenueCatRestore';
import { useTheme } from '@/hooks/use-theme';
import type { PurchasesPackage } from '@/services/billing/revenueCatService';
import type { ClaimablePromotionDto, PaymentMethodDto } from '@/types/billing';
import { isActiveSubscription, isFreePremiumPlan, isPremiumPlan, type SubscriptionProvider } from '@/types/billing';
import { extractApiError } from '@/utils/apiError';

function formatProviderName(provider?: SubscriptionProvider): string {
  if (!provider) return 'Local';
  const names: Record<string, string> = {
    TELEBIRR: 'Telebirr',
    CBE_BIRR: 'CBE Birr',
    CHAPA: 'Chapa',
    ARIFPAY: 'ArifPay',
    BANK_TRANSFER: 'Bank Transfer',
    STRIPE: 'Stripe',
    PROMOTION: 'Promotion',
  };
  return names[provider] ?? provider.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function PremiumPaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { colors: th } = useTheme();

  const { entitlements, isLoading: loadingEntitlements, refreshEntitlements } = useEntitlements();

  useFocusEffect(
    useCallback(() => {
      refreshEntitlements();
    }, [refreshEntitlements]),
  );

  const { subscriptionOffers, isLoading: loadingOffers, isError: offersError } = useOffers('SUBSCRIPTION');
  const { paymentMethods, resolvedMarketCountryCode } = usePaymentOptions();
  const { reconciledOffers, localOffers, isLoadingRc, hasRcPaymentMethod } = useRevenueCatReconcile(subscriptionOffers, paymentMethods);
  const { purchase, purchaseState, isPurchasing, reset } = useRevenueCatPurchase();
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

        // Build the success message based on what was granted
        const grantedCredits = data.credits_granted;
        const grantedSubscription = data.subscription_id != null;

        let title: string;
        let body: string;

        if (grantedSubscription && grantedCredits != null && grantedCredits > 0) {
          title = t('promotion.claimSuccessTitle', 'Premium Activated!');
          body = data.message ||
            t(
              'promotion.claimSuccessWithCreditsBody',
              'Your free premium access is now active. You also received {{count}} credits!',
              { count: grantedCredits },
            );
        } else if (grantedSubscription) {
          title = t('promotion.claimSuccessTitle', 'Premium Activated!');
          body = data.message || t('promotion.claimSuccessBody', 'Your free premium access is now active.');
        } else if (grantedCredits != null && grantedCredits > 0) {
          title = t('promotion.creditsGrantedTitle', 'Credits Received!');
          body = data.message ||
            t('promotion.creditsGrantedBody', 'You received {{count}} credits!', { count: grantedCredits });
        } else {
          title = t('promotion.claimSuccessTitle', 'Success!');
          body = data.message || t('promotion.claimSuccessBody', 'Your reward has been applied.');
        }

        themedSuccess(title, body);
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

  const { manage: manageSubscription, isManaging: isManagingSub, error: manageSubError } = useManageSubscription();

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

  const bestValueId = useMemo(() => {
    const candidates = isGlobalMarket
      ? (reconciledOffers.length > 0
          ? reconciledOffers.map((r) => r.backendOffer)
          : localOffers.filter((o) => o.country_code === 'GLOBAL'))
      : localOffers;
    if (candidates.length < 2) return null;
    const unitDays: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };
    const scored = candidates
      .filter((o) => o.billing_interval_count && o.billing_interval_unit)
      .map((o) => ({
        id: o.id,
        score: o.billing_interval_count! * (unitDays[o.billing_interval_unit!] ?? 0),
      }));
    if (scored.length === 0) return null;
    const max = Math.max(...scored.map((s) => s.score));
    return scored.find((s) => s.score === max)?.id ?? null;
  }, [isGlobalMarket, reconciledOffers, localOffers]);

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
          if (order.status === 'REJECTED' || order.status === 'EXPIRED' || order.status === 'CANCELLED') {
            themedError(
              t('billing.orderFailed', 'Order failed'),
              order.status_reason || t('billing.orderCreationFailed', 'Could not create your order. Please try again.'),
            );
            return;
          }
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
  const subscriptionEnabled = entitlements?.country_settings?.subscription_enabled ?? true;
  const noOffers = !isLoading && (
    isGlobalMarket
      ? reconciledOffers.length === 0 && localOffers.filter((o) => o.country_code === 'GLOBAL').length === 0
      : subscriptionOffers.length === 0
  );

  const selectedOffer = subscriptionOffers.find((o) => o.id === selectedOfferId) ?? null;
  const confirmedFeatureName = selectedOffer
    ? `Premium${selectedOffer.billing_interval_count && selectedOffer.billing_interval_unit
        ? ` · ${selectedOffer.billing_interval_count} ${selectedOffer.billing_interval_unit.toLowerCase()}${selectedOffer.billing_interval_count > 1 ? 's' : ''}`
        : ''}`
    : 'Premium';

  return (
    <View style={[styles.screen, { backgroundColor: th.background, paddingTop: top }]}>
      <View style={styles.header}>
        <Pressable
          style={[styles.closeBtn, { backgroundColor: th.backgroundElement }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.close', 'Close')}
        >
          <Ionicons name="close" size={22} color={th.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: th.text }]}>
          {t('billing.premiumTitle', 'Go Premium')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {!subscriptionEnabled ? (
          <View style={[styles.unavailableCard, { backgroundColor: th.surface, borderColor: th.border }]}>
            <Ionicons name="ban-outline" size={28} color={th.textSecondary} />
            <Text style={[styles.unavailableTitle, { color: th.text }]}>
              {t('billing.subscriptionNotAvailable', 'Premium subscription is not available for your country')}
            </Text>
            <Text style={[styles.unavailableBody, { color: th.textSecondary }]}>
              {t('billing.subscriptionNotAvailableBody', 'Premium subscriptions are not supported in your region at this time.')}
            </Text>
          </View>
        ) : isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loaderText, { color: th.textSecondary }]}>
              {t('billing.loadingOffers', 'Loading offers…')}
            </Text>
          </View>
        ) : (
          <>
            {isPremium && (
              <View style={[styles.activePremiumCard, { backgroundColor: (isFreePremium ? colors.warning : colors.success) + '14', borderColor: (isFreePremium ? colors.warning : colors.success) + '40' }]}>
                <View style={styles.activePremiumHeader}>
                  <View style={[styles.activePremiumIconCircle, { backgroundColor: (isFreePremium ? colors.warning : colors.success) + '22' }]}>
                    <Ionicons name={isFreePremium ? 'gift' : 'checkmark-circle'} size={28} color={isFreePremium ? colors.warning : colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.activePremiumTitle, { color: th.text }]}>
                      {isFreePremium
                        ? t('billing.freePremiumActiveTitle', "You're on Free Premium")
                        : t('billing.alreadyPremiumTitle', "You're on Premium")}
                    </Text>
                    <Text style={[styles.activePremiumSubtitle, { color: th.textSecondary }]}>
                      {isFreePremium
                        ? t('billing.freePremiumActiveBody', 'Enjoy your premium features. Upgrade to a paid plan to keep them after your free period ends.')
                        : t('billing.alreadyPremiumBody', 'You have full premium access. Manage your subscription below.')}
                    </Text>
                  </View>
                </View>
                {isPremium && !isFreePremium && (() => {
                  const provider = entitlements?.subscription?.provider as SubscriptionProvider | undefined;
                  const isRCProvider = provider === 'GOOGLE_PLAY' || provider === 'APPLE_APP_STORE' || provider === 'REVENUECAT';
                  if (isRCProvider && provider) {
                    return (
                      <>
                        <Pressable
                          style={[styles.manageSubBtn, { backgroundColor: colors.primary }]}
                          onPress={() => manageSubscription(provider)}
                          disabled={isManagingSub}
                          accessibilityRole="button"
                        >
                          {isManagingSub ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <>
                              <Ionicons name="settings-outline" size={16} color="#FFFFFF" />
                              <Text style={styles.manageSubBtnText}>
                                {t('billing.manageSubscription', 'Manage Subscription')}
                              </Text>
                            </>
                          )}
                        </Pressable>
                        {manageSubError && (
                          <Text style={[styles.manageSubError, { color: colors.danger }]}>
                            {manageSubError}
                          </Text>
                        )}
                      </>
                    );
                  }
                  return (
                    <View style={[styles.localInfoCard, { backgroundColor: th.surface, borderColor: th.border }]}>
                      <View style={styles.localInfoRow}>
                        <Ionicons name="card-outline" size={16} color={th.textSecondary} />
                        <Text style={[styles.localInfoLabel, { color: th.textSecondary }]}>
                          {t('billing.paymentMethod', 'Payment Method')}
                        </Text>
                        <Text style={[styles.localInfoValue, { color: th.text }]}>
                          {formatProviderName(provider)}
                        </Text>
                      </View>

                      {entitlements?.subscription?.billing_interval_count && entitlements?.subscription?.billing_interval_unit ? (
                        <View style={styles.localInfoRow}>
                          <Ionicons name="calendar-outline" size={16} color={th.textSecondary} />
                          <Text style={[styles.localInfoLabel, { color: th.textSecondary }]}>
                            {t('billing.billingCycle', 'Billing Cycle')}
                          </Text>
                          <Text style={[styles.localInfoValue, { color: th.text }]}>
                            {entitlements.subscription.billing_interval_count} {entitlements.subscription.billing_interval_unit.toLowerCase()}{entitlements.subscription.billing_interval_count > 1 ? 's' : ''}
                          </Text>
                        </View>
                      ) : null}

                      {entitlements?.subscription?.auto_renew ? (
                        <View style={styles.localInfoRow}>
                          <Ionicons name="refresh-outline" size={16} color={th.textSecondary} />
                          <Text style={[styles.localInfoLabel, { color: th.textSecondary }]}>
                            {t('billing.renewal', 'Renewal')}
                          </Text>
                          <Text style={[styles.localInfoValue, { color: th.text }]}>
                            {entitlements?.subscription?.expires_at
                              ? t('billing.renewsOn', 'Renews {{date}}', { date: formatDate(entitlements.subscription.expires_at) })
                              : t('billing.autoRenew', 'Auto-renews')}
                          </Text>
                        </View>
                      ) : entitlements?.subscription?.expires_at ? (
                        <View style={styles.localInfoRow}>
                          <Ionicons name="time-outline" size={16} color={th.textSecondary} />
                          <Text style={[styles.localInfoLabel, { color: th.textSecondary }]}>
                            {t('billing.expires', 'Expires')}
                          </Text>
                          <Text style={[styles.localInfoValue, { color: th.text }]}>
                            {formatDate(entitlements.subscription.expires_at)}
                          </Text>
                        </View>
                      ) : null}

                      <Text style={[styles.localInfoNote, { color: th.textMuted }]}>
                        {t('billing.localPaymentNote', 'Paid using a local payment method.')}
                      </Text>
                    </View>
                  );
                })()}
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
                const matchingPromo = eligiblePromotions.find(
                  (p) => p.campaign_key === cp.campaign_key && p.can_redeem,
                );
                if (!matchingPromo) return null;
                if (isPremium && matchingPromo.trigger_type === 'USER_CLAIM') return null;
                const isClaiming = claimingKey === cp.campaign_key;
                const hasIncludedCredits =
                  matchingPromo.included_credits != null &&
                  matchingPromo.included_credits > 0 &&
                  (matchingPromo.benefit_type === 'FREE_PREMIUM' || matchingPromo.benefit_type === 'CREDITS');
                const creditsLabel = hasIncludedCredits
                  ? t('promotion.creditsReward', '{{count}} credits', { count: matchingPromo.included_credits as number })
                  : null;
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
                      {creditsLabel ? (
                        <Text style={styles.claimableCredits} numberOfLines={1}>
                          {creditsLabel}
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

            {(!isPremium || isFreePremium) && ((noOffers || offersError) ? (
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
                <Text style={[styles.sectionTitle, { color: th.text, marginTop: 4 }]}>
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
                            disabled={false}
                            hasActivePremium={false}
                            onSelect={() => handleSelectOffer(backendOffer.id)}
                            onPurchase={handlePurchase}
                            isPurchasing={isBusy}
                            isBestValue={bestValueId === backendOffer.id}
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
                            disabled={false}
                            hasActivePremium={false}
                            onSelect={() => handleSelectOffer(offer.id)}
                            onPurchase={handlePurchase}
                            isPurchasing={isBusy}
                            isBestValue={bestValueId === offer.id}
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
                        disabled={false}
                        hasActivePremium={false}
                        onSelect={() => handleSelectOffer(offer.id)}
                        onPurchase={handlePurchase}
                        isPurchasing={isBusy}
                        isBestValue={bestValueId === offer.id}
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


                {purchaseState === 'pending' && (
                  <View style={[styles.alreadyActiveBanner, { backgroundColor: colors.warning + '18' }]}>
                    <ActivityIndicator size="small" color={colors.warning} />
                    <Text style={[styles.alreadyActiveText, { color: th.text }]}>
                      {t('billing.purchasePending', 'Activating… this may take a moment.')}
                    </Text>
                  </View>
                )}
              </>
            ))}

            <View style={styles.legalRow}>
              <Pressable
                onPress={() => Linking.openURL('https://www.qaliye.com/en/privacy')}
                accessibilityRole="link"
              >
                <Text style={[styles.legalLink, { color: th.textSecondary }]}>
                  {t('billing.privacyPolicy', 'Privacy')}
                </Text>
              </Pressable>
              <Text style={[styles.legalDot, { color: th.textMuted }]}>•</Text>
              <Pressable
                onPress={() => Linking.openURL('https://www.qaliye.com/en/terms')}
                accessibilityRole="link"
              >
                <Text style={[styles.legalLink, { color: th.textSecondary }]}>
                  {t('billing.terms', 'Terms')}
                </Text>
              </Pressable>
              {Platform.OS !== 'web' && (
                <>
                  <Text style={[styles.legalDot, { color: th.textMuted }]}>•</Text>
                  <Pressable
                    onPress={() => restore()}
                    disabled={isRestoring}
                    accessibilityRole="button"
                  >
                    {isRestoring ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={[styles.legalLink, { color: colors.primary }]}>
                        {t('billing.restorePurchases', 'Restore')}
                      </Text>
                    )}
                  </Pressable>
                </>
              )}
            </View>

            {restoreState === 'done' && (
              <Text style={[styles.restoreDone, { color: colors.success }]}>
                {t('billing.restoreDone', 'Restore complete. Check your plan status above.')}
              </Text>
            )}

            {(entitlements?.country_settings?.credits_enabled ?? true) && (
            <Pressable
              style={[styles.crossLinkRow, { borderColor: th.border, backgroundColor: th.surface }]}
              onPress={() => router.push('/(app)/credits-shop' as any)}
              accessibilityRole="link"
              accessibilityLabel={t('billing.goToCreditsShop', 'Go to Credits Shop')}
            >
              <View style={[styles.crossLinkIconRing, { backgroundColor: `${colors.success}15` }]}>
                <Ionicons name="cash-outline" size={20} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.crossLinkTitle, { color: th.text }]}>
                  {t('billing.goToCreditsShop', 'Go to Credits Shop')}
                </Text>
                <Text style={[styles.crossLinkSubtitle, { color: th.textSecondary }]}>
                  {t('billing.goToCreditsShopBody', 'Buy credits to use for actions without premium.')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={th.textSecondary} />
            </Pressable>
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

      <PurchaseSuccessModal
        visible={purchaseState === 'confirmed'}
        onClose={() => {
          if (reset) reset();
          router.replace('/(app)/balances' as any);
        }}
        title={t('billing.purchaseConfirmedTitle', 'Premium Active!')}
        message={t('billing.purchaseConfirmedMsg', 'Your premium subscription is now active. Enjoy all the premium features!')}
        icon="checkmark-circle"
        featureName={confirmedFeatureName}
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  content: { paddingHorizontal: 16, gap: 4 },
  centered: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 14, fontWeight: '600' },
  alreadyActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 12,
  },
  alreadyActiveText: { flex: 1, fontSize: 13, fontWeight: '500' },
  activePremiumCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  activePremiumHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  activePremiumIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePremiumTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  activePremiumSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  manageSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 12,
  },
  manageSubBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  manageSubError: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  localPaymentNote: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 10,
  },
  localInfoCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
    marginTop: 10,
  },
  localInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  localInfoLabel: {
    fontSize: 13,
    flex: 1,
  },
  localInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
  localInfoNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  claimableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 2,
    padding: 12,
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
  claimableCredits: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
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
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  legalLink: {
    fontSize: 13,
    fontWeight: '500',
  },
  legalDot: {
    fontSize: 13,
  },
  crossLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  crossLinkIconRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossLinkTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  crossLinkSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
