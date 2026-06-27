import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';

export type TabKey = 'bio' | 'details' | 'photo' | 'lifestyle' | 'preferences' | 'location';

type TabDef = {
  key: TabKey;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

const TABS: TabDef[] = [
  { key: 'bio', label: 'Bio', icon: 'reader-outline' },
  { key: 'details', label: 'Details', icon: 'person-outline' },
  { key: 'photo', label: 'Photo', icon: 'camera-outline' },
  { key: 'lifestyle', label: 'Lifestyle', icon: 'git-network-outline' },
  { key: 'preferences', label: 'Preferences', icon: 'options-outline' },
  { key: 'location', label: 'Location', icon: 'location-outline' },
];

type Props = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  sem: SemanticTheme;
};

export const EditProfileTabBar = memo(function EditProfileTabBar({ activeTab, onTabChange, sem }: Props) {
  return (
    <View className="px-3 pb-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
      >
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              className="items-center justify-center rounded-2xl px-4 py-3 border"
              style={{
                backgroundColor: isActive ? sem.surface : 'transparent',
                borderColor: isActive ? sem.accent : sem.border,
                borderWidth: isActive ? 1.5 : 1,
                minWidth: 72,
                ...(isActive
                  ? {
                      shadowColor: sem.accent,
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 3 },
                      elevation: 4,
                    }
                  : {}),
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <Ionicons
                name={tab.icon}
                size={20}
                color={isActive ? sem.accent : sem.textMuted}
              />
              <Text
                className="text-xs font-semibold mt-1"
                style={{ color: isActive ? sem.accent : sem.textMuted }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});
