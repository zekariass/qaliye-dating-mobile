// import { Ionicons } from '@expo/vector-icons';
// import { useRouter } from 'expo-router';
// import { useMemo } from 'react';
// import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

// import { colors } from '@/constants/theme';
// import { useCurrentUserId } from '@/hooks/auth/useCurrentUserId';
// import { useInbox } from '@/hooks/messages/useInbox';
// import { useInboxChannel } from '@/hooks/messages/useInboxChannel';
// import { useTheme } from '@/hooks/use-theme';

// // ---------------------------------------------------------------------------
// // Minimal type mirrors of what Expo Router passes to tabBar
// // ---------------------------------------------------------------------------
// interface TabRoute {
//   key: string;
//   name: string;
//   params?: object | undefined;
// }
// interface TabDescriptor {
//   options: { title?: string };
// }
// interface TabNavigation {
//   emit: (e: { type: 'tabPress'; target: string; canPreventDefault: boolean }) => { defaultPrevented: boolean };
//   navigate: (name: string, params?: object | undefined) => void;
// }
// interface AppTabBarProps {
//   // Expo Router tab navigation props (required when used in Tabs)
//   state?: { routes: TabRoute[]; index: number };
//   descriptors?: Record<string, TabDescriptor>;
//   navigation?: TabNavigation;
//   // Standalone mode props (when used outside Tabs)
//   activeTab?: string;
// }

// // ---------------------------------------------------------------------------
// // Constants
// // ---------------------------------------------------------------------------
// const LABELS: Record<string, string> = {
//   index:    'Home',
//   matches:  'Matches',
//   messages: 'Messages',
//   likes:    'Likes',
//   profile:  'Profile',
// };

// const ACTIVE_COLOR = colors.primary;
// const CENTER         = 'messages';
// const BAR_H          = 68;
// const C              = 32;   // center circle diameter

// // ---------------------------------------------------------------------------
// // Per-tab icon helper using Ionicons
// // ---------------------------------------------------------------------------
// type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// function tabIcon(routeName: string, active: boolean): IoniconName {
//   switch (routeName) {
//     case 'index':    return active ? 'home'           : 'home-outline';
//     case 'matches':  return active ? 'heart-circle'   : 'heart-circle-outline';
//     case 'likes':    return active ? 'heart'          : 'heart-outline';
//     case 'profile':  return active ? 'person'         : 'person-outline';
//     default:         return 'ellipse-outline';
//   }
// }

// // Two-heart icon for Matches (overlapping)
// function MatchesIcon({ active, inactiveColor }: { active: boolean; inactiveColor: string }) {
//   const col = active ? ACTIVE_COLOR : inactiveColor;
//   return (
//     <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//       <Ionicons name={active ? 'heart' : 'heart-outline'} size={19} color={col} />
//       <Ionicons name={active ? 'heart' : 'heart-outline'} size={19} color={col} style={{ marginLeft: -8 }} />
//     </View>
//   );
// }

// // Chat bubbles icon inside the center circle
// function ChatBubblesIcon() {
//   return <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />;
// }

// function UnreadBadge({ count }: { count: number }) {
//   if (count <= 0) return null;
//   const label = count > 99 ? '99+' : String(count);
//   return (
//     <View style={styles.badge}>
//       <Text style={styles.badgeText}>{label}</Text>
//     </View>
//   );
// }

// // ---------------------------------------------------------------------------
// // Main component
// // ---------------------------------------------------------------------------
// export default function AppTabBar({ state, descriptors: _d, navigation, activeTab }: AppTabBarProps) {
//   const { bottom } = useSafeAreaInsets();
//   const { colors: th } = useTheme();
//   const router = useRouter();
//   const userId = useCurrentUserId();

//   // Keep inbox fresh so the unread badge is always up to date
//   useInboxChannel(userId, 'ALL');
//   const { items: inboxItems } = useInbox('ALL');
//   const unreadCount = useMemo(
//     () => inboxItems.reduce((sum, item) => sum + (item.unreadCount ?? 0), 0),
//     [inboxItems],
//   );
//   const barBackground = th.background;
//   const wrapperBg = th.background;
//   const barBorder = th.border;
//   const centerOuterBg = th.background;
//   const centerOuterBorder = th.border;
//   const inactiveColor = th.textMuted;

//   // Standalone mode: use activeTab prop and manual navigation
//   const isStandalone = activeTab !== undefined;
//   const routes = isStandalone
//     ? [
//         { key: 'index', name: 'index' },
//         { key: 'matches', name: 'matches' },
//         { key: 'messages', name: 'messages' },
//         { key: 'likes', name: 'likes' },
//         { key: 'profile', name: 'profile' },
//       ]
//     : state!.routes;
//   const focusedIndex = isStandalone
//     ? routes.findIndex((r) => r.name === activeTab)
//     : state!.index;

//   return (
//     <View style={[styles.wrapper, isStandalone && styles.wrapperAbsolute, { paddingBottom: Math.max(bottom, 10), backgroundColor: wrapperBg }]}>
//       <View style={[styles.bar, { backgroundColor: barBackground, borderColor: barBorder }]}>
//         {routes.map((route, index) => {
//           const isFocused = focusedIndex === index;
//           const isCenter  = route.name === CENTER;

//           const onPress = () => {
//             if (isStandalone) {
//               const routeMap: Record<string, string> = {
//                 index: '/(app)/(tabs)/',
//                 matches: '/(app)/(tabs)/matches',
//                 messages: '/(app)/(tabs)/messages',
//                 likes: '/(app)/(tabs)/likes',
//                 profile: '/(app)/(tabs)/profile',
//               };
//               router?.navigate(routeMap[route.name] as any);
//             } else {
//               const event = navigation!.emit({
//                 type: 'tabPress',
//                 target: route.key,
//                 canPreventDefault: true,
//               });
//               if (!isFocused && !event.defaultPrevented) {
//                 navigation!.navigate(route.name, route.params);
//               }
//             }
//           };

//           // ── Center button (Messages) ──────────────────────────────────────
//           if (isCenter) {
//             return (
//               <TouchableOpacity
//                 key={route.key}
//                 style={styles.centerWrap}
//                 onPress={onPress}
//                 activeOpacity={0.85}
//                 accessibilityRole="button"
//                 accessibilityLabel="Go to Messages"
//               >
//                 <View style={[styles.centerOuter, { backgroundColor: centerOuterBg, borderColor: centerOuterBorder }]}>
//                   <View style={styles.centerCircle}>
//                     <ChatBubblesIcon />
//                     <UnreadBadge count={unreadCount} />
//                   </View>
//                 </View>
//               </TouchableOpacity>
//             );
//           }

//           // ── Regular tabs ─────────────────────────────────────────────────
//           const iconColor = isFocused ? ACTIVE_COLOR : inactiveColor;

//           return (
//             <TouchableOpacity
//               key={route.key}
//               style={styles.tab}
//               onPress={onPress}
//               activeOpacity={0.75}
//               accessibilityRole="button"
//               accessibilityLabel={`Go to ${LABELS[route.name] ?? route.name}`}
//             >
//               <View style={styles.iconWrap}>
//                 {route.name === 'matches' ? (
//                   <MatchesIcon active={isFocused} inactiveColor={inactiveColor} />
//                 ) : (
//                   <Ionicons
//                     name={tabIcon(route.name, isFocused)}
//                     size={23}
//                     color={iconColor}
//                   />
//                 )}
//               </View>

//               <Text style={[styles.label, { color: inactiveColor }, isFocused && styles.labelActive]}>
//                 {LABELS[route.name] ?? ''}
//               </Text>

//               {isFocused && <View style={styles.underline} />}
//             </TouchableOpacity>
//           );
//         })}
//       </View>
//     </View>
//   );
// }

// // ---------------------------------------------------------------------------
// const styles = StyleSheet.create({
//   wrapper: {
//     width: '100%',
//     paddingTop: 12,
//     backgroundColor: 'transparent',
//     overflow: 'visible',
//   },
//   wrapperAbsolute: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     zIndex: 50,
//   },
//   bar: {
//     height: BAR_H,
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: colors.background,
//     borderTopLeftRadius: 24,
//     borderTopRightRadius: 24,
//     borderTopWidth: 1,
//     overflow: 'visible',
//   },
//   tab: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 3,
//     height: BAR_H,
//     position: 'relative',
//   },
//   iconWrap: {
//     height: 26,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   label: {
//     fontSize: 11,
//     fontWeight: '500',
//   },
//   labelActive: {
//     color: ACTIVE_COLOR,
//     fontWeight: '700',
//   },
//   underline: {
//     position: 'absolute',
//     bottom: 7,
//     width: 22,
//     height: 3,
//     borderRadius: 2,
//     backgroundColor: ACTIVE_COLOR,
//   },
//   centerWrap: {
//     width: C + 24,
//     alignItems: 'center',
//     justifyContent: 'center',
//     height: BAR_H,
//   },
//   centerOuter: {
//     width: C + 20,
//     height: C + 20,
//     borderRadius: (C + 20) / 2,
//     backgroundColor: colors.background,
//     borderWidth: 2,
//     borderColor: colors.border,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   centerCircle: {
//     width: C,
//     height: C,
//     borderRadius: C / 2,
//     backgroundColor: colors.primary,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: colors.primary,
//     shadowOpacity: 0.65,
//     shadowRadius: 18,
//     shadowOffset: { width: 0, height: 8 },
//     elevation: 14,
//   },
//   badge: {
//     position: 'absolute',
//     top: -2,
//     right: -2,
//     minWidth: 18,
//     height: 18,
//     borderRadius: 9,
//     backgroundColor: '#EF4444',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingHorizontal: 4,
//     borderWidth: 1.5,
//     borderColor: '#FFFFFF',
//   },
//   badgeText: {
//     color: '#FFFFFF',
//     fontSize: 10,
//     fontWeight: '800',
//     lineHeight: 12,
//   },
// });


import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useCurrentUserId } from '@/hooks/auth/useCurrentUserId';
import { useInbox } from '@/hooks/messages/useInbox';
import { useInboxChannel } from '@/hooks/messages/useInboxChannel';
import { useTheme } from '@/hooks/use-theme';

// ---------------------------------------------------------------------------
// Type mirrors of what Expo Router passes to tabBar
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
  // Expo Router tab navigation props (required when used in Tabs)
  state?: { routes: TabRoute[]; index: number };
  descriptors?: Record<string, TabDescriptor>;
  navigation?: TabNavigation;
  // Standalone mode (when used outside Tabs)
  activeTab?: string;
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
const CENTER       = 'messages';
const BAR_H        = 64;
const C            = 38;   // center circle diameter

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(routeName: string, active: boolean): IoniconName {
  switch (routeName) {
    case 'index':   return active ? 'home'           : 'home-outline';
    case 'matches': return active ? 'heart-circle'   : 'heart-circle-outline';
    case 'likes':   return active ? 'heart'          : 'heart-outline';
    case 'profile': return active ? 'person'         : 'person-outline';
    default:        return 'ellipse-outline';
  }
}

function MatchesIcon({ active, inactiveColor }: { active: boolean; inactiveColor: string }) {
  return (
    <MaterialCommunityIcons
      name={active ? 'heart-multiple' : 'heart-multiple-outline'}
      size={24}
      color={active ? ACTIVE_COLOR : inactiveColor}
    />
  );
}

function ChatBubblesIcon() {
  return <Ionicons name="chatbubbles" size={22} color="#fff" />;
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AppTabBar({ state, descriptors: _d, navigation, activeTab }: AppTabBarProps) {
  const { bottom } = useSafeAreaInsets();
  const { colors: th, mode } = useTheme();
  const router = useRouter();
  const userId = useCurrentUserId();

  // Keep inbox fresh so the unread badge is always up to date
  useInboxChannel(userId, 'ALL');
  const { items: inboxItems } = useInbox('ALL');
  const unreadCount = useMemo(
    () => inboxItems.reduce((sum, item) => sum + (item.unreadCount ?? 0), 0),
    [inboxItems],
  );

  const isDark = mode === 'dark';

  // Bar bg matches the parent/screen background — full integration
  const barBg            = th.background;
  const separatorColor   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const inactiveColor    = isDark ? '#64748B' : '#9CA3AF';
  const activeColor      = isDark ? '#A78BFA' : ACTIVE_COLOR; // slightly lighter tint in dark
  // Center outer ring blends seamlessly with background
  const centerOuterBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  // Standalone mode: use activeTab prop and manual navigation
  const isStandalone = activeTab !== undefined;
  const routes = isStandalone
    ? [
        { key: 'index',    name: 'index' },
        { key: 'matches',  name: 'matches' },
        { key: 'messages', name: 'messages' },
        { key: 'likes',    name: 'likes' },
        { key: 'profile',  name: 'profile' },
      ]
    : state!.routes;
  const focusedIndex = isStandalone
    ? routes.findIndex((r) => r.name === activeTab)
    : state!.index;

  return (
    <View
      style={[
        styles.wrapper,
        isStandalone && styles.wrapperAbsolute,
        { paddingBottom: Math.max(bottom, 10), backgroundColor: barBg },
      ]}
    >
      {/* Hairline separator — replaces the pill contrast for full-width layout */}
      <View style={[styles.separator, { backgroundColor: separatorColor }]} />

      <View style={[styles.bar, { backgroundColor: barBg }]}>
        {routes.map((route, index) => {
          const isFocused = focusedIndex === index;
          const isCenter  = route.name === CENTER;

          const onPress = () => {
            if (isStandalone) {
              const routeMap: Record<string, string> = {
                index:    '/(app)/(tabs)/',
                matches:  '/(app)/(tabs)/matches',
                messages: '/(app)/(tabs)/messages',
                likes:    '/(app)/(tabs)/likes',
                profile:  '/(app)/(tabs)/profile',
              };
              router?.navigate(routeMap[route.name] as any);
            } else {
              const event = navigation!.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation!.navigate(route.name, route.params);
              }
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
                {/* Outer ring provides visual separation from content above */}
                <View
                  style={[
                    styles.centerOuter,
                    { backgroundColor: barBg, borderColor: centerOuterBorder },
                  ]}
                >
                  <View style={styles.centerCircle}>
                    <ChatBubblesIcon />
                    <UnreadBadge count={unreadCount} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          // ── Regular tabs ─────────────────────────────────────────────────
          const iconColor = isFocused ? activeColor : inactiveColor;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={onPress}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Go to ${LABELS[route.name] ?? route.name}`}
            >
              {/* Top pill indicator — modern alternative to underline for flat bars */}
              {isFocused && (
                <View style={[styles.activeIndicator, { backgroundColor: activeColor }]} />
              )}

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

              <Text
                style={[
                  styles.label,
                  { color: inactiveColor },
                  isFocused && { color: activeColor, fontWeight: '700' },
                ]}
              >
                {LABELS[route.name] ?? ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  wrapper: {
    // No horizontal padding — full width
    overflow: 'visible',
  },
  wrapperAbsolute: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  // Single hairline at the top replaces the pill container's visual edge
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
  // Top-edge pill replaces the bottom underline — feels at home on a flat bar
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
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
});
