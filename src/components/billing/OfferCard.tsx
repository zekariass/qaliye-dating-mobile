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

export function OfferCard({
  offer,
  rcPackage,
  isSelected,
  isActive = false,
  disabled = false,
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

  // Suppress all promotional pricing display when user already has active premium.
  const promotion = hasActivePremium ? null : (offer.promotion ?? null);
  const effectivePrice = hasActivePremium ? null : (offer.effective_display_price ?? null);

  // Determine the actual discounted price and the original price to strike through.
  // Only show strikethrough + badge when the discounted price differs from the original.
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
    ? (offer.auto_renew ? 'Auto-renews' : 'One-time access')
    : null;

  return (
    <Pressable
      style={[
        styles.card,
        { backgroundColor: surfaceColor, borderColor: isActive ? colors.success : (isSelected ? colors.primary : borderColor) },
        isSelected && !isActive && !disabled && styles.selectedCard,
        isActive && styles.activeCard,
        (storeUnavailable || disabled) && styles.unavailableCard,
      ]}
      onPress={storeUnavailable || isActive || disabled ? undefined : onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected || isActive, disabled: disabled || storeUnavailable }}
    >
      <View style={styles.left}>
        <Text style={[styles.productCode, { color: textColor }]} numberOfLines={1}>
          {offer.product_code.replace(/_/g, ' ')}
        </Text>
        {interval && (
          <Text style={[styles.interval, { color: secondaryColor }]}>{interval}</Text>
        )}
        {autoRenewLabel && (
          <Text style={[styles.autoRenew, { color: secondaryColor }]}>{autoRenewLabel}</Text>
        )}
      </View>

      <View style={styles.right}>
        {originalPrice && (
          <Text style={[styles.originalPrice, { color: secondaryColor }]}>
            {originalPrice}
          </Text>
        )}
        <Text style={[styles.price, { color: storeUnavailable ? secondaryColor : (isSelected ? colors.primary : textColor) }]}>
          {displayPrice}
        </Text>
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>
              {t('promotion.offer.discount', 'Promo')}
            </Text>
          </View>
        )}
        {storeUnavailable ? (
          <View style={styles.unavailableBtn}>
            <Ionicons name="storefront-outline" size={12} color={secondaryColor} />
            <Text style={[styles.unavailableText, { color: secondaryColor }]}>Store unavailable</Text>
          </View>
        ) : disabled ? (
          <View style={[styles.unavailableBtn, { borderColor: secondaryColor }]}>
            <Ionicons name="lock-closed-outline" size={12} color={secondaryColor} />
            <Text style={[styles.unavailableText, { color: secondaryColor }]}>Current plan active</Text>
          </View>
        ) : isActive ? (
          <View style={[styles.activeBtn, { borderColor: colors.success }]}>
            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
            <Text style={[styles.activeText, { color: colors.success }]}>Active</Text>
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
                <Text style={styles.buyText}>Buy</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {(isSelected || isActive) && (
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark-circle" size={20} color={isActive ? colors.success : colors.primary} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  discountBadge: {
    backgroundColor: colors.warning + '22',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  discountBadgeText: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 2,
    padding: 14,
    marginBottom: 2,
    gap: 12,
  },
  selectedCard: {
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  activeCard: {
    opacity: 0.95,
  },
  left: {
    flex: 1,
    gap: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
  productCode: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  interval: {
    fontSize: 12,
  },
  autoRenew: {
    fontSize: 11,
    opacity: 0.7,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    minWidth: 64,
    justifyContent: 'center',
  },
  buyBtnDisabled: {
    opacity: 0.6,
  },
  buyText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  activeBtn: {
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
    fontWeight: '700',
  },
  checkBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  unavailableCard: {
    opacity: 0.6,
  },
  unavailableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  unavailableText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
