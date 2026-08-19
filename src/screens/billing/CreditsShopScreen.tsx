import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import type { OfferDto, OfferPromotionDto, PaymentMethodDto } from '@/types/billing';

function packQuantity(productCode: string): number | null {
  const match = productCode.match(/(\d+)(?=\D*$)/);
  return match ? parseInt(match[1], 10) : null;
}

function packDisplayName(productCode: string): string {
  const qty = packQuantity(productCode);
  if (qty === null) return productCode.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  return `${qty.toLocaleString()} Credits`;
}

type PackViewModel = {
  offer: OfferDto;
  rcPackage?: PurchasesPackage;
  price: string;
  originalPrice?: string | null;
  hasDiscount: boolean;
  promotion: OfferPromotionDto | null;
  quantity: number;
};

/** Format minor currency units (e.g. cents) into a display string. */
function formatMinorUnits(amountMinor: number, currency: string): string {
  const zeroDecimal = ['JPY', 'KRW', 'VND', 'CLP', 'GNF', 'ISK', 'MGA', 'PYG', 'RWF', 'UGX', 'XAF', 'XOF', 'BIF', 'DJF', 'KMF'];
  const threeDecimal = ['KWD', 'BHD', 'OMR', 'JOD', 'TND'];
  let amount: number;
  if (zeroDecimal.includes(currency)) {
    amount = amountMinor;
  } else if (threeDecimal.includes(currency)) {
    amount = amountMinor / 1000;
  } else {
    amount = amountMinor / 100;
  }
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Returns a short urgency label like "Ends in 3h", "Ends in 2d", or "" if already expired. */
function formatEndsAtLabel(endsAt: string): string {
  const diffMs = new Date(endsAt).getTime() - Date.now();
  if (diffMs <= 0) return '';
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `Ends in ${diffHours}h`;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return `Ends in ${diffDays}d`;
  return `Ends ${new Date(endsAt).toLocaleDateString()}`;
}

function buildPackViewModel(
  offer: OfferDto,
  rcPackage: PurchasesPackage | undefined,
): PackViewModel {
  const quantity = packQuantity(offer.product_code) ?? 0;
  if (rcPackage) {
    return { offer, rcPackage, price: rcPackage.product.priceString, originalPrice: null, hasDiscount: false, promotion: null, quantity };
  }
  // The backend already enforces promotion eligibility per-user. If promotion is
  // non-null it means this user qualifies — trust the server and always show it.
  const rawPromotion = offer.promotion ?? null;
  // Discard if discountAmountMinor === 0 (no real savings despite a promotion object).
  const promotion = rawPromotion && rawPromotion.discount_amount_minor > 0 ? rawPromotion : null;
  // effective_display_price on the offer reflects the final price after any discount.
  // Use || (not ??) so an empty-string normalisation fallback is treated as absent.
  const effective = offer.effective_display_price || null;
  const discounted = (promotion?.effective_display_price || null) ?? effective ?? null;
  const base = offer.display_price;
  const hasDiscount = !!discounted && discounted !== base;
  return { offer, price: hasDiscount ? discounted : base, originalPrice: hasDiscount ? base : null, hasDiscount, promotion: hasDiscount ? promotion : null, quantity };
}

export default function CreditsShopScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { colors: th } = useTheme();

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

  const packs = useMemo<PackViewModel[]>(() => {
    if (isGlobalMarket) {
      if (reconciledOffers.length > 0) {
        return reconciledOffers.map(({ backendOffer, rcPackage }) =>
          buildPackViewModel(backendOffer, rcPackage),
        );
      }
      return localOffers
        .filter((o) => o.country_code === 'GLOBAL')
        .map((offer) => buildPackViewModel(offer, undefined));
    }
    return localOffers.map((offer) => buildPackViewModel(offer, undefined));
  }, [isGlobalMarket, reconciledOffers, localOffers]);

  const bestValueId = useMemo(() => {
    if (packs.length < 2) return null;
    const byQty = packs.filter((p) => p.quantity > 0);
    if (byQty.length === 0) return null;
    const maxQty = Math.max(...byQty.map((p) => p.quantity));
    return byQty.find((p) => p.quantity === maxQty)?.offer.id ?? null;
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

  const isLoading = loadingEntitlements || loadingOffers || (isGlobalMarket && isLoadingRc);
  const noOffers = !isLoading && packs.length === 0;

  const confirmedQuantity = creditsDelta ? `+${creditsDelta.credits.toLocaleString()}` : undefined;

  const ctaDisabled = isBusy || !selectedPack;

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

      {/* Current balance */}
      {!loadingEntitlements && entitlements && (
        <View style={[styles.balanceBar, { backgroundColor: th.surface }]}>
          <View style={[styles.balanceIconRing, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.balanceLabel, { color: th.textSecondary }]}>
            {t('billing.yourCredits', 'Your Credits')}
          </Text>
          <Text style={[styles.balanceValue, { color: colors.primary }]}>
            {entitlements.credits.credit_balance.toLocaleString()}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 116 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loaderText, { color: th.textSecondary }]}>
              {t('billing.loadingOffers', 'Loading offers…')}
            </Text>
          </View>
        ) : noOffers ? (
          <View style={[styles.stateCard, { backgroundColor: th.surface, borderColor: th.border }]}>
            <Ionicons name="storefront-outline" size={40} color={th.textSecondary} />
            <Text style={[styles.stateTitle, { color: th.text }]}>
              {t('billing.noCreditsOffers', 'No offers available')}
            </Text>
            <Text style={[styles.stateBody, { color: th.textSecondary }]}>
              {t('billing.noCreditsOffersBody', 'No credit packs are available right now.')}
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
                        borderColor: isSelected ? colors.primary : th.border,
                        shadowColor: colors.primary,
                      },
                      isSelected && styles.packCardSelected,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    {isSelected && (
                      <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      </View>
                    )}

                    <View style={[styles.packIconRing, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}25` }]}>
                      <Ionicons name="diamond" size={22} color={colors.primary} />
                    </View>

                    <View style={styles.packBody}>
                      <Text style={[styles.packName, { color: th.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                        {packDisplayName(pack.offer.product_code)}
                      </Text>
                      {isBestValue && (
                        <View style={[styles.bestValueBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.bestValueText}>{t('billing.bestValue', 'Best value')}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.packPriceCol}>
                      {pack.promotion && (
                        <View style={[styles.discountBadge, { backgroundColor: colors.success }]}>
                          <Text style={styles.discountBadgeText} numberOfLines={1}>
                            {pack.promotion.name}
                          </Text>
                        </View>
                      )}
                      {pack.originalPrice && (
                        <Text style={[styles.originalPrice, { color: th.textSecondary }]}>{pack.originalPrice}</Text>
                      )}
                      <Text style={[styles.price, { color: isSelected ? colors.primary : th.text }]}>
                        {pack.price}
                      </Text>
                      {pack.promotion?.ends_at && formatEndsAtLabel(pack.promotion.ends_at) ? (
                        <Text style={[styles.endsAtLabel, { color: th.textSecondary }]}>
                          {formatEndsAtLabel(pack.promotion.ends_at)}
                        </Text>
                      ) : null}
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
      </ScrollView>

      {!isLoading && !noOffers && (
        <View style={[styles.bottomBar, { backgroundColor: th.surface, borderColor: th.border, paddingBottom: bottom + 16 }]}>
          <View style={styles.bottomBarInner}>
            <View style={styles.bottomSummary}>
              {selectedPack ? (
                <>
                  <View style={[styles.smallIconRing, { backgroundColor: `${colors.primary}18` }]}>
                    <Ionicons name="diamond" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bottomPackName, { color: th.text }]} numberOfLines={1}>
                      {packDisplayName(selectedPack.offer.product_code)}
                    </Text>
                    <Text style={[styles.bottomPackPrice, { color: colors.primary }]}>
                      {selectedPack.price}
                    </Text>
                    {selectedPack.promotion && selectedPack.originalPrice && (
                      <Text style={[styles.bottomDiscount, { color: colors.success }]}>
                        {t('billing.discount', 'Discount')}{': \u2212'}{formatMinorUnits(selectedPack.promotion.discount_amount_minor, selectedPack.offer.currency)}
                      </Text>
                    )}
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
                { backgroundColor: ctaDisabled ? th.textMuted : colors.primary },
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
  balanceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  balanceIconRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  balanceValue: { fontSize: 20, fontWeight: '900' },
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  centered: { paddingVertical: 80, alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 14, fontWeight: '600' },
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
  packPriceCol: { alignItems: 'flex-end', gap: 2 },
  discountBadge: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 120,
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  originalPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  price: { fontSize: 20, fontWeight: '900' },
  endsAtLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
    opacity: 0.75,
  },
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
  bottomDiscount: { fontSize: 11, fontWeight: '600', marginTop: 1 },
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
