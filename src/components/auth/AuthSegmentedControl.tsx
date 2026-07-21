import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontSize, radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type AuthTab = 'login' | 'createAccount';

type Props = {
  selected: AuthTab;
  onSelect: (tab: AuthTab) => void;
  loginLabel: string;
  createAccountLabel: string;
};

export default function AuthSegmentedControl({
  selected,
  onSelect,
  loginLabel,
  createAccountLabel,
}: Props) {
  const { colors: th } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: th.surface, borderColor: th.border }]}>
      <TouchableOpacity
        style={[styles.tab, selected === 'login' && styles.tabActive]}
        onPress={() => onSelect('login')}
        accessibilityRole="tab"
        accessibilityState={{ selected: selected === 'login' }}
        accessibilityLabel={loginLabel}
      >
        <Text style={[styles.tabText, { color: th.textSecondary }, selected === 'login' && styles.tabTextActive]}>
          {'→  ' + loginLabel}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selected === 'createAccount' && styles.tabActive]}
        onPress={() => onSelect('createAccount')}
        accessibilityRole="tab"
        accessibilityState={{ selected: selected === 'createAccount' }}
        accessibilityLabel={createAccountLabel}
      >
        <Text style={[styles.tabText, { color: th.textSecondary }, selected === 'createAccount' && styles.tabTextActive]}>
          {'＋  ' + createAccountLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.full,
    borderWidth: 1.5,
    padding: 4,
    ...shadows.card,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radius.full,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.surface,
  },
});
