import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/constants/theme';

interface FloatingHeartProps {
  startX: number;
  startY: number;
  size: number;
  delay: number;
  duration: number;
}

export function FloatingHeart({ startX, startY, size, delay, duration }: FloatingHeartProps) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(-110, { duration, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.75, { duration: duration * 0.25 }),
          withTiming(0.75, { duration: duration * 0.5 }),
          withTiming(0, { duration: duration * 0.25 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text
      style={[
        styles.heart,
        animStyle,
        { left: startX, top: startY, fontSize: size },
      ]}>
      ♥
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  heart: {
    position: 'absolute',
    color: colors.heartPink,
    textShadowColor: colors.heartRose,
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
});
