import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/constants/theme';

type Props = {
  icon?: ReactNode;
  message: string;
};

export default function InfoMessage({ icon, message }: Props) {
  return (
    <View style={styles.container}>
      {icon != null && <View style={styles.iconWrapper}>{icon}</View>}
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLavender,
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
    color: colors.primaryDark,
    lineHeight: 18,
  },
});
