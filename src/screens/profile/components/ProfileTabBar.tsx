import { useCallback, useRef } from 'react';
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

interface ProfileTabBarProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

export default function ProfileTabBar({ activeTab, onTabChange }: ProfileTabBarProps) {
  const scrollRef = useRef<ScrollView>(null);
  const { colors: th } = useTheme();

  const handlePress = useCallback(
    (tab: ProfileTab) => {
      onTabChange(tab);
    },
    [onTabChange],
  );

  return (
    <View style={[styles.wrapper, { backgroundColor: th.surface }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {PROFILE_TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <Pressable
              key={tab}
              style={styles.tab}
              onPress={() => handlePress(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab}
            >
              <Text style={[styles.label, { color: th.textMuted }, isActive && styles.labelActive]}>
                {tab}
              </Text>
              {isActive && <View style={styles.indicator} />}
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={[styles.bottomBorder, { backgroundColor: th.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 24,
  },
  tab: {
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.primary,
  },
  bottomBorder: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E9DDF8',
  },
});
