import { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontSize, radius, shadows, spacing } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  accessibilityLabel?: string;
};

export default function GradientButton({
  label,
  onPress,
  leftIcon,
  rightIcon,
  accessibilityLabel,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      activeOpacity={0.85}
    >
      <View style={styles.gradientLayer} />
      <View style={styles.content}>
        {leftIcon != null && <View style={styles.iconLeft}>{leftIcon}</View>}
        <Text style={styles.label}>{label}</Text>
        {rightIcon != null && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.full,
    overflow: 'hidden',
    minHeight: 58,
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...shadows.soft,
  },
  gradientLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#7B20E8',
    opacity: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  iconLeft: {
    position: 'absolute',
    left: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRight: {
    position: 'absolute',
    right: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.surface,
    letterSpacing: 0.3,
  },
});
