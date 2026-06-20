import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontSize, radius, shadows, spacing } from '@/constants/theme';

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
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, selected === 'login' && styles.tabActive]}
        onPress={() => onSelect('login')}
        accessibilityRole="tab"
        accessibilityState={{ selected: selected === 'login' }}
        accessibilityLabel={loginLabel}
      >
        <Text style={[styles.tabText, selected === 'login' && styles.tabTextActive]}>
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
        <Text style={[styles.tabText, selected === 'createAccount' && styles.tabTextActive]}>
          {'＋  ' + createAccountLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
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
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.surface,
  },
});
