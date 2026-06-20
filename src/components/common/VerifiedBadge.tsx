import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

interface Props {
  size?: number;
}

export default function VerifiedBadge({ size = 14 }: Props) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.check, { fontSize: size * 0.65 }]}>✓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: '#FFFFFF',
    fontWeight: '800',
    lineHeight: 14,
  },
});
