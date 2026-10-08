import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { EligiblePromotionDto } from '@/types/billing';

type Props = {
  visible: boolean;
  promotions: EligiblePromotionDto[];
  onSelect: (promotion: EligiblePromotionDto) => void;
  onClose: () => void;
};

export function PromoListSheet({ visible, promotions, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const { bottom } = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: th.surface, paddingBottom: bottom + 20 },
          ]}
          onPress={() => {}}
        >
          <View style={styles.pill} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: th.text }]}>
              {t('promotion.listTitle', 'Your promotions')}
            </Text>
            <Pressable
              style={[styles.closeBtn, { backgroundColor: th.backgroundElement }]}
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('common.close', 'Close')}
            >
              <Ionicons name="close" size={16} color={th.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            style={styles.list}
          >
            {promotions.map((promo) => {
              const isPurchase = promo.trigger_type === 'PURCHASE';
              const isCredits = promo.benefit_type === 'CREDITS';
              const iconName = isPurchase
                ? 'pricetag-outline'
                : isCredits
                  ? 'cash-outline'
                  : 'diamond-outline';
              const iconColor = isPurchase
                ? colors.warning
                : isCredits
                  ? colors.success
                  : colors.primary;
              const hasIncludedCredits =
                promo.included_credits != null &&
                promo.included_credits > 0 &&
                (promo.benefit_type === 'FREE_PREMIUM' || isCredits);
              const creditsText = hasIncludedCredits
                ? t('promotion.creditsReward', '{{count}} credits', {
                    count: promo.included_credits as number,
                  })
                : null;
              const metaText =
                [promo.description, creditsText].filter(Boolean).join(' · ') ||
                null;

              return (
                <Pressable
                  key={promo.campaign_key}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: mode === 'dark'
                        ? 'rgba(255,255,255,0.06)'
                        : th.backgroundElement,
                      borderColor: th.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => onSelect(promo)}
                  accessibilityRole="button"
                  accessibilityLabel={promo.name}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: iconColor + '20' },
                    ]}
                  >
                    <Ionicons name={iconName as any} size={20} color={iconColor} />
                  </View>

                  <View style={styles.rowText}>
                    <Text
                      style={[styles.rowTitle, { color: th.text }]}
                      numberOfLines={1}
                    >
                      {promo.name}
                    </Text>
                    {metaText ? (
                      <Text
                        style={[styles.rowMeta, { color: th.textSecondary }]}
                        numberOfLines={2}
                      >
                        {metaText}
                      </Text>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.rowCta,
                      { backgroundColor: iconColor + '14' },
                    ]}
                  >
                    <Text
                      style={[styles.rowCtaText, { color: iconColor }]}
                      numberOfLines={1}
                    >
                      {promo.can_redeem
                        ? t('promotion.claimNow', 'Claim now')
                        : t('promotion.viewOffer', 'View offer')}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={13}
                      color={iconColor}
                    />
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 20,
    maxHeight: '70%',
  },
  pill: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#8A2CFF',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  rowCta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  rowCtaText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
