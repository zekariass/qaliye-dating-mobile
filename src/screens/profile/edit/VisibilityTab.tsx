import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';
import { SectionCard, SectionTitle } from './FormComponents';

type Props = {
  sem: SemanticTheme;
  discoveryMode: 'PUBLIC' | 'INCOGNITO';
  onDiscoveryModeChange: (mode: 'PUBLIC' | 'INCOGNITO') => void;
};

const DISCOVERY_MODES = ['PUBLIC', 'INCOGNITO'] as const;
const MODE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  PUBLIC: 'globe-outline',
  INCOGNITO: 'glasses-outline',
};
const MODE_LABELS: Record<string, string> = { PUBLIC: 'Public', INCOGNITO: 'Private' };
const MODE_HELPERS: Record<string, string> = {
  PUBLIC: 'Public — Your profile is visible in discovery. Others can find and swipe on you.',
  INCOGNITO: 'Private — Your profile is hidden from discovery. You can still swipe, but others won\'t see you.',
};

export const VisibilityTab = memo(function VisibilityTab({
  sem,
  discoveryMode,
  onDiscoveryModeChange,
}: Props) {
  return (
    <View>
      {/* ─── Profile Visibility ─── */}
      <SectionCard sem={sem}>
        <SectionTitle title="Profile Visibility" sem={sem} />

        <Text className="text-sm font-medium mb-1.5" style={{ color: sem.textSecondary }}>
          Discovery mode
        </Text>
        <View
          className="flex-row rounded-xl overflow-hidden border"
          style={{ borderColor: sem.border }}
        >
          {DISCOVERY_MODES.map((mode) => {
            const isActive = discoveryMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => onDiscoveryModeChange(mode)}
                className="flex-1 flex-row items-center justify-center py-3 gap-1.5"
                style={{
                  backgroundColor: isActive ? sem.accentSoft : 'transparent',
                  borderWidth: isActive ? 1 : 0,
                  borderColor: isActive ? sem.accent : 'transparent',
                  borderRadius: isActive ? 10 : 0,
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={MODE_LABELS[mode]}
              >
                <Ionicons name={MODE_ICONS[mode]} size={16} color={isActive ? sem.accent : sem.textMuted} />
                <Text className="text-sm font-semibold" style={{ color: isActive ? sem.accent : sem.textMuted }}>
                  {MODE_LABELS[mode]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View className="mt-2 gap-1">
          <Text className="text-sm" style={{ color: sem.textMuted }}>
            {MODE_HELPERS.PUBLIC}
          </Text>
          <Text className="text-sm" style={{ color: sem.textMuted }}>
            {MODE_HELPERS.INCOGNITO}
          </Text>
        </View>
      </SectionCard>
    </View>
  );
});
