import { memo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { type SemanticTheme } from '@/constants/semantic-colors';

type Props = {
  percent: number;
  sem: SemanticTheme;
};

const SEGMENT_COUNT = 5;

export const ProfileCompletionBar = memo(function ProfileCompletionBar({ percent, sem }: Props) {
  const { t } = useTranslation();
  const filledSegments = Math.round((percent / 100) * SEGMENT_COUNT);

  return (
    <View
      className="px-5 pb-3 pt-1"
      accessibilityLabel={t('profile.completion.accessLabel', { percent })}
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
        <Text className="text-sm" style={{ color: sem.textMuted }}>
          {t('profile.completion.label')}{' '}
        </Text>
        <Text className="text-sm font-bold" style={{ color: sem.accent }}>
          {t('profile.completion.percent', { percent })}
        </Text>
      </View>
    </View>
  );
});
