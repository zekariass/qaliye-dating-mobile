import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';

export type TabKey = 'bio' | 'details' | 'photo' | 'lifestyle' | 'preferences' | 'location' | 'visibility';

type TabDef = {
  key: TabKey;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

const TABS: TabDef[] = [
  { key: 'bio', label: 'Bio', icon: 'reader-outline' },
  { key: 'details', label: 'Details', icon: 'person-outline' },
  { key: 'photo', label: 'Photos', icon: 'images-outline' },
  { key: 'lifestyle', label: 'Lifestyle', icon: 'git-network-outline' },
  { key: 'preferences', label: 'Preferences', icon: 'options-outline' },
  { key: 'location', label: 'Location', icon: 'location-outline' },
  { key: 'visibility', label: 'Visibility', icon: 'eye-outline' },
];

type Props = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  sem: SemanticTheme;
};

export const EditProfileTabBar = memo(function EditProfileTabBar({ activeTab, onTabChange, sem }: Props) {
  return (
    <View style={[styles.wrapper, { borderBottomColor: sem.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onTabChange(tab.key)}
              style={[
                styles.tab,
                { backgroundColor: isActive ? sem.accentSoft : 'transparent' },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <Ionicons
                name={isActive ? (tab.icon.replace('-outline', '') as typeof tab.icon) : tab.icon}
                size={18}
                color={isActive ? sem.accent : sem.textMuted}
              />
              <Text
                style={[
                  styles.label,
                  { color: isActive ? sem.accent : sem.textMuted },
                  isActive && styles.labelActive,
                ]}
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

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    minHeight: 38,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  labelActive: {
    fontWeight: '700',
  },
});
