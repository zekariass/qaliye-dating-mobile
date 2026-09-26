import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ─── Theme helper (shared across all Blind Date screens) ─────────────────────

export function useBlindDateTheme() {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  return {
    isDark,
    bg:          th.background,
    card:        th.surface,
    textPrimary: th.text,
    textMuted:   th.textSecondary,
    purple:      colors.primary,
    pink:        colors.secondary,
    chipBg:      isDark ? '#2E1F50' : '#F2E7FF',
    segBg:       isDark ? th.backgroundElement : '#EFE7FF',
    segBorder:   isDark ? '#3D2A6E' : '#DDD0FA',
    border:      th.border,
    sheetBg:     isDark ? th.backgroundElement : th.surface,
  };
}

// ─── Nav items ────────────────────────────────────────────────────────────────

export type BlindDateNavKey = 'home' | 'open' | 'mine' | 'participating' | 'profile';

const NAV_ITEMS: { key: BlindDateNavKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home',          label: 'Home',     icon: 'home-outline' },
  { key: 'open',          label: 'Explore',  icon: 'compass-outline' },
  { key: 'participating', label: 'Joined',   icon: 'heart-outline' },
  { key: 'mine',          label: 'Hosted',   icon: 'star-outline' },
  { key: 'profile',       label: 'Profile',  icon: 'person-circle-outline' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export interface BlindDateBottomNavProps {
  activeTab: BlindDateNavKey;
  onHome: () => void;
  onExplore: () => void;
  onMine: () => void;
  onJoined: () => void;
  onProfile: () => void;
}

export default function BlindDateBottomNav({
  activeTab,
  onHome,
  onExplore,
  onMine,
  onJoined,
  onProfile,
}: BlindDateBottomNavProps) {
  const { card, border, textMuted, purple } = useBlindDateTheme();
  const insets = useSafeAreaInsets();

  const handlers: Record<BlindDateNavKey, () => void> = {
    home:          onHome,
    open:          onExplore,
    participating: onJoined,
    mine:          onMine,
    profile:       onProfile,
  };

  return (
    <View
      style={[
        styles.nav,
        {
          backgroundColor: card,
          borderColor: border,
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      {NAV_ITEMS.map((item) => {
        const active = item.key === activeTab;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.navItem}
            onPress={handlers[item.key]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
          >
            <Ionicons name={item.icon} size={22} color={active ? purple : textMuted} />
            <Text style={[styles.navLabel, { color: active ? purple : textMuted }]} numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  navLabel: { fontSize: 10.5, fontWeight: '700' },
});
