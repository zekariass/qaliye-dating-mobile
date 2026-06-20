import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, ImageBackground, StatusBar, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { FloatingHeart } from '@/components/animations/FloatingHeart';
import { PulsingDots } from '@/components/animations/PulsingDots';
import { WaveRipple } from '@/components/animations/WaveRipple';
import { useBootstrapApp } from '@/hooks/auth/useBootstrapApp';

const { width: W, height: H } = Dimensions.get('window');

// Minimum time the splash is visible regardless of how fast the session check resolves
const MIN_SPLASH_MS = 2500;

const HEARTS = [
  { startX: W * 0.06, startY: H * 0.32, size: 14, delay: 200, duration: 3200 },
  { startX: W * 0.78, startY: H * 0.22, size: 10, delay: 900, duration: 3600 },
  { startX: W * 0.62, startY: H * 0.56, size: 13, delay: 450, duration: 2900 },
  { startX: W * 0.14, startY: H * 0.60, size: 9, delay: 1300, duration: 3400 },
];

export default function SplashScreen() {
  const router = useRouter();
  const { isBootstrapping, hasActiveSession } = useBootstrapApp();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  const screenOpacity = useSharedValue(0);
  const imageScale = useSharedValue(1.05);
  const dotsOpacity = useSharedValue(0);

  // Entrance animations — unchanged
  useEffect(() => {
    screenOpacity.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.ease),
    });

    imageScale.value = withSpring(1.0, {
      damping: 22,
      stiffness: 55,
      mass: 1,
    });

    dotsOpacity.value = withDelay(
      900,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) }),
    );
  }, []);

  // Minimum display timer — runs independently of session check
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  const navigateTo = useCallback(
    (target: string) => {
      router.replace(target as never);
    },
    [router],
  );

  // Navigate only after BOTH the session check AND minimum time are done
  useEffect(() => {
    if (!isBootstrapping && minTimeElapsed) {
      const target = hasActiveSession ? '/(app)/(tabs)' : '/auth';
      screenOpacity.value = withTiming(
        0,
        { duration: 450, easing: Easing.in(Easing.ease) },
        (finished) => {
          if (finished) {
            runOnJS(navigateTo)(target);
          }
        },
      );
    }
  }, [isBootstrapping, minTimeElapsed, hasActiveSession, navigateTo]);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const imageWrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.value }],
  }));

  const dotsStyle = useAnimatedStyle(() => ({
    opacity: dotsOpacity.value,
  }));

  return (
    <Animated.View style={[styles.root, screenStyle]}>
      <StatusBar hidden />

      <Animated.View style={[styles.fill, imageWrapStyle]}>
        <ImageBackground
          source={require('@/assets/images/splash-screen.png')}
          style={styles.fill}
          resizeMode="cover"
        />
      </Animated.View>

      <WaveRipple />

      <View style={styles.fill} pointerEvents="none">
        {HEARTS.map((h, i) => (
          <FloatingHeart
            key={i}
            startX={h.startX}
            startY={h.startY}
            size={h.size}
            delay={h.delay}
            duration={h.duration}
          />
        ))}
      </View>

      <Animated.View style={[styles.dotsWrapper, dotsStyle]}>
        <PulsingDots />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: W,
    height: H,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  dotsWrapper: {
    position: 'absolute',
    bottom: H * 0.08,
    alignSelf: 'center',
  },
});
