import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { PurchasesPackage } from '@/services/billing/revenueCatService';
import type { BillingIntervalUnit, OfferDto } from '@/types/billing';

type Props = {
  offer: OfferDto;
  rcPackage?: PurchasesPackage;
  isSelected: boolean;
  isActive?: boolean;
  disabled?: boolean;
  isBestValue?: boolean;
  hasActivePremium?: boolean;
  onSelect: () => void;
  onPurchase: () => void;
  isPurchasing: boolean;
  storeUnavailable?: boolean;
  textColor: string;
  secondaryColor: string;
  surfaceColor: string;
  borderColor: string;
};

function intervalLabel(count?: number, unit?: BillingIntervalUnit): string {
  if (!count || !unit) return '';
  const u = unit.toLowerCase();
  if (count === 1) return `Every ${u}`;
  return `Every ${count} ${u}s`;
}

function planDisplayName(productCode: string): string {
  return productCode.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function OfferCard({
  offer,
  rcPackage,
  isSelected,
  isActive = false,
  disabled = false,
  isBestValue = false,
  hasActivePremium = false,
  onSelect,
  onPurchase,
  isPurchasing,
  storeUnavailable = false,
  textColor,
  secondaryColor,
  surfaceColor,
  borderColor,
}: Props) {
  const { t } = useTranslation();

  const promotion = hasActivePremium ? null : (offer.promotion ?? null);
  const effectivePrice = hasActivePremium ? null : (offer.effective_display_price ?? null);

  const discountedPrice = rcPackage
    ? null
    : promotion?.effective_display_price ?? effectivePrice ?? null;
  const basePrice = offer.display_price;

  const hasDiscount = !rcPackage && !!discountedPrice && discountedPrice !== basePrice;

  const displayPrice = rcPackage
    ? rcPackage.product.priceString
    : hasDiscount ? discountedPrice! : basePrice;
  const originalPrice = rcPackage ? null : hasDiscount ? basePrice : null;

  const interval = offer.product_type === 'SUBSCRIPTION'
    ? intervalLabel(offer.billing_interval_count, offer.billing_interval_unit)
    : null;

  const autoRenewLabel = offer.product_type === 'SUBSCRIPTION'
    ? (offer.auto_renew ? t('billing.renewsAutomatically', 'Renews automatically') : t('billing.oneTimeAccess', 'One-time access'))
    : null;

  const isLocked = storeUnavailable || disabled;

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: surfaceColor,
          borderColor: isActive ? colors.success : (isSelected ? colors.primary : borderColor),
          shadowColor: colors.primary,
        },
        isSelected && !isActive && !disabled && styles.selectedCard,
        isActive && styles.activeCard,
        isLocked && styles.lockedCard,
      ]}
      onPress={isLocked ? undefined : onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected || isActive, disabled: disabled || storeUnavailable }}
    >
      {(isSelected || isActive) && (
        <View style={[
          styles.checkBadge,
          { backgroundColor: isActive ? colors.success : colors.primary },
        ]}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      )}

      <View style={[styles.iconRing, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}25` }]}>
        <Ionicons name="diamond" size={22} color={colors.primary} />
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {planDisplayName(offer.product_code)}
        </Text>
        {interval && (
          <Text style={[styles.interval, { color: secondaryColor }]}>{interval}</Text>
        )}
        {autoRenewLabel && (
          <Text style={[styles.renew, { color: secondaryColor }]}>{autoRenewLabel}</Text>
        )}
        {offer.product_type === 'SUBSCRIPTION' && (offer.included_credits ?? 0) > 0 && (
          <View style={[styles.creditsBadge, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="star" size={11} color={colors.primary} />
            <Text style={[styles.creditsBadgeText, { color: colors.primary }]}>
              {t('billing.includedCredits', 'Includes {{count}} credits', { count: offer.included_credits })}
            </Text>
          </View>
        )}
        {isBestValue && !isActive && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{t('billing.bestValue', 'Best value')}</Text>
          </View>
        )}
        {hasDiscount && !isBestValue && !isActive && (
          <View style={[styles.promoBadge, { backgroundColor: colors.warning + '22' }]}>
            <Text style={[styles.promoBadgeText, { color: colors.warning }]}>{t('promotion.offer.discount', 'Promo')}</Text>
          </View>
        )}
      </View>

      <View style={styles.priceCol}>
        {originalPrice && (
          <Text style={[styles.originalPrice, { color: secondaryColor }]}>{originalPrice}</Text>
        )}
        <Text style={[styles.price, { color: storeUnavailable ? secondaryColor : (isSelected ? colors.primary : textColor) }]}>
          {displayPrice}
        </Text>

        {storeUnavailable ? (
          <View style={[styles.lockedPill, { borderColor: secondaryColor }]}>
            <Ionicons name="storefront-outline" size={12} color={secondaryColor} />
            <Text style={[styles.lockedText, { color: secondaryColor }]}>{t('billing.storeUnavailable', 'Store unavailable')}</Text>
          </View>
        ) : disabled ? (
          <View style={[styles.lockedPill, { borderColor: secondaryColor }]}>
            <Ionicons name="lock-closed-outline" size={12} color={secondaryColor} />
            <Text style={[styles.lockedText, { color: secondaryColor }]}>{t('billing.currentPlanActive', 'Current plan active')}</Text>
          </View>
        ) : isActive ? (
          <View style={[styles.activePill, { borderColor: colors.success }]}>
            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
            <Text style={[styles.activeText, { color: colors.success }]}>{t('billing.active', 'Active')}</Text>
          </View>
        ) : isSelected && (
          <Pressable
            style={[styles.buyBtn, isPurchasing && styles.buyBtnDisabled]}
            onPress={onPurchase}
            disabled={isPurchasing}
            accessibilityRole="button"
            accessibilityLabel={`Purchase ${offer.product_code}`}
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="card-outline" size={14} color="#fff" />
                <Text style={styles.buyText}>{t('billing.buyNow', 'Buy Now')}</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    shadowOpacity: 0,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 0,
  },
  selectedCard: {
    shadowOpacity: 0.18,
    elevation: 5,
  },
  activeCard: {
    opacity: 0.95,
  },
  lockedCard: {
    opacity: 0.6,
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
  iconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  body: { flex: 1, gap: 4 },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  interval: {
    fontSize: 13,
  },
  renew: {
    fontSize: 12,
    opacity: 0.7,
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },
  creditsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  promoBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
  },
  promoBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  priceCol: { alignItems: 'flex-end', gap: 6 },
  originalPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  price: {
    fontSize: 20,
    fontWeight: '900',
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    minWidth: 72,
    justifyContent: 'center',
  },
  buyBtnDisabled: {
    opacity: 0.6,
  },
  buyText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  lockedText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
