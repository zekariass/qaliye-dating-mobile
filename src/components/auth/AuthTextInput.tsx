import { ReactNode } from 'react';
import {
    StyleSheet,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View
} from 'react-native';

import { colors, fontSize, radius, spacing } from '@/constants/theme';

type Props = TextInputProps & {
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  onRightPress?: () => void;
};

export default function AuthTextInput({
  leftSlot,
  rightSlot,
  onRightPress,
  style,
  ...rest
}: Props) {
  return (
    <View style={styles.container}>
      {leftSlot != null && <View style={styles.leftSlot}>{leftSlot}</View>}
      <TextInput
        style={[styles.input, leftSlot != null && styles.inputWithLeft, style]}
        placeholderTextColor={colors.textMuted}
        {...rest}
      />
      {rightSlot != null && (
        <TouchableOpacity
          style={styles.rightSlot}
          onPress={onRightPress}
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {rightSlot}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  leftSlot: {
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  inputWithLeft: {
    paddingLeft: 0,
  },
  rightSlot: {
    marginLeft: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
});
