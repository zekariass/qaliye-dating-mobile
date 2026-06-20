import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Mirrors AppTabBar constants exactly
const ACTIVE_COLOR = colors.primary;
const BAR_H = 68;
const C = 64;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: string, active: boolean): IoniconName {
  switch (name) {
    case 'index':   return active ? 'home'         : 'home-outline';
    case 'matches': return active ? 'heart-circle' : 'heart-circle-outline';
    case 'likes':   return active ? 'heart'        : 'heart-outline';
    case 'profile': return active ? 'person'       : 'person-outline';
    default:        return 'ellipse-outline';
  }
}

function MatchesIcon({ active, inactiveColor }: { active: boolean; inactiveColor: string }) {
  const col = active ? ACTIVE_COLOR : inactiveColor;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons name={active ? 'heart' : 'heart-outline'} size={19} color={col} />
      <Ionicons name={active ? 'heart' : 'heart-outline'} size={19} color={col} style={{ marginLeft: -8 }} />
    </View>
  );
}

const TABS = [
  { name: 'index',    label: 'Home' },
  { name: 'matches',  label: 'Matches' },
  { name: 'messages', label: 'Messages' },
  { name: 'likes',    label: 'Likes' },
  { name: 'profile',  label: 'Profile' },
];

const TAB_ROUTES: Record<string, string> = {
  index:   '/(app)/(tabs)/',
  matches: '/(app)/(tabs)/matches',
  likes:   '/(app)/(tabs)/likes',
  profile: '/(app)/(tabs)/profile',
};

interface Props {
  activeTab?: string;
}

export default function ProfileFloatingNav({ activeTab = 'profile' }: Props) {
  const { bottom } = useSafeAreaInsets();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const router = useRouter();

  const pillBg          = isDark ? '#EDE5FF' : colors.blackTab;
  const wrapperBg       = isDark ? th.background : 'transparent';
  const centerOuterBg   = isDark ? th.background : colors.background;
  const centerOuterBorder = isDark ? th.border : colors.border;
  const inactiveColor   = isDark ? '#7C6EA0' : '#9CA3AF';

  const handleTabPress = (name: string) => {
    if (name === 'messages') {
      console.log('Open messages');
      return;
    }
    router.navigate(TAB_ROUTES[name] as any);
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(bottom, 10), backgroundColor: wrapperBg }]}>
      <View style={[styles.bar, { backgroundColor: pillBg }]}>
        {TABS.map((tab) => {
          const isFocused = activeTab === tab.name;
          const isCenter  = tab.name === 'messages';

          if (isCenter) {
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.centerWrap}
                onPress={() => handleTabPress(tab.name)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Go to Messages"
              >
                <View style={[styles.centerOuter, { backgroundColor: centerOuterBg, borderColor: centerOuterBorder }]}>
                  <View style={styles.centerCircle}>
                    <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          const iconColor = isFocused ? ACTIVE_COLOR : inactiveColor;

          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => handleTabPress(tab.name)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Go to ${tab.label}`}
            >
              <View style={styles.iconWrap}>
                {tab.name === 'matches' ? (
                  <MatchesIcon active={isFocused} inactiveColor={inactiveColor} />
                ) : (
                  <Ionicons name={tabIcon(tab.name, isFocused)} size={23} color={iconColor} />
                )}
              </View>
              <Text style={[styles.label, { color: inactiveColor }, isFocused && styles.labelActive]}>
                {tab.label}
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

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 7,
    paddingTop: 18,
    overflow: 'visible',
  },
  bar: {
    height: BAR_H,
    flexDirection: 'row',
    alignItems: 'center',
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
    borderWidth: 2,
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
    shadowOpacity: 0.65,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  gapLine: {
    height: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
});
