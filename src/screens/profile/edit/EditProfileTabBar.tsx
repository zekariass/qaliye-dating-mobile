import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';
import i18n from '@/i18n';

export type TabKey = 'bio' | 'details' | 'photo' | 'lifestyle' | 'preferences' | 'location' | 'visibility';

type TabDef = {
  key: TabKey;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

const TABS: TabDef[] = [
  { key: 'bio', label: i18n.t('profile.editTabs.bio'), icon: 'reader-outline' },
  { key: 'details', label: i18n.t('profile.editTabs.details'), icon: 'person-outline' },
  { key: 'photo', label: i18n.t('profile.editTabs.photos'), icon: 'images-outline' },
  { key: 'lifestyle', label: i18n.t('profile.editTabs.lifestyle'), icon: 'git-network-outline' },
  { key: 'preferences', label: i18n.t('profile.editTabs.preferences'), icon: 'options-outline' },
  { key: 'location', label: i18n.t('profile.editTabs.location'), icon: 'location-outline' },
  { key: 'visibility', label: i18n.t('profile.editTabs.visibility'), icon: 'eye-outline' },
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
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 20,
    minHeight: 34,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  labelActive: {
    fontWeight: '700',
  },
});
