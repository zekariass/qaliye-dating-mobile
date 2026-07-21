import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
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
import { themedError } from '@/components/common/ThemedAlert';
import { colors } from '@/constants/theme';
import { useCreateOrder } from '@/hooks/billing/useCreateOrder';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useOffers } from '@/hooks/billing/useOffers';
import { usePaymentOptions } from '@/hooks/billing/usePaymentOptions';
import { useRevenueCatPurchase } from '@/hooks/billing/useRevenueCatPurchase';
import { useRevenueCatReconcile } from '@/hooks/billing/useRevenueCatReconcile';
import { useTheme } from '@/hooks/use-theme';
import type { PurchasesPackage } from '@/services/billing/revenueCatService';
import type { CreditsProductCategory, PaymentMethodDto } from '@/types/billing';
import { isActiveSubscription, isPremiumPlan } from '@/types/billing';

type Tab = CreditsProductCategory;

const TABS: { key: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'BOOST', label: 'Boosts', icon: 'rocket' },
  { key: 'SUPERLIKE', label: 'Super Likes', icon: 'star' },
  { key: 'REWIND', label: 'Rewinds', icon: 'arrow-undo' },
];

const TAB_TO_PLAN_LIMIT_KEY: Record<Tab, keyof import('@/types/billing').PlanLimits> = {
  BOOST: 'BOOSTS',
  SUPERLIKE: 'SUPERLIKES',
  REWIND: 'REWINDS',
};

function categoryMatchesOffer(offer: import('@/types/billing').OfferDto, category: Tab): boolean {
  const code = offer.product_code.toUpperCase();
  if (category === 'BOOST') return code.includes('BOOST');
  if (category === 'SUPERLIKE') return code.includes('SUPER') || code.includes('SUPERLIKE');
  if (category === 'REWIND') return code.includes('REWIND');
  return false;
}

export default function CreditsShopScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { colors: th } = useTheme();
  const params = useLocalSearchParams<{ focus?: string }>();
  const initialTab = (params.focus as Tab | undefined) ?? 'BOOST';

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [showMethodSheet, setShowMethodSheet] = useState(false);

  const { entitlements, isLoading: loadingEntitlements } = useEntitlements();
  const { consumableOffers, isLoading: loadingOffers } = useOffers('CONSUMABLE');
  const { paymentMethods } = usePaymentOptions();
  const { reconciledOffers, localOffers, isLoadingRc, hasRcPaymentMethod } = useRevenueCatReconcile(consumableOffers, paymentMethods);
  const { purchase, purchaseState, isPurchasing } = useRevenueCatPurchase();
  const { mutate: createOrder, isPending: isCreatingOrder } = useCreateOrder();

  const isBusy = isPurchasing || isCreatingOrder || purchaseState === 'purchasing' || purchaseState === 'processing';

  const isGlobalMarket = consumableOffers.some((o) => o.country_code === 'GLOBAL');

  const tabOffers = useMemo(() => {
    if (isGlobalMarket) {
      const rcForTab = reconciledOffers.filter((r) => categoryMatchesOffer(r.backendOffer, activeTab));
      return { rcForTab, localForTab: [] };
    }
    const localForTab = localOffers.filter((o) => categoryMatchesOffer(o, activeTab));
    return { rcForTab: [], localForTab };
  }, [isGlobalMarket, reconciledOffers, localOffers, activeTab]);

  const handleRcPurchase = useCallback((pkg: PurchasesPackage) => {
    purchase({ pkg, productType: 'CONSUMABLE' }, {
      onError: (e) => themedError(t('billing.purchaseFailed', 'Purchase failed'), e.message),
    });
  }, [purchase, t]);

  const proceedWithMethod = useCallback((offerId: string, method: PaymentMethodDto) => {
    const isRc = method.payment_channel === 'REVENUECAT_APPLE' || method.payment_channel === 'REVENUECAT_GOOGLE';
    if (isRc) {
      const rc = reconciledOffers.find((r) => r.backendOffer.id === offerId);
      if (rc) { handleRcPurchase(rc.rcPackage); return; }
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

  const globalFallbackForTab = useMemo(
    () => localOffers.filter((o) => o.country_code === 'GLOBAL' && categoryMatchesOffer(o, activeTab)),
    [localOffers, activeTab],
  );

  const isLoading = loadingEntitlements || loadingOffers || (isGlobalMarket && isLoadingRc);
  const noOffers = !isLoading && (
    isGlobalMarket
      ? tabOffers.rcForTab.length === 0 && globalFallbackForTab.length === 0
      : tabOffers.localForTab.length === 0
  );
  const hasActivePremium = isPremiumPlan(entitlements?.plan) && isActiveSubscription(entitlements?.subscription);
  const isUnlimitedForTab = !isLoading && hasActivePremium && entitlements?.plan_limits?.[TAB_TO_PLAN_LIMIT_KEY[activeTab]] === null;

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
          {t('billing.creditsShopTitle', 'Credits Shop')}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.tabBar, { borderBottomColor: th.border }]}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => { setActiveTab(tab.key); setSelectedOfferId(null); }}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.key }}
          >
            <Ionicons
              name={tab.icon}
              size={15}
              color={activeTab === tab.key ? colors.primary : th.textSecondary}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === tab.key ? colors.primary : th.textSecondary },
                activeTab === tab.key && styles.activeTabLabel,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
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

            {purchaseState === 'confirmed' && (
              <View style={[styles.successBanner, { backgroundColor: colors.success + '18' }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={[styles.successText, { color: th.text }]}>
                  {t('billing.creditsPurchaseConfirmed', 'Credits added to your account!')}
                </Text>
              </View>
            )}

            {isUnlimitedForTab ? (
              <View style={[styles.unavailableCard, { backgroundColor: th.surface, borderColor: th.border }]}>
                <Ionicons name="infinite" size={32} color={colors.success} />
                <Text style={[styles.unavailableTitle, { color: th.text }]}>
                  {t('billing.unlimitedCategory', 'You have unlimited {{category}}', { category: TABS.find((t) => t.key === activeTab)?.label ?? '' })}
                </Text>
                <Text style={[styles.unavailableBody, { color: th.textSecondary }]}>
                  {t('billing.unlimitedCategoryBody', 'Your current plan includes unlimited {{category}}. No need to buy more.', { category: TABS.find((t) => t.key === activeTab)?.label ?? '' })}
                </Text>
              </View>
            ) : noOffers ? (
              <View style={[styles.unavailableCard, { backgroundColor: th.surface, borderColor: th.border }]}>
                <Ionicons name="storefront-outline" size={32} color={th.textSecondary} />
                <Text style={[styles.unavailableTitle, { color: th.text }]}>
                  {t('billing.noCreditsOffers', 'No offers available')}
                </Text>
                <Text style={[styles.unavailableBody, { color: th.textSecondary }]}>
                  {t('billing.noCreditsOffersBody', 'No credit packs are available for this category right now.')}
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: th.text }]}>
                  {TABS.find((t) => t.key === activeTab)?.label}
                </Text>

                {isGlobalMarket
                  ? (
                    tabOffers.rcForTab.length > 0
                      ? tabOffers.rcForTab.map(({ backendOffer, rcPackage }) => (
                          <OfferCard
                            key={backendOffer.id}
                            offer={backendOffer}
                            rcPackage={rcPackage}
                            isSelected={selectedOfferId === backendOffer.id}
                            hasActivePremium={hasActivePremium}
                            onSelect={() => setSelectedOfferId(backendOffer.id)}
                            onPurchase={handlePurchase}
                            isPurchasing={isBusy}
                            storeUnavailable={isLoadingRc}
                            textColor={th.text}
                            secondaryColor={th.textSecondary}
                            surfaceColor={th.surface}
                            borderColor={th.border}
                          />
                        ))
                      : globalFallbackForTab.map((offer) => (
                          <OfferCard
                            key={offer.id}
                            offer={offer}
                            isSelected={selectedOfferId === offer.id}
                            hasActivePremium={hasActivePremium}
                            onSelect={() => setSelectedOfferId(offer.id)}
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
                  : tabOffers.localForTab.map((offer) => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        isSelected={selectedOfferId === offer.id}
                        hasActivePremium={hasActivePremium}
                        onSelect={() => setSelectedOfferId(offer.id)}
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
                  <View style={[styles.successBanner, { backgroundColor: colors.primary + '15' }]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.successText, { color: th.text }]}>
                      {t('billing.purchaseActivating', 'Activating your purchase…')}
                    </Text>
                  </View>
                )}

                {purchaseState === 'pending' && (
                  <View style={[styles.successBanner, { backgroundColor: colors.warning + '15' }]}>
                    <ActivityIndicator size="small" color={colors.warning} />
                    <Text style={[styles.successText, { color: th.text }]}>
                      {t('billing.purchasePending', 'Activating… this may take a moment.')}
                    </Text>
                  </View>
                )}

              </>
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: colors.primary },
  tabLabel: { fontSize: 13, fontWeight: '500' },
  activeTabLabel: { fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  centered: { paddingVertical: 60, alignItems: 'center' },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 12,
  },
  successText: { flex: 1, fontSize: 13, fontWeight: '500' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  unavailableCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  unavailableTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  unavailableBody: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
