import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Image, StatusBar, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, fontSize, spacing } from '@/constants/theme';
import { useBootstrapApp } from '@/hooks/auth/useBootstrapApp';

const { width: W, height: H } = Dimensions.get('window');
const AnimatedImage = Animated.createAnimatedComponent(Image);

// Minimum time the splash is visible regardless of how fast the session check resolves
const MIN_SPLASH_MS = 4000;

const ORBS = [
  { size: 320, color: 'rgba(255,79,163,0.14)', startX: -80, startY: H * 0.05, dx: 80, dy: 120, duration: 8200, delay: 0 },
  { size: 280, color: 'rgba(138,44,255,0.18)', startX: W * 0.5, startY: H * 0.55, dx: -60, dy: -80, duration: 9000, delay: 500 },
  { size: 220, color: 'rgba(255,154,205,0.12)', startX: W * 0.75, startY: -30, dx: -50, dy: 100, duration: 7800, delay: 900 },
  { size: 260, color: 'rgba(91,24,214,0.16)', startX: W * 0.05, startY: H * 0.7, dx: 70, dy: -40, duration: 7500, delay: 300 },
  { size: 180, color: 'rgba(255,255,255,0.08)', startX: W * 0.85, startY: H * 0.85, dx: -40, dy: -60, duration: 8500, delay: 1200 },
];

export default function SplashScreen() {
  const router = useRouter();
  const { isBootstrapping, hasActiveSession } = useBootstrapApp();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  const screenOpacity = useSharedValue(0);

  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const logoRotate = useSharedValue(-12);

  const titleOpacity = useSharedValue(1);
  const titleTranslateY = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(12);

  useEffect(() => {
    screenOpacity.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) });

    logoScale.value = withDelay(
      200,
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.2)) }),
        withRepeat(
          withSequence(
            withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          true,
        ),
      ),
    );

    logoOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    logoRotate.value = withDelay(200, withSpring(0, { damping: 12, stiffness: 100 }));

    titleOpacity.value = withDelay(2500, withTiming(0, { duration: 400 }));
    titleTranslateY.value = withDelay(2500, withTiming(-10, { duration: 400 }));
    taglineOpacity.value = withDelay(2500, withTiming(1, { duration: 400 }));
    taglineTranslateY.value = withDelay(2500, withSpring(0, { damping: 14, stiffness: 100 }));
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
            scheduleOnRN(navigateTo, target);
          }
        },
      );
    }
  }, [isBootstrapping, minTimeElapsed, hasActiveSession, navigateTo]);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }, { rotate: `${logoRotate.value}deg` }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  return (
    <Animated.View style={[styles.root, screenStyle]}>
      <StatusBar hidden />

      <LinearGradient
        colors={['#2A0B4F', colors.primaryDark, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fill}
      />

      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.overlay}
      />

      <View style={styles.orbLayer} pointerEvents="none">
        {ORBS.map((orb, i) => (
          <FloatingOrb key={i} {...orb} />
        ))}
      </View>

      <View style={styles.center}>
        <AnimatedImage
          source={require('@/assets/images/logo-glow.png')}
          style={[styles.logo, logoStyle]}
          resizeMode="contain"
        />
        <Animated.View style={titleStyle}>
          <AnimatedTitle text="Qaliye" color="#FFFFFF" />
        </Animated.View>
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Find your soulmate.
        </Animated.Text>
      </View>

      <View style={styles.bottom}>
        <View style={styles.progressTrack}>
          <ShimmerBar />
        </View>
      </View>
    </Animated.View>
  );
}

interface OrbSpec {
  size: number;
  color: string;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  duration: number;
  delay: number;
}

function FloatingOrb({ size, color, startX, startY, dx, dy, duration, delay }: OrbSpec) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(dx, { duration: duration * 0.5, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: duration * 0.5, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );

    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(dy, { duration: duration * 0.5, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: duration * 0.5, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.orb,
        animStyle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: startX,
          top: startY,
        },
      ]}
    />
  );
}

interface AnimatedTitleProps {
  text: string;
  color: string;
}

function AnimatedTitle({ text, color }: AnimatedTitleProps) {
  return (
    <View style={styles.titleRow}>
      {text.split('').map((letter, i) => (
        <AnimatedLetter key={i} letter={letter} color={color} delay={600 + i * 80} />
      ))}
    </View>
  );
}

interface AnimatedLetterProps {
  letter: string;
  color: string;
  delay: number;
}

function AnimatedLetter({ letter, color, delay }: AnimatedLetterProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(18);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 450 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 12, stiffness: 130 }));
    scale.value = withDelay(delay, withTiming(1, { duration: 450 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.Text style={[styles.titleLetter, { color }, style]}>
      {letter === ' ' ? '\u00A0' : letter}
    </Animated.Text>
  );
}

function ShimmerBar() {
  const translateX = useSharedValue(-140);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(210, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return <Animated.View style={[styles.shimmer, style]} />;
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
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.6,
  },
  orbLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  orb: {
    position: 'absolute',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
  },
  titleLetter: {
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    letterSpacing: 2,
    textShadowColor: 'rgba(138,44,255,0.4)',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 4 },
  },
  tagline: {
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing.sm,
    fontWeight: '500',
  },
  bottom: {
    position: 'absolute',
    bottom: H * 0.08,
    alignSelf: 'center',
  },
  progressTrack: {
    width: 140,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  shimmer: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
