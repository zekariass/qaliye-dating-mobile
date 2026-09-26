import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withTiming
} from 'react-native-reanimated';

import { bdColors } from '@/constants/blindDateTheme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PARTICLE_COUNT = 14;

type Particle = {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  icon: 'heart' | 'star' | 'sparkle';
  color: string;
};

const PARTICLE_COLORS = [
  bdColors.primary,
  bdColors.accent,
  '#B777FF',
  '#C79BFF',
  '#F59E0B',
  '#FFF',
];

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const dist = 60 + Math.random() * 100;
    const icons: Particle['icon'][] = ['heart', 'star', 'sparkle'];
    return {
      x: SCREEN_W / 2 + Math.cos(angle) * dist,
      y: SCREEN_H * 0.38 + Math.sin(angle) * dist,
      size: 10 + Math.random() * 14,
      delay: Math.random() * 400,
      duration: 900 + Math.random() * 700,
      icon: icons[i % icons.length],
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
    };
  });
}

function CelebrationParticle({ p }: { p: Particle }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      p.delay,
      withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0, { duration: p.duration, easing: Easing.in(Easing.quad) }),
      ),
    );
    scale.value = withDelay(
      p.delay,
      withSequence(
        withTiming(1.3, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(0.6, { duration: p.duration, easing: Easing.in(Easing.quad) }),
      ),
    );
    translateY.value = withDelay(
      p.delay,
      withTiming(-60 - Math.random() * 80, {
        duration: p.duration,
        easing: Easing.out(Easing.quad),
      }),
    );
  }, [p, opacity, scale, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  const iconName =
    p.icon === 'heart' ? 'heart' : p.icon === 'star' ? 'star' : 'sparkles';

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: p.x - p.size / 2,
          top: p.y - p.size / 2,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <Ionicons name={iconName} size={p.size} color={p.color} />
    </Animated.View>
  );
}

/**
 * Lightweight celebration overlay — floating hearts/stars/sparkles that fade
 * out after ~1.5 seconds. Rendered absolutely over the current screen content.
 * Set `visible` to trigger; the parent controls dismissal.
 */
export function CelebrationOverlay({ visible }: { visible: boolean }) {
  const particles = useMemo(() => generateParticles(), []);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {particles.map((p, i) => (
        <CelebrationParticle key={i} p={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 999,
    elevation: 10,
  },
});
