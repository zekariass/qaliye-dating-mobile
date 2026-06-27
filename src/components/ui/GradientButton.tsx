import { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontSize, radius, shadows, spacing } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  accessibilityLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
};

export default function GradientButton({
  label,
  onPress,
  leftIcon,
  rightIcon,
  accessibilityLabel,
  isLoading = false,
  disabled = false,
}: Props) {
  const isDisabled = disabled || isLoading;
  return (
    <TouchableOpacity
      onPress={isDisabled ? undefined : onPress}
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      activeOpacity={0.85}
    >
      <View style={styles.gradientLayer} />
      <View style={styles.content}>
        {!isLoading && leftIcon != null && <View style={styles.iconLeft}>{leftIcon}</View>}
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
        {!isLoading && rightIcon != null && <View style={styles.iconRight}>{rightIcon}</View>}
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
  buttonDisabled: {
    opacity: 0.6,
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
