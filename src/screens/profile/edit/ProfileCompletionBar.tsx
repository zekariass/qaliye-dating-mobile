import { memo } from 'react';
import { Text, View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';

type Props = {
  percent: number;
  sem: SemanticTheme;
};

const SEGMENT_COUNT = 5;

export const ProfileCompletionBar = memo(function ProfileCompletionBar({ percent, sem }: Props) {
  const filledSegments = Math.round((percent / 100) * SEGMENT_COUNT);

  return (
    <View
      className="px-5 pb-3 pt-1"
      accessibilityLabel={`Profile completion, ${percent} percent`}
      accessibilityRole="progressbar"
    >
      <View className="flex-row gap-1.5 mb-2">
        {Array.from({ length: SEGMENT_COUNT }).map((_, i) => (
          <View
            key={i}
            className="flex-1 h-2 rounded-full"
            style={{
              backgroundColor: i < filledSegments ? sem.accent : sem.accentSoft,
            }}
          />
        ))}
      </View>
      <View className="flex-row items-center justify-center">
        <Text className="text-xs" style={{ color: sem.textMuted }}>
          Profile completion:{' '}
        </Text>
        <Text className="text-xs font-bold" style={{ color: sem.accent }}>
          {percent}%
        </Text>
      </View>
    </View>
  );
});
