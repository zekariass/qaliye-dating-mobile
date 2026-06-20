import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ---------------------------------------------------------------------------
// Minimal type mirrors of what Expo Router passes to tabBar
// ---------------------------------------------------------------------------
interface TabRoute {
  key: string;
  name: string;
  params?: object | undefined;
}
interface TabDescriptor {
  options: { title?: string };
}
interface TabNavigation {
  emit: (e: { type: 'tabPress'; target: string; canPreventDefault: boolean }) => { defaultPrevented: boolean };
  navigate: (name: string, params?: object | undefined) => void;
}
interface AppTabBarProps {
  state: { routes: TabRoute[]; index: number };
  descriptors: Record<string, TabDescriptor>;
  navigation: TabNavigation;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const LABELS: Record<string, string> = {
  index:    'Home',
  matches:  'Matches',
  messages: 'Messages',
  likes:    'Likes',
  profile:  'Profile',
};

const ACTIVE_COLOR = colors.primary;
const CENTER         = 'messages';
const BAR_H          = 68;
const C              = 64;   // center circle diameter

// ---------------------------------------------------------------------------
// Per-tab icon helper using Ionicons
// ---------------------------------------------------------------------------
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(routeName: string, active: boolean): IoniconName {
  switch (routeName) {
    case 'index':    return active ? 'home'           : 'home-outline';
    case 'matches':  return active ? 'heart-circle'   : 'heart-circle-outline';
    case 'likes':    return active ? 'heart'          : 'heart-outline';
    case 'profile':  return active ? 'person'         : 'person-outline';
    default:         return 'ellipse-outline';
  }
}

// Two-heart icon for Matches (overlapping)
function MatchesIcon({ active, inactiveColor }: { active: boolean; inactiveColor: string }) {
  const col = active ? ACTIVE_COLOR : inactiveColor;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons name={active ? 'heart' : 'heart-outline'} size={19} color={col} />
      <Ionicons name={active ? 'heart' : 'heart-outline'} size={19} color={col} style={{ marginLeft: -8 }} />
    </View>
  );
}

// Chat bubbles icon inside the center circle
function ChatBubblesIcon() {
  return <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AppTabBar({ state, descriptors: _d, navigation }: AppTabBarProps) {
  const { bottom } = useSafeAreaInsets();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const pillBg       = isDark ? '#EDE5FF' : colors.blackTab;
  const wrapperBg    = isDark ? th.background : 'transparent';
  const centerOuterBg   = isDark ? th.background : colors.background;
  const centerOuterBorder = isDark ? th.border : colors.border;
  const inactiveColor = isDark ? '#7C6EA0' : '#9CA3AF';

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(bottom, 10), backgroundColor: wrapperBg }]}>
      <View style={[styles.bar, { backgroundColor: pillBg }]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isCenter  = route.name === CENTER;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          // ── Center button (Messages) ──────────────────────────────────────
          if (isCenter) {
            return (
              <TouchableOpacity
                key={route.key}
                style={styles.centerWrap}
                onPress={onPress}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Go to Messages"
              >
                <View style={[styles.centerOuter, { backgroundColor: centerOuterBg, borderColor: centerOuterBorder }]}>
                  <View style={styles.centerCircle}>
                    <ChatBubblesIcon />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          // ── Regular tabs ─────────────────────────────────────────────────
          const iconColor = isFocused ? ACTIVE_COLOR : inactiveColor;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={onPress}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Go to ${LABELS[route.name] ?? route.name}`}
            >
              <View style={styles.iconWrap}>
                {route.name === 'matches' ? (
                  <MatchesIcon active={isFocused} inactiveColor={inactiveColor} />
                ) : (
                  <Ionicons
                    name={tabIcon(route.name, isFocused)}
                    size={23}
                    color={iconColor}
                  />
                )}
              </View>

              <Text style={[styles.label, { color: inactiveColor }, isFocused && styles.labelActive]}>
                {LABELS[route.name] ?? ''}
              </Text>

              {isFocused && <View style={styles.underline} />}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={[styles.gapLine, { backgroundColor: isDark ? th.border : '#E5E7EB' }]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 7,          // halved from 14
    paddingTop: 18,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  bar: {
    height: BAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blackTab,
    borderRadius: 40,
    paddingHorizontal: 6,
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
  iconWrap: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
  labelActive: {
    color: ACTIVE_COLOR,
    fontWeight: '700',
  },
  underline: {
    position: 'absolute',
    bottom: 7,
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: ACTIVE_COLOR,
  },
  centerWrap: {
    width: C + 24,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: -(C * 0.52),
    paddingBottom: 4,
  },
  centerOuter: {
    width: C + 20,
    height: C + 20,
    borderRadius: (C + 20) / 2,
    backgroundColor: colors.blackTab,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gapLine: {
    height: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  centerCircle: {
    width: C,
    height: C,
    borderRadius: C / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.65,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
});
