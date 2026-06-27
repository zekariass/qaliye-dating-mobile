import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface DateSeparatorProps {
  label: string;
}

export function DateSeparator({ label }: DateSeparatorProps) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.pill,
          { backgroundColor: isDark ? th.backgroundElement : '#EDE8F8' },
        ]}
      >
        <Text style={[styles.label, { color: isDark ? '#B8A9D9' : '#8B7BB5' }]}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
