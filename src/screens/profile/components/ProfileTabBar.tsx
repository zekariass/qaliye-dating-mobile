import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const PROFILE_TABS = [
  'Details',
  'Bio',
  'Photo',
  'Lifestyle',
  'Status',
  'Preferences',
] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

const TAB_ICONS: Record<ProfileTab, React.ComponentProps<typeof Ionicons>['name']> = {
  Details: 'information-circle-outline',
  Bio: 'document-text-outline',
  Photo: 'images-outline',
  Lifestyle: 'sparkles-outline',
  Status: 'pulse-outline',
  Preferences: 'options-outline',
};

// Track measured positions of each tab so we can auto-scroll to the active one
const tabLayouts = new Map<ProfileTab, { x: number; width: number }>();

interface ProfileTabBarProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

export default function ProfileTabBar({ activeTab, onTabChange }: ProfileTabBarProps) {
  const scrollRef = useRef<ScrollView>(null);
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  // Auto-scroll the active tab into view on small screens
  const scrollToActiveTab = useCallback((tab: ProfileTab) => {
    const layout = tabLayouts.get(tab);
    if (!layout || !scrollRef.current) return;
    // Add some padding so the tab isn't flush against the edge
    const targetX = Math.max(0, layout.x - 24);
    scrollRef.current.scrollTo({ x: targetX, animated: true });
  }, []);

  // Auto-scroll the active tab into view whenever it changes
  useEffect(() => {
    // Defer to next frame so layout measurements are settled
    const raf = requestAnimationFrame(() => scrollToActiveTab(activeTab));
    return () => cancelAnimationFrame(raf);
  }, [activeTab, scrollToActiveTab]);

  const handlePress = useCallback(
    (tab: ProfileTab) => {
      onTabChange(tab);
      // Defer scroll to next frame so layout is settled
      requestAnimationFrame(() => scrollToActiveTab(tab));
    },
    [onTabChange, scrollToActiveTab],
  );

  const handleTabLayout = useCallback(
    (tab: ProfileTab) => (e: { nativeEvent: { layout: { x: number; width: number } } }) => {
      tabLayouts.set(tab, {
        x: e.nativeEvent.layout.x,
        width: e.nativeEvent.layout.width,
      });
    },
    [],
  );

  return (
    <View style={[styles.wrapper, { backgroundColor: th.background }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        scrollIndicatorInsets={{ right: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {PROFILE_TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <Pressable
              key={tab}
              onLayout={handleTabLayout(tab)}
              style={({ pressed }) => [
                styles.tab,
                isActive && styles.tabActive,
                isActive && {
                  backgroundColor: isDark ? th.backgroundSelected : '#F0E7FF',
                },
                !isActive && pressed && {
                  backgroundColor: isDark ? th.backgroundElement : '#F7F2FF',
                },
              ]}
              onPress={() => handlePress(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab}
            >
              <Ionicons
                name={TAB_ICONS[tab]}
                size={19}
                color={isActive ? colors.primary : th.textMuted}
                style={styles.tabIcon}
              />
              <Text
                style={[
                  styles.label,
                  { color: isActive ? colors.primary : th.textSecondary },
                  isActive && styles.labelActive,
                ]}
                numberOfLines={1}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(138,44,255,0.08)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 2,
    gap: 14,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    minWidth: 90,        // Safe touch target on small screens
    flexShrink: 0,       // Never compress — scroll instead
  },
  tabActive: {
    paddingVertical: 13,
    paddingHorizontal: 22,
  },
  tabIcon: {
    marginRight: 9,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  labelActive: {
    fontWeight: '800',
  },
});
