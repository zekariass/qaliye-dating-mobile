import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  icon?: ReactNode;
  message: string;
};

export default function InfoMessage({ icon, message }: Props) {
  const { colors: th } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: th.backgroundSelected }]}>
      {icon != null && <View style={styles.iconWrapper}>{icon}</View>}
      <Text style={[styles.text, { color: th.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
});
