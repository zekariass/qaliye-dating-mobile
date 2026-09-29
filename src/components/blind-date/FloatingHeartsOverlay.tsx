import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { bdColors } from '@/constants/blindDateTheme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PARTICLE_COUNT = 12;

type Particle = {
  x: number;
  size: number;
  delay: number;
  duration: number;
  kind: 'heart' | 'flower';
  color: string;
  emoji: string;
  swayAmp: number;
  swayFreq: number;
  rot: number;
  rotAmp: number;
};

const HEART_COLORS = [
  '#FF4FA3',
  '#FF7ABF',
  '#FF9BCD',
  bdColors.primary,
  '#C79BFF',
];
const FLOWER_EMOJIS = ['🌸', '🌷', '🌹'];

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const kind: Particle['kind'] = i % 3 === 2 ? 'flower' : 'heart';
    return {
      x: Math.random() * SCREEN_W,
      size: 16 + Math.random() * 16,
      delay: Math.random() * 4000,
      duration: 6500 + Math.random() * 5500,
      kind,
      color: HEART_COLORS[i % HEART_COLORS.length],
      emoji: FLOWER_EMOJIS[i % FLOWER_EMOJIS.length],
      swayAmp: 14 + Math.random() * 26,
      swayFreq: 1 + Math.random() * 1.5,
      rot: (Math.random() - 0.5) * 30,
      rotAmp: 8 + Math.random() * 14,
    };
  });
}

function FloatParticle({ p }: { p: Particle }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      p.delay,
      withRepeat(
        withTiming(1, { duration: p.duration, easing: Easing.linear }),
        -1,
      ),
    );
  }, [p, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.08, 0.85, 1], [0, 0.9, 0.9, 0]),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -(SCREEN_H + 120)]) },
      { translateX: Math.sin(progress.value * Math.PI * 2 * p.swayFreq) * p.swayAmp },
      { rotate: `${p.rot + Math.sin(progress.value * Math.PI * 2) * p.rotAmp}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[{ position: 'absolute', top: SCREEN_H, left: p.x }, style]}
      pointerEvents="none"
    >
      {p.kind === 'heart' ? (
        <Ionicons name="heart" size={p.size} color={p.color} />
      ) : (
        <Text style={{ fontSize: p.size }}>{p.emoji}</Text>
      )}
    </Animated.View>
  );
}

/**
 * Romantic ambient overlay — hearts and flowers drift upward from the bottom
 * edge on a loop with a gentle side-to-side sway. Rendered absolutely over the
 * screen content; the parent controls `visible`.
 */
export function FloatingHeartsOverlay({ visible }: { visible: boolean }) {
  const particles = useMemo(() => generateParticles(), []);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {particles.map((p, i) => (
        <FloatParticle key={i} p={p} />
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
