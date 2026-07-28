import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DimensionValue,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import { gradients } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { EligiblePromotionDto } from '@/types/billing';

export const BANNER_H = 58;

type Props = {
  promotions: EligiblePromotionDto[];
  currentIndex: number;
  onDismiss: () => void;
  onTap: (promotion: EligiblePromotionDto) => void;
  onSwipeToIndex: (index: number) => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
};

export function PromotionBanner({
  promotions,
  currentIndex,
  onDismiss,
  onTap,
  onSwipeToIndex,
  onInteractionStart,
  onInteractionEnd,
}: Props) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const { width: screenWidth } = useWindowDimensions();

  const translateX = useSharedValue(0);
  const baseTranslateX = useSharedValue(0);
  const currentIndexSV = useSharedValue(0);

  useEffect(() => {
    currentIndexSV.value = currentIndex;
    baseTranslateX.value = -currentIndex * screenWidth;
    translateX.value = withTiming(-currentIndex * screenWidth, {
      duration: 400,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
    });
  }, [currentIndex, screenWidth, translateX]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-15, 15])
        .onBegin(() => {
          'worklet';
          baseTranslateX.value = translateX.value;
          runOnJS(onInteractionStart)();
        })
        .onUpdate((e) => {
          'worklet';
          translateX.value = baseTranslateX.value + e.translationX;
        })
        .onEnd((e) => {
          'worklet';
          const threshold = screenWidth * 0.25;
          const velocityThreshold = 500;
          let newIndex = currentIndexSV.value;

          if (
            (e.translationX < -threshold || e.velocityX < -velocityThreshold) &&
            currentIndexSV.value < promotions.length - 1
          ) {
            newIndex = currentIndexSV.value + 1;
          } else if (
            (e.translationX > threshold || e.velocityX > velocityThreshold) &&
            currentIndexSV.value > 0
          ) {
            newIndex = currentIndexSV.value - 1;
          }

          translateX.value = withTiming(-newIndex * screenWidth, {
            duration: 300,
            easing: Easing.bezier(0.25, 1, 0.5, 1),
          });
          baseTranslateX.value = -newIndex * screenWidth;

          runOnJS(onInteractionEnd)();
          if (newIndex !== currentIndexSV.value) {
            runOnJS(onSwipeToIndex)(newIndex);
          }
        }),
    [screenWidth, promotions.length, onInteractionStart, onInteractionEnd, onSwipeToIndex],
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .onEnd(() => {
          const promo = promotions[currentIndex];
          if (promo) onTap(promo);
        }),
    [promotions, currentIndex, onTap],
  );

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (promotions.length === 0) return null;

  const slideWidth: DimensionValue = screenWidth;

  return (
    <LinearGradient
      colors={isDark ? ['#5B18D6', '#3B0FA0'] : gradients.romantic}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <GestureDetector gesture={Gesture.Race(panGesture, tapGesture)}>
        <View style={styles.touchable}>
        <Animated.View
          style={[styles.track, trackStyle, { width: screenWidth * promotions.length }]}
        >
          {promotions.map((promo) => {
            const isPurchase = promo.trigger_type === 'PURCHASE';
            const iconName = isPurchase
              ? 'pricetag-outline'
              : 'diamond-outline';

            return (
              <View key={promo.campaign_key} style={[styles.slide, { width: slideWidth }]}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: 'rgba(255,255,255,0.25)' },
                  ]}
                >
                  <Ionicons name={iconName as any} size={18} color="#FFFFFF" />
                </View>

                <View style={styles.textWrap}>
                  <Text
                    style={styles.title}
                    numberOfLines={1}
                  >
                    {promo.name}
                  </Text>
                  {promo.description ? (
                    <Text
                      style={styles.subtitle}
                      numberOfLines={1}
                    >
                      {promo.description}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.ctaWrap}>
                  <Text
                    style={styles.ctaText}
                    numberOfLines={1}
                  >
                    {promo.benefit_type === 'FREE_PREMIUM'
                      ? t('promotion.claimNow', 'Claim')
                      : t('promotion.viewOffer', 'View offer')}
                  </Text>
                  <Ionicons
                    name={promo.benefit_type === 'FREE_PREMIUM' ? 'gift-outline' : 'chevron-forward'}
                    size={14}
                    color="#FFFFFF"
                  />
                </View>
              </View>
            );
          })}
        </Animated.View>
        </View>
      </GestureDetector>

      {/* Close button — positioned above the tappable area */}
      <TouchableOpacity
        style={[
          styles.closeBtn,
          { backgroundColor: 'rgba(255,255,255,0.25)' },
        ]}
        onPress={onDismiss}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('common.close', 'Close')}
      >
        <Ionicons name="close" size={16} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Page indicators for multiple promotions */}
      {promotions.length > 1 && (
        <View style={styles.indicators}>
          {promotions.map((p, i) => (
            <View
              key={p.campaign_key}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === currentIndex ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                },
              ]}
            />
          ))}
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    height: BANNER_H,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  touchable: {
    flex: 1,
    height: '100%',
    overflow: 'hidden',
  },
  track: {
    flexDirection: 'row',
    height: '100%',
  },
  slide: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
    gap: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.85)',
  },
  ctaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    flexShrink: 0,
    paddingRight: 36,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  indicators: {
    position: 'absolute',
    bottom: 5,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
