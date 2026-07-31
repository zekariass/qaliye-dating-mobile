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

import { PaymentMethodSheet } from '@/components/billing/PaymentMethodSheet';
import { PurchaseSuccessModal } from '@/components/billing/PurchaseSuccessModal';
import { themedError } from '@/components/common/ThemedAlert';
import { colors, radius } from '@/constants/theme';
import { useCreateOrder } from '@/hooks/billing/useCreateOrder';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useOffers } from '@/hooks/billing/useOffers';
import { usePaymentOptions } from '@/hooks/billing/usePaymentOptions';
import { useRevenueCatPurchase } from '@/hooks/billing/useRevenueCatPurchase';
import { useRevenueCatReconcile } from '@/hooks/billing/useRevenueCatReconcile';
import { useTheme } from '@/hooks/use-theme';
import type { PurchasesPackage } from '@/services/billing/revenueCatService';
import type { CreditsProductCategory, OfferDto, PaymentMethodDto } from '@/types/billing';
import { isActiveSubscription, isPremiumPlan } from '@/types/billing';

type Tab = CreditsProductCategory;

type CategoryMeta = {
  key: Tab;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  customIcon?: string;
  accent: string;
  light: string;
  description: string;
};

const CATEGORIES: CategoryMeta[] = [
  {
    key: 'BOOST',
    label: 'Boosts',
    icon: 'rocket',
    accent: colors.primary,
    light: colors.primaryLight,
    description: 'Get more eyes on your profile with boost credits.',
  },
  {
    key: 'SUPERLIKE',
    label: 'Super Likes',
    icon: 'star',
    accent: colors.heartPink,
    light: colors.heartRose,
    description: 'Stand out by sending Super Likes.',
  },
  {
    key: 'REWIND',
    label: 'Rewinds',
    icon: 'arrow-undo',
    customIcon: '↺',
    accent: colors.verifiedBlue,
    light: '#93C5FD',
    description: 'Go back and reconsider your last action.',
  },
];

function CategoryIcon({ cat, size, color }: { cat: CategoryMeta; size: number; color: string }) {
  if (cat.customIcon) {
    return (
      <Text
        style={{
          fontSize: size * 1.3,
          fontWeight: '700',
          color,
          lineHeight: size * 1.3,
          textAlign: 'center',
          includeFontPadding: false,
        }}
      >
        {cat.customIcon}
      </Text>
    );
  }
  return <Ionicons name={cat.icon} size={size} color={color} />;
}

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

function packQuantity(productCode: string): number | null {
  const match = productCode.match(/(\d+)(?=\D*$)/);
  return match ? parseInt(match[1], 10) : null;
}

function packDisplayName(productCode: string, category: Tab): string {
  const qty = packQuantity(productCode);
  if (qty === null) return productCode.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const base =
    category === 'BOOST' ? 'Boost'
      : category === 'SUPERLIKE' ? 'Super Like'
        : 'Rewind';
  return `${qty} ${base}${qty > 1 ? 's' : ''}`;
}

function packSubtitle(productCode: string): string {
  const qty = packQuantity(productCode);
  return qty === null ? 'Credit pack' : `${qty} credits`;
}

type PackViewModel = {
  offer: OfferDto;
  rcPackage?: PurchasesPackage;
  price: string;
  originalPrice?: string | null;
  hasDiscount: boolean;
};

function buildPackViewModel(
  offer: OfferDto,
  rcPackage: PurchasesPackage | undefined,
  hasActivePremium: boolean,
): PackViewModel {
  if (rcPackage) {
    return { offer, rcPackage, price: rcPackage.product.priceString, originalPrice: null, hasDiscount: false };
  }
  const promotion = hasActivePremium ? null : (offer.promotion ?? null);
  const effective = hasActivePremium ? null : (offer.effective_display_price ?? null);
  const discounted = promotion?.effective_display_price ?? effective ?? null;
  const base = offer.display_price;
  const hasDiscount = !!discounted && discounted !== base;
  return { offer, price: hasDiscount ? discounted : base, originalPrice: hasDiscount ? base : null, hasDiscount };
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
  const { purchase, purchaseState, isPurchasing, reset, creditsDelta } = useRevenueCatPurchase();
  const { mutate: createOrder, isPending: isCreatingOrder } = useCreateOrder();

  const isBusy = isPurchasing || isCreatingOrder || purchaseState === 'purchasing' || purchaseState === 'processing';
  const isGlobalMarket = consumableOffers.some((o) => o.country_code === 'GLOBAL');
  const activeMeta = CATEGORIES.find((c) => c.key === activeTab) ?? CATEGORIES[0];

  const categoryOffers = useMemo(() => {
    if (isGlobalMarket) {
      const rc = reconciledOffers.filter((r) => categoryMatchesOffer(r.backendOffer, activeTab));
      const fallback = localOffers.filter((o) => o.country_code === 'GLOBAL' && categoryMatchesOffer(o, activeTab));
      return { rc, local: [], fallback };
    }
    const local = localOffers.filter((o) => categoryMatchesOffer(o, activeTab));
    return { rc: [], local, fallback: [] };
  }, [isGlobalMarket, reconciledOffers, localOffers, activeTab]);

  const hasActivePremium = isPremiumPlan(entitlements?.plan) && isActiveSubscription(entitlements?.subscription);
  const isUnlimitedForTab = !loadingEntitlements && !loadingOffers && hasActivePremium && entitlements?.plan_limits?.[TAB_TO_PLAN_LIMIT_KEY[activeTab]] === null;

  const packs = useMemo<PackViewModel[]>(() => {
    if (isGlobalMarket) {
      if (categoryOffers.rc.length > 0) {
        return categoryOffers.rc.map(({ backendOffer, rcPackage }) =>
          buildPackViewModel(backendOffer, rcPackage, hasActivePremium),
        );
      }
      return categoryOffers.fallback.map((offer) => buildPackViewModel(offer, undefined, hasActivePremium));
    }
    return categoryOffers.local.map((offer) => buildPackViewModel(offer, undefined, hasActivePremium));
  }, [categoryOffers, isGlobalMarket, hasActivePremium]);

  const bestValueId = useMemo(() => {
    if (packs.length < 2) return null;
    const byQty = packs
      .map((p) => ({ id: p.offer.id, qty: packQuantity(p.offer.product_code) ?? 0 }))
      .filter((p) => p.qty > 0);
    if (byQty.length === 0) return null;
    const maxQty = Math.max(...byQty.map((p) => p.qty));
    return byQty.find((p) => p.qty === maxQty)?.id ?? null;
  }, [packs]);

  const selectedPack = useMemo(() => packs.find((p) => p.offer.id === selectedOfferId) ?? null, [packs, selectedOfferId]);

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
    if (!selectedOfferId || !selectedPack) return;
    if (isGlobalMarket) {
      if (isLoadingRc) return;
      if (selectedPack.rcPackage) {
        handleRcPurchase(selectedPack.rcPackage);
      } else {
        themedError(t('billing.purchaseFailed', 'Purchase failed'), t('billing.storeUnavailable', 'Store purchase unavailable. Please try again later.'));
      }
      return;
    }
    setShowMethodSheet(true);
  }, [selectedOfferId, selectedPack, isGlobalMarket, isLoadingRc, handleRcPurchase, t]);

  const handleMethodConfirm = useCallback((method: PaymentMethodDto) => {
    if (!selectedOfferId) return;
    setShowMethodSheet(false);
    proceedWithMethod(selectedOfferId, method);
  }, [selectedOfferId, proceedWithMethod]);

  const switchTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setSelectedOfferId(null);
  }, []);

  const isLoading = loadingEntitlements || loadingOffers || (isGlobalMarket && isLoadingRc);
  const noOffers = !isLoading && packs.length === 0;

  const confirmedFeatureName = activeMeta.label;
  const confirmedQuantity = creditsDelta
    ? activeTab === 'BOOST'
      ? `+${creditsDelta.boosts}`
      : activeTab === 'SUPERLIKE'
        ? `+${creditsDelta.superLikes}`
        : `+${creditsDelta.rewinds}`
    : undefined;

  const ctaDisabled = isBusy || !selectedPack || isUnlimitedForTab;

  return (
    <View style={[styles.screen, { backgroundColor: th.background, paddingTop: top }]}>
      <View style={styles.header}>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: th.backgroundElement }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.close', 'Close')}
        >
          <Ionicons name="close" size={22} color={th.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: th.text }]}>
          {t('billing.creditsShopTitle', 'Credits Shop')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.tabPillBar}>
        {CATEGORIES.map((cat) => {
          const active = activeTab === cat.key;
          return (
            <Pressable
              key={cat.key}
              style={[
                styles.tabPill,
                active && { backgroundColor: cat.accent },
                !active && { backgroundColor: th.surface, borderColor: th.border },
              ]}
              onPress={() => switchTab(cat.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <CategoryIcon
                cat={cat}
                size={16}
                color={active ? '#fff' : cat.accent}
              />
              <Text
                style={[
                  styles.tabPillLabel,
                  { color: active ? '#fff' : th.text },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 116 }]} // leave room for bottom CTA
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loaderText, { color: th.textSecondary }]}>
              {t('billing.loadingOffers', 'Loading offers…')}
            </Text>
          </View>
        ) : (
          <>
            {isUnlimitedForTab ? (
              <View style={[styles.stateCard, { backgroundColor: th.surface, borderColor: th.border }]}>
                <Ionicons name="infinite" size={40} color={colors.success} />
                <Text style={[styles.stateTitle, { color: th.text }]}>
                  {t('billing.unlimitedCategory', 'You have unlimited {{category}}', { category: activeMeta.label })}
                </Text>
                <Text style={[styles.stateBody, { color: th.textSecondary }]}>
                  {t('billing.unlimitedCategoryBody', 'Your current plan includes unlimited {{category}}. No need to buy more.', { category: activeMeta.label })}
                </Text>
              </View>
            ) : noOffers ? (
              <View style={[styles.stateCard, { backgroundColor: th.surface, borderColor: th.border }]}>
                <Ionicons name="storefront-outline" size={40} color={th.textSecondary} />
                <Text style={[styles.stateTitle, { color: th.text }]}>
                  {t('billing.noCreditsOffers', 'No offers available')}
                </Text>
                <Text style={[styles.stateBody, { color: th.textSecondary }]}>
                  {t('billing.noCreditsOffersBody', 'No credit packs are available for this category right now.')}
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: th.text }]}>
                  {t('billing.choosePack', 'Choose a pack')}
                </Text>

                <View style={styles.packsList}>
                  {packs.map((pack) => {
                    const isSelected = selectedOfferId === pack.offer.id;
                    const isBestValue = bestValueId === pack.offer.id;
                    return (
                      <Pressable
                        key={pack.offer.id}
                        onPress={() => setSelectedOfferId(pack.offer.id)}
                        style={[
                          styles.packCard,
                          {
                            backgroundColor: th.surface,
                            borderColor: isSelected ? activeMeta.accent : th.border,
                            shadowColor: activeMeta.accent,
                          },
                          isSelected && styles.packCardSelected,
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                      >
                        {isSelected && (
                          <View style={[styles.checkBadge, { backgroundColor: activeMeta.accent }]}>
                            <Ionicons name="checkmark" size={12} color="#fff" />
                          </View>
                        )}

                        <View style={[styles.packIconRing, { backgroundColor: `${activeMeta.accent}15`, borderColor: `${activeMeta.accent}25` }]}>
                          <CategoryIcon cat={activeMeta} size={22} color={activeMeta.accent} />
                        </View>

                        <View style={styles.packBody}>
                          <Text style={[styles.packName, { color: th.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                            {packDisplayName(pack.offer.product_code, activeTab)}
                          </Text>
                          <Text style={[styles.packSubtitle, { color: th.textSecondary }]}>
                            {packSubtitle(pack.offer.product_code)}
                          </Text>
                          {isBestValue && (
                            <View style={[styles.bestValueBadge, { backgroundColor: activeMeta.accent }]}>
                              <Text style={styles.bestValueText}>{t('billing.bestValue', 'Best value')}</Text>
                            </View>
                          )}
                          {pack.hasDiscount && !isBestValue && (
                            <View style={[styles.promoBadge, { backgroundColor: colors.warning + '22' }]}>
                              <Text style={[styles.promoBadgeText, { color: colors.warning }]}>{t('promotion.offer.discount', 'Promo')}</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.packPriceCol}>
                          {pack.originalPrice && (
                            <Text style={[styles.originalPrice, { color: th.textSecondary }]}>{pack.originalPrice}</Text>
                          )}
                          <Text style={[styles.price, { color: isSelected ? activeMeta.accent : th.text }]}>
                            {pack.price}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {purchaseState === 'processing' && (
                  <View style={[styles.processingBanner, { backgroundColor: `${colors.primary}15` }]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.processingText, { color: th.text }]}>
                      {t('billing.purchaseActivating', 'Activating your purchase…')}
                    </Text>
                  </View>
                )}

                {purchaseState === 'pending' && (
                  <View style={[styles.processingBanner, { backgroundColor: `${colors.warning}15` }]}>
                    <ActivityIndicator size="small" color={colors.warning} />
                    <Text style={[styles.processingText, { color: th.text }]}>
                      {t('billing.purchasePending', 'Activating… this may take a moment.')}
                    </Text>
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {!isLoading && !isUnlimitedForTab && !noOffers && (
        <View style={[styles.bottomBar, { backgroundColor: th.surface, borderColor: th.border, paddingBottom: bottom + 16 }]}>
          <View style={styles.bottomBarInner}>
            <View style={styles.bottomSummary}>
              {selectedPack ? (
                <>
                  <View style={[styles.smallIconRing, { backgroundColor: `${activeMeta.accent}18` }]}>
                    <CategoryIcon cat={activeMeta} size={18} color={activeMeta.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bottomPackName, { color: th.text }]} numberOfLines={1}>
                      {packDisplayName(selectedPack.offer.product_code, activeTab)}
                    </Text>
                    <Text style={[styles.bottomPackPrice, { color: activeMeta.accent }]}>
                      {selectedPack.price}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={[styles.bottomHint, { color: th.textSecondary }]}>
                  {t('billing.selectPackHint', 'Select a pack to continue')}
                </Text>
              )}
            </View>

            <Pressable
              style={[
                styles.ctaBtn,
                { backgroundColor: ctaDisabled ? th.textMuted : activeMeta.accent },
                ctaDisabled && styles.ctaBtnDisabled,
              ]}
              onPress={handlePurchase}
              disabled={ctaDisabled}
              accessibilityRole="button"
              accessibilityLabel={t('billing.purchaseCredits', 'Purchase credits')}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={18} color="#fff" />
                  <Text style={styles.ctaText}>{t('billing.buyNow', 'Buy Now')}</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}

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
          reset();
          router.replace('/(app)/balances' as any);
        }}
        title={t('billing.creditsPurchaseConfirmedTitle', 'Credits Added!')}
        message={t('billing.creditsPurchaseConfirmedMsg', 'Your credits have been added to your account. Enjoy!')}
        icon="add-circle"
        featureName={confirmedFeatureName}
        amount={confirmedQuantity}
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
    paddingVertical: 14,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  tabPillBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabPillLabel: { fontSize: 13, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  centered: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 14, fontWeight: '600' },
  heroCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  heroIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroTitle: { fontSize: 22, fontWeight: '800' },
  heroBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  packsList: { gap: 12 },
  packCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radius.md,
    borderWidth: 2,
    padding: 16,
    shadowOpacity: 0,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 0,
  },
  packCardSelected: {
    shadowOpacity: 0.18,
    elevation: 5,
  },
  checkBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packIconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  packBody: { flex: 1, gap: 4 },
  packName: { fontSize: 15, fontWeight: '800' },
  packSubtitle: { fontSize: 13 },
  bestValueBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bestValueText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  promoBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  promoBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  packPriceCol: { alignItems: 'flex-end', gap: 2 },
  originalPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  price: { fontSize: 20, fontWeight: '900' },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    padding: 14,
  },
  processingText: { flex: 1, fontSize: 14, fontWeight: '600' },
  stateCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  stateTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  stateBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  bottomBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomSummary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  smallIconRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPackName: { fontSize: 14, fontWeight: '700' },
  bottomPackPrice: { fontSize: 16, fontWeight: '900' },
  bottomHint: { fontSize: 15, fontWeight: '600' },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 999,
    minWidth: 130,
  },
  ctaBtnDisabled: { opacity: 0.5 },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
