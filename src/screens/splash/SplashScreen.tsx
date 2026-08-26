import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as NativeSplash from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Image, StatusBar, StyleSheet, Text, View } from 'react-native';
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

import { colors, fontSize } from '@/constants/theme';
import { useBootstrapApp } from '@/hooks/auth/useBootstrapApp';
import { useTheme } from '@/hooks/use-theme';

const { width: W, height: H } = Dimensions.get('window');
const AnimatedImage = Animated.createAnimatedComponent(Image);

const MALE_ICON = require('@/assets/images/loader/loader-icon-male.webp');
const FEMALE_ICON = require('@/assets/images/loader/loader-icon-female.webp');
const BOTH_ICON = require('@/assets/images/loader/loader-icon-male-and-female.webp');

const CIRCLE_SIZE = 120;
const ICON_SIZE = 64;
const MERGED_CIRCLE_SIZE = 150;
const MERGED_ICON_SIZE = 80;
const TRAVEL_DISTANCE = W * 0.32;

// Timeline (ms from mount):
//   0    – 400   fade in two circles
//   400  – 2400  circles glide toward centre (2000ms ease-in-out)
//   2200 – 2600  merged circle fades in (overlaps with circle arrival)
//   2400 – 2900  individual circles fade out (no flicker — overlap with merged)
//   2600+ merged circle stays visible until splash exits
const FADE_IN_DELAY = 200;
const FADE_IN_DURATION = 400;
const MOVE_DELAY = 500;
const MOVE_DURATION = 2000;
const MERGED_FADE_START = MOVE_DELAY + MOVE_DURATION - 300;
const MERGED_FADE_DURATION = 500;
const INDIVIDUAL_FADE_START = MOVE_DELAY + MOVE_DURATION - 100;
const INDIVIDUAL_FADE_DURATION = 500;

function CircleMergeAnimation() {
  const leftX = useSharedValue(-TRAVEL_DISTANCE);
  const rightX = useSharedValue(TRAVEL_DISTANCE);
  const leftOpacity = useSharedValue(0);
  const rightOpacity = useSharedValue(0);
  const leftScale = useSharedValue(0.7);
  const rightScale = useSharedValue(0.7);

  const mergedOpacity = useSharedValue(0);
  const mergedScale = useSharedValue(0.8);

  useEffect(() => {
    // Fade in both circles, hold, then fade out (cross-dissolve with merged)
    const holdDuration = INDIVIDUAL_FADE_START - (FADE_IN_DELAY + FADE_IN_DURATION);

    leftOpacity.value = withSequence(
      withDelay(FADE_IN_DELAY, withTiming(1, { duration: FADE_IN_DURATION, easing: Easing.out(Easing.ease) })),
      withTiming(1, { duration: holdDuration }),
      withTiming(0, { duration: INDIVIDUAL_FADE_DURATION, easing: Easing.inOut(Easing.ease) }),
    );
    rightOpacity.value = withSequence(
      withDelay(FADE_IN_DELAY, withTiming(1, { duration: FADE_IN_DURATION, easing: Easing.out(Easing.ease) })),
      withTiming(1, { duration: holdDuration }),
      withTiming(0, { duration: INDIVIDUAL_FADE_DURATION, easing: Easing.inOut(Easing.ease) }),
    );

    leftScale.value = withDelay(FADE_IN_DELAY, withSpring(1, { damping: 16, stiffness: 120 }));
    rightScale.value = withDelay(FADE_IN_DELAY, withSpring(1, { damping: 16, stiffness: 120 }));

    // Glide circles toward centre
    leftX.value = withDelay(
      MOVE_DELAY,
      withTiming(0, { duration: MOVE_DURATION, easing: Easing.inOut(Easing.cubic) }),
    );
    rightX.value = withDelay(
      MOVE_DELAY,
      withTiming(0, { duration: MOVE_DURATION, easing: Easing.inOut(Easing.cubic) }),
    );

    // Merged circle fades in slightly before circles meet (overlap → no flicker)
    mergedOpacity.value = withDelay(
      MERGED_FADE_START,
      withTiming(1, { duration: MERGED_FADE_DURATION, easing: Easing.out(Easing.ease) }),
    );
    mergedScale.value = withDelay(
      MERGED_FADE_START,
      withSpring(1, { damping: 14, stiffness: 110 }),
    );
  }, []);

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftX.value }, { scale: leftScale.value }],
    opacity: leftOpacity.value,
  }));

  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightX.value }, { scale: rightScale.value }],
    opacity: rightOpacity.value,
  }));

  const mergedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mergedScale.value }],
    opacity: mergedOpacity.value,
  }));

  return (
    <View style={styles.heartMergeContainer} pointerEvents="none">
      {/* Left circle with male icon */}
      <Animated.View style={[styles.circleWrap, leftStyle]}>
        <View style={[styles.circle, { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, borderColor: 'rgba(138,44,255,0.6)' }]}>
          <Image source={MALE_ICON} style={{ width: ICON_SIZE, height: ICON_SIZE }} resizeMode="contain" />
        </View>
      </Animated.View>

      {/* Right circle with female icon */}
      <Animated.View style={[styles.circleWrap, rightStyle]}>
        <View style={[styles.circle, { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, borderColor: 'rgba(255,79,163,0.6)' }]}>
          <Image source={FEMALE_ICON} style={{ width: ICON_SIZE, height: ICON_SIZE }} resizeMode="contain" />
        </View>
      </Animated.View>

      {/* Merged circle with both icons */}
      <Animated.View style={[styles.circleWrap, styles.mergedHeart, mergedStyle]}>
        <View style={[styles.circle, { width: MERGED_CIRCLE_SIZE, height: MERGED_CIRCLE_SIZE, borderRadius: MERGED_CIRCLE_SIZE / 2, borderColor: 'rgba(255,79,163,0.7)' }]}>
          <Image source={BOTH_ICON} style={{ width: MERGED_ICON_SIZE, height: MERGED_ICON_SIZE }} resizeMode="contain" />
        </View>
      </Animated.View>
    </View>
  );
}


// Minimum time the splash is visible regardless of how fast the session check resolves
const MIN_SPLASH_MS = 5000;

const ORBS = [
  { size: 320, color: 'rgba(255,79,163,0.14)', startX: -80, startY: H * 0.05, dx: 80, dy: 120, duration: 8200, delay: 0 },
  { size: 280, color: 'rgba(138,44,255,0.18)', startX: W * 0.5, startY: H * 0.55, dx: -60, dy: -80, duration: 9000, delay: 500 },
  { size: 220, color: 'rgba(255,154,205,0.12)', startX: W * 0.75, startY: -30, dx: -50, dy: 100, duration: 7800, delay: 900 },
  { size: 260, color: 'rgba(91,24,214,0.16)', startX: W * 0.05, startY: H * 0.7, dx: 70, dy: -40, duration: 7500, delay: 300 },
  { size: 180, color: 'rgba(255,255,255,0.08)', startX: W * 0.85, startY: H * 0.85, dx: -40, dy: -60, duration: 8500, delay: 1200 },
];

export default function SplashScreen() {
  const router = useRouter();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
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
    // Hide the native splash once our React content is mounted and animating
    NativeSplash.hide();

    screenOpacity.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) });

    logoScale.value = withDelay(
      3000,
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

    logoOpacity.value = withDelay(3000, withTiming(1, { duration: 500 }));
    logoRotate.value = withDelay(3000, withSpring(0, { damping: 12, stiffness: 100 }));

    titleOpacity.value = withDelay(3700, withTiming(0, { duration: 400 }));
    titleTranslateY.value = withDelay(3700, withTiming(-10, { duration: 400 }));
    taglineOpacity.value = withDelay(3700, withTiming(1, { duration: 400 }));
    taglineTranslateY.value = withDelay(3700, withSpring(0, { damping: 14, stiffness: 100 }));
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
        colors={isDark
          ? ['#0D0712', '#1A0B2E', '#2A0B4F']
          : ['#2A0B4F', colors.primaryDark, colors.secondary]}
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

      <CircleMergeAnimation />

      {/* Logo — positioned at top-left corner so it doesn't overlap the heart animation */}
      <AnimatedImage
        source={require('@/assets/images/splash-icon.png')}
        style={[styles.logo, logoStyle]}
        resizeMode="contain"
      />

      {/* Text + progress bar — anchored to bottom, well clear of the centered animation */}
      <View style={styles.bottom}>
        <Animated.View style={titleStyle}>
          <AnimatedTitle text="Qaliye" color="#FFFFFF" />
        </Animated.View>
        <Animated.Text style={[styles.tagline, { color: 'rgba(255,255,255,0.85)' }, taglineStyle]}>
          Find your soulmate.
        </Animated.Text>
        <View style={styles.progressTrack}>
          <ShimmerBar />
        </View>
        <Text style={styles.versionText}>
          v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
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
  const heartScale = useSharedValue(1);
  const heartOpacity = useSharedValue(0.5);

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

    heartScale.value = withDelay(
      delay + 300,
      withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );

    heartOpacity.value = withDelay(
      delay + 300,
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.35, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
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
    >
      <Animated.View style={[styles.orbHeart, heartStyle]}>
        <Ionicons name="heart" size={size * 0.28} color="rgba(255,255,255,0.9)" />
      </Animated.View>
    </Animated.View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbHeart: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartMergeContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  circleWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  mergedHeart: {
    zIndex: 10,
  },
  logo: {
    position: 'absolute',
    top: 56,
    left: 24,
    width: 120,
    height: 120,
    zIndex: 20,
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
    fontWeight: '500',
  },
  bottom: {
    position: 'absolute',
    bottom: H * 0.07,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 10,
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
  versionText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
  },
});
