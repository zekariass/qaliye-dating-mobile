import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/constants/theme';

const DOT_PULSE_DURATION = 420;
const DOT_STAGGER = 180;

interface DotProps {
  delay: number;
}

function Dot({ delay }: DotProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.5, { duration: DOT_PULSE_DURATION }),
          withTiming(1, { duration: DOT_PULSE_DURATION }),
        ),
        -1,
        false,
      ),
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: DOT_PULSE_DURATION }),
          withTiming(0.35, { duration: DOT_PULSE_DURATION }),
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

  return <Animated.View style={[styles.dot, animStyle]} />;
}

export function PulsingDots() {
  return (
    <View style={styles.container}>
      <Dot delay={0} />
      <Dot delay={DOT_STAGGER} />
      <Dot delay={DOT_STAGGER * 2} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryLight,
  },
});
