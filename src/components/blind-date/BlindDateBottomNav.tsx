import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwipeIcon } from '@/components/layout/AppTabBar';
import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { rs, useTabletScale } from '@/utils/responsive';

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

export type BlindDateNavKey = 'home' | 'open' | 'mine' | 'participating' | 'matches';

const BAR_H  = 64;
const C      = 38;   // center circle diameter
const CENTER: BlindDateNavKey = 'mine';

const NAV_ITEMS: { key: BlindDateNavKey; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'open',          labelKey: 'blindDate.nav.browse',  icon: 'albums-outline' },
  { key: 'participating', labelKey: 'blindDate.nav.joined',  icon: 'heart-outline' },
  { key: 'mine',          labelKey: 'blindDate.nav.create',  icon: 'add' },
  { key: 'home',          labelKey: 'tabs.discover',         icon: 'grid-outline' },
  { key: 'matches',       labelKey: 'blindDate.nav.matches', icon: 'heart-circle-outline' },
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
}

export default function BlindDateBottomNav({
  activeTab,
  onHome,
  onExplore,
  onMine,
  onJoined,
  onMatches,
}: BlindDateBottomNavProps) {
  const { t } = useTranslation();
  const { bg, isDark } = useBlindDateTheme();
  const { bottom } = useSafeAreaInsets();
  const scale = useTabletScale();
  const cS = rs(C, scale);

  // Same palette as the discovery tab bar.
  const barBg             = bg;
  const separatorColor    = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.30)';
  const inactiveColor     = isDark ? '#64748B' : '#111827';
  const activeColor       = isDark ? '#A78BFA' : colors.primary;
  const inactiveFill      = isDark ? '#E5E7EB' : '#0B0B0B';
  const centerOuterBorder = separatorColor;

  const handlers: Record<BlindDateNavKey, () => void> = {
    open:          onExplore,
    participating: onJoined,
    mine:          onMine,
    home:          onHome,
    matches:       onMatches,
  };

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: Math.max(bottom, 10), backgroundColor: barBg },
      ]}
    >
      {/* Hairline separator — same as the discovery tab bar */}
      <View style={[styles.separator, { backgroundColor: separatorColor }]} />

      <View style={[styles.bar, { backgroundColor: barBg, height: rs(BAR_H, scale) }]}>
        {NAV_ITEMS.map((item) => {
          const active = item.key === activeTab;
          const onPress = handlers[item.key];

          // ── Center button (Create) ────────────────────────────────────────
          if (item.key === CENTER) {
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.centerWrap, { width: cS + rs(24, scale), marginTop: -(cS * 0.72) }]}
                onPress={onPress}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t(item.labelKey)}
              >
                {/* Outer ring provides visual separation from content above */}
                <View
                  style={[
                    styles.centerOuter,
                    {
                      backgroundColor: barBg,
                      borderColor: centerOuterBorder,
                      width: cS + rs(16, scale),
                      height: cS + rs(16, scale),
                      borderRadius: (cS + rs(16, scale)) / 2,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.centerCircle,
                      { width: cS, height: cS, borderRadius: cS / 2 },
                    ]}
                  >
                    <Ionicons name="add" size={rs(24, scale)} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          // ── Regular tabs ───────────────────────────────────────────────────
          const iconColor = active ? activeColor : inactiveColor;

          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.tab, { height: rs(BAR_H, scale) }]}
              onPress={onPress}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t(item.labelKey)}
              accessibilityState={{ selected: active }}
            >
              {/* Top pill indicator — same as the discovery tab bar */}
              {active && (
                <View
                  style={[
                    styles.activeIndicator,
                    { backgroundColor: activeColor, width: rs(24, scale), marginLeft: -rs(12, scale), height: rs(2.5, scale) },
                  ]}
                />
              )}

              <View style={[styles.iconWrap, { height: rs(26, scale) }]}>
                {item.key === 'matches' ? (
                  <View style={{ transform: [{ scale }] }}>
                    <MatchesNavIcon
                      active={active}
                      color={iconColor}
                      inactiveFill={inactiveFill}
                    />
                  </View>
                ) : item.key === 'open' ? (
                  <View style={{ transform: [{ scale }] }}>
                    <SwipeIcon
                      color={iconColor}
                      active={active}
                      inactiveFill={inactiveFill}
                    />
                  </View>
                ) : item.key === 'participating' ? (
                  <Ionicons name={active ? 'heart' : 'heart-outline'} size={rs(23, scale)} color={iconColor} />
                ) : (
                  <Ionicons name={item.icon} size={rs(23, scale)} color={iconColor} />
                )}
              </View>

              <Text
                style={[
                  styles.label,
                  { color: inactiveColor, fontSize: rs(11, scale) },
                  active && { color: activeColor, fontWeight: '700' },
                ]}
                numberOfLines={1}
              >
                {t(item.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

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
  iconWrap: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  matchesIconWrap: {
    width: 34,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchesHeartBack: {
    position: 'absolute',
    left: 0,
    top: 2,
    opacity: 0.55,
  },
  matchesHeartFront: {
    position: 'absolute',
    right: 0,
    top: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
  // Floats above the bar; background matches th.background for a clean "cutout"
  centerWrap: {
    width: C + 24,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: -(C * 0.72),
    paddingBottom: 4,
  },
  centerOuter: {
    width: C + 16,
    height: C + 16,
    borderRadius: (C + 16) / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircle: {
    width: C,
    height: C,
    borderRadius: C / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
});
