/**
 * MatchmakingTabBar
 *
 * Persistent bottom navigation for the matchmaking section.
 * Tabs: Discovery · Requests · Introductions (center/raised) · Matches · Profile
 *
 * - Discovery / Matches / Profile cross-navigate to the main app tabs.
 * - Request → shimgilina-request-status (status + new-request entry)
 * - Intros → shimgilina-introductions (introduction history list)
 *
 * Within-matchmaking switching uses router.replace() so tapping between the
 * two tabs swaps screens instead of growing the stack.
 */
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useActiveMatchmakingRequest } from '@/hooks/matchmaking/useMatchmakingRequest';
import { useTheme } from '@/hooks/use-theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MatchmakingTab = 'discovery' | 'requests' | 'introductions' | 'matches' | 'profile';

interface Props {
  activeTab: MatchmakingTab;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BAR_H = 64;
const CENTER_D = 48; // center circle diameter

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: { key: MatchmakingTab; label: string; icon: IconName; activeIcon: IconName }[] = [
  { key: 'discovery',     label: 'Discovery',     icon: 'grid-outline',        activeIcon: 'grid' },
  { key: 'requests',      label: 'Request',       icon: 'list-outline',        activeIcon: 'list' },
  { key: 'introductions', label: 'Intros',         icon: 'heart-outline',       activeIcon: 'heart' },
  { key: 'matches',       label: 'Matches',       icon: 'heart-circle-outline', activeIcon: 'heart-circle' },
  { key: 'profile',       label: 'Profile',       icon: 'person-outline',      activeIcon: 'person' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MatchmakingTabBar({ activeTab }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { bottom } = useSafeAreaInsets();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const { data: activeRequest } = useActiveMatchmakingRequest();
  const activeIntroId = activeRequest?.active_introduction_id ?? null;
  const hasActiveIntro = !!activeIntroId;

  const separatorColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
  const inactiveColor  = isDark ? '#64748B' : '#6B7280';
  const activeColor    = colors.primary;

  const handlePress = (tab: MatchmakingTab) => {
    switch (tab) {
      // Cross-section navigation: jump to main app tabs
      case 'discovery':
        router.navigate('/(app)/(tabs)/' as never);
        break;
      case 'matches':
        router.navigate('/(app)/(tabs)/matches' as never);
        break;
      case 'profile':
        router.navigate('/(app)/(tabs)/profile' as never);
        break;

      // Within-matchmaking tab switching: use replace so the stack doesn't
      // grow and switching always works regardless of current route.
      case 'requests':
        if (pathname === '/shimgilina-request-status') return; // already here
        router.replace('/(app)/shimgilina-request-status' as never);
        break;

      case 'introductions':
        if (pathname === '/shimgilina-introductions') return; // already here
        router.replace('/(app)/shimgilina-introductions' as never);
        break;
    }
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: th.background,
          paddingBottom: Math.max(bottom, 8),
        },
      ]}
    >
      <View style={[styles.separator, { backgroundColor: separatorColor }]} />

      <View style={styles.bar}>
        {TAB_CONFIG.map((tab, idx) => {
          const isFocused  = tab.key === activeTab;
          const isCenter   = tab.key === 'introductions';
          const iconName   = isFocused ? tab.activeIcon : tab.icon;
          const iconColor  = isFocused ? activeColor : inactiveColor;

          // ── Center raised button ──────────────────────────────────────────
          if (isCenter) {
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.centerWrap}
                onPress={() => handlePress(tab.key)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
              >
                <View
                  style={[
                    styles.centerOuter,
                    {
                      backgroundColor: th.background,
                      borderColor: separatorColor,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.centerCircle,
                      {
                        backgroundColor: isFocused ? activeColor : (isDark ? '#2D1E4F' : '#F3E8FF'),
                      },
                    ]}
                  >
                    <Ionicons
                      name={iconName}
                      size={24}
                      color={isFocused ? '#FFF' : activeColor}
                    />
                    {/* Active intro badge */}
                    {hasActiveIntro && !isFocused && (
                      <View style={styles.introBadge} />
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    styles.centerLabel,
                    { color: isFocused ? activeColor : inactiveColor },
                    isFocused && { fontWeight: '700' },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }

          // ── Regular tabs ─────────────────────────────────────────────────
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => handlePress(tab.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
            >
              {isFocused && (
                <View style={[styles.activeIndicator, { backgroundColor: activeColor }]} />
              )}
              <Ionicons name={iconName} size={23} color={iconColor} />
              <Text
                style={[
                  styles.label,
                  { color: iconColor },
                  isFocused && { fontWeight: '700', color: activeColor },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'visible',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  bar: {
    height: BAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    overflow: 'visible',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: BAR_H,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -12,
    width: 24,
    height: 2.5,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
  // Center (Introductions) raised button
  centerWrap: {
    width: CENTER_D + 24,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: -(CENTER_D * 0.6),
    paddingBottom: 2,
    gap: 3,
  },
  centerOuter: {
    width: CENTER_D + 10,
    height: CENTER_D + 10,
    borderRadius: (CENTER_D + 10) / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircle: {
    width: CENTER_D,
    height: CENTER_D,
    borderRadius: CENTER_D / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    position: 'relative',
  },
  introBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.secondary,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  centerLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});

// ─── Height export for scroll padding ────────────────────────────────────────

/** How much bottom padding to add to scroll views so content clears the tab bar. */
export const MATCHMAKING_TAB_BAR_HEIGHT = BAR_H;
