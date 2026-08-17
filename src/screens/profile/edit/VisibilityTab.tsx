import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { themedAlert } from '@/components/common/ThemedAlert';
import { type SemanticTheme } from '@/constants/semantic-colors';
import { SectionCard, SectionTitle } from './FormComponents';

type Props = {
  sem: SemanticTheme;
  discoveryMode: 'PUBLIC' | 'INCOGNITO';
  onDiscoveryModeChange: (mode: 'PUBLIC' | 'INCOGNITO') => void;
  incognitoEnabled: boolean;
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
  incognitoEnabled,
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
            const isLocked = mode === 'INCOGNITO' && !incognitoEnabled;
            return (
              <Pressable
                key={mode}
                onPress={() => {
                  if (isLocked) {
                    themedAlert({
                      title: 'Premium Feature',
                      message: 'Incognito mode is available with a premium subscription. Upgrade to hide your profile from discovery.',
                      icon: 'diamond-outline',
                      iconColor: '#F59E0B',
                      buttons: [
                        { text: 'Not now', style: 'cancel' },
                        { text: 'Upgrade', onPress: () => router.push('/(app)/premium') },
                      ],
                    });
                  } else {
                    onDiscoveryModeChange(mode);
                  }
                }}
                className="flex-1 flex-row items-center justify-center py-3 gap-1.5"
                style={{
                  backgroundColor: isActive ? sem.accentSoft : 'transparent',
                  borderWidth: isActive ? 1 : 0,
                  borderColor: isActive ? sem.accent : 'transparent',
                  borderRadius: isActive ? 10 : 0,
                  opacity: isLocked ? 0.5 : 1,
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={MODE_LABELS[mode]}
              >
                <Ionicons name={isLocked ? 'lock-closed-outline' : MODE_ICONS[mode]} size={16} color={isActive ? sem.accent : sem.textMuted} />
                <Text className="text-sm font-semibold" style={{ color: isActive ? sem.accent : sem.textMuted }}>
                  {MODE_LABELS[mode]}
                </Text>
                {isLocked && (
                  <Ionicons name="diamond-outline" size={13} color="#F59E0B" />
                )}
              </Pressable>
            );
          })}
        </View>
        {discoveryMode === 'INCOGNITO' && !incognitoEnabled ? (
          <Text className="text-sm mt-2 mb-1" style={{ color: '#F59E0B' }}>
            Private is a premium feature. Upgrade to unlock.
          </Text>
        ) : (
          <View className="mt-2 gap-1">
            <Text className="text-sm" style={{ color: sem.textMuted }}>
              {MODE_HELPERS.PUBLIC}
            </Text>
            <Text className="text-sm" style={{ color: sem.textMuted }}>
              {MODE_HELPERS.INCOGNITO}
            </Text>
          </View>
        )}
      </SectionCard>
    </View>
  );
});
