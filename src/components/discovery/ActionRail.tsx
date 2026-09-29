import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    Extrapolation,
    interpolate,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import LikeVariantButtons, { FALLBACK_VARIANT, VariantIcon } from '@/components/discovery/LikeVariantButtons';
import { colors } from '@/constants/theme';
import type { LikeActionVariantDto } from '@/types/discovery';
import { LOW_REMAINING_THRESHOLD, likeVariantResetHint } from '@/utils/likeVariants';
import { rs, useTabletScale } from '@/utils/responsive';

const DESC_GAP = 10;
const ROW_H = 44;
const HINT_H = 26;

interface Props {
  variants: LikeActionVariantDto[];
  onSelect: (code: string) => void;
  disabled?: boolean;
}

/**
 * Right-edge action rail — icon column + an animated "drag left" hint.
 * Dragging the pill left reveals a matching panel describing each action.
 */
export default function ActionRail({ variants, onSelect, disabled }: Props) {
  const { t } = useTranslation();
  const scale = useTabletScale();
  const reduceMotion = useReducedMotion();
  const descW = rs(170, scale);
  const openX = -(descW + DESC_GAP);

  const tx = useSharedValue(0);
  const startX = useSharedValue(0);
  const hintX = useSharedValue(0);
  // React-side mirror of tx's open state — drives the tap-outside backdrop.
  const [isOpen, setIsOpen] = useState(false);

  const list = variants.length > 0 ? variants : [FALLBACK_VARIANT];

  // Hint chevron — gentle looping nudge to the left (skipped for reduced motion)
  useEffect(() => {
    if (reduceMotion) return;
    hintX.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    return () => {
      hintX.value = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const snapTo = (open: boolean) => {
    tx.value = withSpring(open ? openX : 0, { damping: 20, stiffness: 220 });
    setIsOpen(open);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-12, 12])
    .onStart(() => {
      startX.value = tx.value;
    })
    .onUpdate((e) => {
      tx.value = Math.min(0, Math.max(openX, startX.value + e.translationX));
    })
    .onEnd((e) => {
      const open = tx.value < openX / 2 || e.velocityX < -400;
      tx.value = withSpring(open ? openX : 0, { damping: 20, stiffness: 220 });
      scheduleOnRN(setIsOpen, open);
    });

  const toggle = () => snapTo(tx.value >= openX / 2);

  const handleSelect = (code: string) => {
    snapTo(false);
    onSelect(code);
  };

  const buttonsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  const descStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
    opacity: interpolate(tx.value, [openX, openX * 0.5], [1, 0], Extrapolation.CLAMP),
  }));

  const hintRowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [openX, openX * 0.5], [0, 1], Extrapolation.CLAMP),
  }));

  const hintChevronStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: hintX.value }],
  }));

  const closeChevronStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -hintX.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.wrap}>
        {/* ── Tap-outside backdrop — covers the viewport while the panel is
               open; tapping anywhere off the rail closes it. Rendered first
               so the pill/panel above it still receive their own touches. ── */}
        {isOpen && (
          <Pressable
            style={styles.backdrop}
            onPress={() => snapTo(false)}
            accessibilityRole="button"
            accessibilityLabel={t('discovery.closeActionDescriptions')}
          />
        )}

        {/* ── Buttons pill ── */}
        <Animated.View style={[styles.pill, buttonsStyle]}>
          {/* Drag hint — also tappable for accessibility */}
          <Pressable
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={t('discovery.toggleActionDescriptions')}
            accessibilityHint={t('discovery.toggleActionDescriptionsHint')}
            hitSlop={6}
          >
            <Animated.View style={[styles.hintRow, { height: rs(HINT_H, scale) }, hintRowStyle]}>
              <Animated.View style={hintChevronStyle}>
                <Ionicons name="chevron-back" size={rs(15, scale)} color="rgba(255,255,255,0.9)" />
              </Animated.View>
              <Text style={[styles.hintText, { fontSize: rs(11, scale) }]}>{t('discovery.drag')}</Text>
            </Animated.View>
          </Pressable>

          <LikeVariantButtons variants={list} onSelect={handleSelect} disabled={disabled} />
        </Animated.View>

        {/* ── Descriptions panel — slides in at the card's right edge ── */}
        <Animated.View
          style={[styles.pill, styles.descPanel, { left: '100%', marginLeft: DESC_GAP, width: descW }, descStyle]}
        >
          {/* Close hint — mirrored chevron animates rightward */}
          <View style={[styles.closeHintRow, { height: rs(HINT_H, scale), marginBottom: 14 }]}>
            <Text style={[styles.hintText, { fontSize: rs(11, scale) }]}>{t('discovery.dragRight')}</Text>
            <Animated.View style={closeChevronStyle}>
              <Ionicons name="chevron-forward" size={rs(15, scale)} color="rgba(255,255,255,0.9)" />
            </Animated.View>
          </View>

          {list.map((variant) => (
            <View key={variant.code} style={[styles.descRow, { height: rs(ROW_H, scale), marginBottom: 12 }]}>
              <VariantIcon variant={variant} size={rs(24, scale)} />
              <View style={styles.descTextCol}>
                <Text style={[styles.descName, { fontSize: rs(12, scale) }]} numberOfLines={1}>
                  {variant.name}
                  {variant.credits > 0 ? (
                    <Text style={[styles.descCost, { fontSize: rs(11, scale) }]}>{` · ${t('discovery.creditCount', { count: variant.credits })}`}</Text>
                  ) : null}
                  {variant.blocked ? (
                    <Text style={[styles.descLimit, { fontSize: rs(11, scale) }]}>{` · ${likeVariantResetHint(variant)}`}</Text>
                  ) : variant.remaining != null && variant.remaining <= LOW_REMAINING_THRESHOLD ? (
                    <Text style={[styles.descLimit, { fontSize: rs(11, scale) }]}>{` · ${t('discovery.remainingLeft', { count: variant.remaining })}`}</Text>
                  ) : null}
                </Text>
                {variant.description ? (
                  <Text style={[styles.descText, { fontSize: rs(10.5, scale) }]} numberOfLines={2}>
                    {variant.description}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  // Invisible tap-catcher spanning the viewport. Oversized insets are clipped
  // by the surrounding ScrollView, so it effectively covers the whole screen.
  // Rendered first inside the wrap, so it stays beneath the pill/panel.
  backdrop: {
    position: 'absolute',
    top:    -2000,
    bottom: -2000,
    left:   -2000,
    right:  -2000,
  },
  pill: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
    gap: 14,
    alignItems: 'center',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 2,
  },
  hintText: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  descPanel: {
    position: 'absolute',
    top: 0,
    alignItems: 'stretch',
    gap: 0,
  },
  descRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  descTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  descName: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  descCost: {
    color: colors.warning,
    fontWeight: '700',
  },
  descLimit: {
    color: colors.secondaryLight,
    fontWeight: '700',
  },
  descText: {
    color: 'rgba(255,255,255,0.8)',
  },
  closeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});
