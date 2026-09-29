import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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

export type BlindDateNavKey = 'home' | 'open' | 'mine' | 'participating' | 'matches' | 'profile';

const NAV_ITEMS: { key: BlindDateNavKey; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home',          labelKey: 'blindDate.nav.home',          icon: 'home-outline' },
  { key: 'open',          labelKey: 'blindDate.nav.explore',       icon: 'compass-outline' },
  { key: 'participating', labelKey: 'blindDate.nav.joined',        icon: 'heart-outline' },
  { key: 'mine',          labelKey: 'blindDate.nav.create',        icon: 'add-outline' },
  { key: 'matches',       labelKey: 'blindDate.nav.matches',       icon: 'heart-circle-outline' },
  { key: 'profile',       labelKey: 'blindDate.nav.profile',       icon: 'person-circle-outline' },
];

// ─── Matches icon — same double-heart as the discovery tab bar ────────────────

function MatchesNavIcon({
  active,
  color,
  inactiveFill,
}: {
  active: boolean;
  color: string;
  inactiveFill: string;
}) {
  const backName = active ? 'heart' : 'heart-outline';
  const frontColor = active ? color : inactiveFill;
  return (
    <View style={styles.matchesIconWrap}>
      <Ionicons name={backName} size={23} color={color} style={styles.matchesHeartBack} />
      <Ionicons name="heart" size={23} color={frontColor} style={styles.matchesHeartFront} />
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface BlindDateBottomNavProps {
  activeTab: BlindDateNavKey;
  onHome: () => void;
  onExplore: () => void;
  onMine: () => void;
  onJoined: () => void;
  onMatches: () => void;
  onProfile: () => void;
}

export default function BlindDateBottomNav({
  activeTab,
  onHome,
  onExplore,
  onMine,
  onJoined,
  onMatches,
  onProfile,
}: BlindDateBottomNavProps) {
  const { t } = useTranslation();
  const { card, border, textMuted, purple, isDark } = useBlindDateTheme();
  const insets = useSafeAreaInsets();
  // Matches the discovery bar's inactive front-heart fill.
  const matchesInactiveFill = isDark ? '#E5E7EB' : '#0B0B0B';

  const handlers: Record<BlindDateNavKey, () => void> = {
    home:          onHome,
    open:          onExplore,
    participating: onJoined,
    matches:       onMatches,
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
            accessibilityLabel={t(item.labelKey)}
            accessibilityState={{ selected: active }}
          >
            {item.key === 'matches' ? (
              <MatchesNavIcon
                active={active}
                color={active ? purple : textMuted}
                inactiveFill={matchesInactiveFill}
              />
            ) : (
              <Ionicons name={item.icon} size={22} color={active ? purple : textMuted} />
            )}
            <Text style={[styles.navLabel, { color: active ? purple : textMuted }]} numberOfLines={1}>
              {t(item.labelKey)}
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
  matchesIconWrap: {
    width: 34,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchesHeartBack: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0.55,
  },
  matchesHeartFront: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
