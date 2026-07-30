import { Ionicons } from '@expo/vector-icons';
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

const TAB_ICONS: Record<ProfileTab, React.ComponentProps<typeof Ionicons>['name']> = {
  Details: 'information-circle-outline',
  Bio: 'document-text-outline',
  Photo: 'images-outline',
  Lifestyle: 'sparkles-outline',
  Status: 'pulse-outline',
  Preferences: 'options-outline',
};

interface ProfileTabBarProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

export default function ProfileTabBar({ activeTab, onTabChange }: ProfileTabBarProps) {
  const scrollRef = useRef<ScrollView>(null);
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const handlePress = useCallback(
    (tab: ProfileTab) => {
      onTabChange(tab);
    },
    [onTabChange],
  );

  return (
    <View style={[styles.wrapper, { backgroundColor: th.background }]}>
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
              style={[
                styles.tab,
                isActive && [
                  styles.tabActive,
                  {
                    backgroundColor: isDark ? th.backgroundSelected : '#F3EEFF',
                    borderColor: isDark ? 'rgba(138,44,255,0.3)' : 'rgba(138,44,255,0.15)',
                  },
                ],
              ]}
              onPress={() => handlePress(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab}
            >
              <Ionicons
                name={TAB_ICONS[tab]}
                size={15}
                color={isActive ? colors.primary : th.textMuted}
                style={styles.tabIcon}
              />
              <Text
                style={[
                  styles.label,
                  { color: isActive ? colors.primary : th.textMuted },
                  isActive && styles.labelActive,
                ]}
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
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    borderWidth: 1,
  },
  tabIcon: {
    marginRight: 6,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelActive: {
    fontWeight: '800',
  },
});
