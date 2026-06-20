import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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

const RING_SIZE = 220;
const RING_START_SCALE = 0.32;
const WAVE_COUNT = 4;
const WAVE_DURATION = 2500;
const STAGGER = WAVE_DURATION / WAVE_COUNT;

function Wave({ delay }: { delay: number }) {
  const scale = useSharedValue(RING_START_SCALE);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: WAVE_DURATION, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      ),
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 200, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: WAVE_DURATION - 200, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.ring, animStyle]} />;
}

export function WaveRipple() {
  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: WAVE_COUNT }).map((_, i) => (
        <Wave key={i} delay={i * STAGGER} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2.5,
    borderColor: colors.heartPink,
  },
});
