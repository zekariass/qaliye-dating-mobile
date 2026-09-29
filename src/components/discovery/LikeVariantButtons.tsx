import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { DEFAULT_LIKE_VARIANT_CODE } from '@/api/discovery/discoveryApi';
import { themedAlert } from '@/components/common/ThemedAlert';
import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import i18n from '@/i18n';
import type { LikeActionVariantDto } from '@/types/discovery';
import {
    likeVariantResetHint,
    showLikeVariantRemaining
} from '@/utils/likeVariants';
import { rs, useTabletScale } from '@/utils/responsive';

const BTN = 44;

// Fallback used before the backend list has loaded, or if it comes back empty —
// keeps the LIKE gesture usable at all times.
export const FALLBACK_VARIANT: LikeActionVariantDto = {
  code: DEFAULT_LIKE_VARIANT_CODE,
  name: i18n.t('discovery.like'),
  description: i18n.t('discovery.sendALike'),
  icon: null,
  credits: 0,
  sort_order: 0,
  is_default: true,
};

interface Props {
  variants: LikeActionVariantDto[];
  onSelect: (code: string) => void;
  disabled?: boolean;
  /** Row layout — used by browse mode, where the rail sits under the photo. */
  horizontal?: boolean;
}

export default function LikeVariantButtons({ variants, onSelect, disabled, horizontal }: Props) {
  const scale = useTabletScale();
  const btnSize = rs(BTN, scale);
  const btnStyle = { width: btnSize, height: btnSize, borderRadius: btnSize / 2 };
  const list = variants.length > 0 ? variants : [FALLBACK_VARIANT];

  return (
    <View style={[styles.container, horizontal && styles.containerHorizontal]}>
      {list.map((variant) => (
        <VariantButton
          key={variant.code}
          variant={variant}
          isPrimary={variant.is_default === true}
          size={btnStyle}
          iconSize={rs(28, scale)}
          disabled={disabled}
          horizontal={horizontal}
          onPress={() => onSelect(variant.code)}
        />
      ))}
    </View>
  );
}

/**
 * Variant glyph — remote icon with a heart fallback. Shared by the action
 * buttons and the description rows in ActionRail.
 */
export function VariantIcon({
  variant,
  size,
  color = colors.heartPink,
}: {
  variant: LikeActionVariantDto;
  size: number;
  color?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showPlaceholder = !variant.icon || imageFailed;

  return showPlaceholder ? (
    <Ionicons name="heart" size={size} color={color} />
  ) : (
    <Image
      source={{ uri: variant.icon! }}
      style={{ width: size, height: size }}
      contentFit="contain"
      onError={() => setImageFailed(true)}
    />
  );
}

function VariantButton({
  variant,
  isPrimary,
  size,
  iconSize,
  disabled,
  horizontal,
  onPress,
}: {
  variant: LikeActionVariantDto;
  isPrimary: boolean;
  size: { width: number; height: number; borderRadius: number };
  iconSize: number;
  disabled?: boolean;
  /** Row layout sits on the card/sheet surface — theme it instead of the
   *  dark overlay used by the vertical rail over photos. */
  horizontal?: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const blocked = variant.blocked === true;
  const showRemaining = showLikeVariantRemaining(variant);

  const gradientColors: [string, string] = horizontal
    ? isDark
      ? [th.backgroundElement, th.backgroundSelected]
      : [th.surface, '#F3EEFF']
    : ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.7)'];

  const handlePress = () => {
    if (blocked) {
      // Limit exhausted and credits can't cover it — explain instead of firing.
      themedAlert({
        title: t('discovery.variantLimitReached', { name: variant.name || t('discovery.like') }),
        message: likeVariantResetHint(variant),
        icon: 'lock-closed-outline',
        iconColor: colors.warning,
      });
      return;
    }
    onPress();
  };

  return (
    <View style={size}>
      <TouchableOpacity
        style={[
          styles.button,
          size,
          isPrimary ? styles.buttonSecondary : styles.buttonSecondary,
          horizontal && { borderColor: th.border },
          blocked && styles.buttonBlocked,
        ]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.75}
        accessibilityLabel={
          blocked
            ? t('discovery.variantLimitReached', { name: variant.name || t('discovery.like') })
            : variant.name ? t('discovery.sendVariant', { name: variant.name }) : t('discovery.sendLike')
        }
        accessibilityState={{ disabled: disabled || blocked }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <VariantIcon variant={variant} size={iconSize} color={blocked ? colors.textMuted : colors.heartPink} />
      </TouchableOpacity>

      {/* Badges sit outside the clipped button so they aren't cut off */}
      {blocked && (
        <View style={[styles.badge, styles.badgeBlocked]}>
          <Ionicons name="lock-closed" size={9} color="#fff" />
        </View>
      )}
      {showRemaining && (
        <View style={[styles.badge, styles.badgeRemaining]}>
          <Text style={styles.badgeText}>{t('discovery.remainingLeft', { count: variant.remaining })}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    alignItems: 'center',
  },
  containerHorizontal: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly',
  },
  button: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },
  buttonPrimary: {
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  buttonSecondary: {
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  buttonBlocked: {
    opacity: 0.45,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  badgeBlocked: {
    backgroundColor: '#6B7280',
  },
  badgeRemaining: {
    backgroundColor: colors.warning,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
});
