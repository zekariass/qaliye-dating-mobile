import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function QaliyeLogo() {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <View style={styles.logo} accessibilityLabel="Qaliye" accessibilityRole="image">
      <View style={styles.logoQWrap}>
        <Text style={[styles.logoQ, { color: isDark ? '#A78BFA' : colors.primary }]}>Q</Text>
        <View style={[styles.logoDot, { backgroundColor: isDark ? '#A78BFA' : colors.primary }]} />
      </View>
      <Text style={[styles.logoRest, { color: th.text }]}>aliye</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoQWrap: {
    position: 'relative',
  },
  logoQ: {
    fontSize: 22,
    fontWeight: '800',
    fontStyle: 'italic',
    lineHeight: 26,
  },
  logoDot: {
    position: 'absolute',
    top: 1,
    right: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  logoRest: {
    fontSize: 20,
    fontWeight: '500',
    fontStyle: 'italic',
    letterSpacing: 0.4,
    lineHeight: 26,
  },
});
