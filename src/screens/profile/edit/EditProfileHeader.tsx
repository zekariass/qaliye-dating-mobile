import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';

type Props = {
  sem: SemanticTheme;
  onSave: () => void;
};

export const EditProfileHeader = memo(function EditProfileHeader({ sem, onSave }: Props) {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      console.log('Go back');
    }
  };

  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <Pressable
        onPress={handleBack}
        className="w-10 h-10 items-center justify-center rounded-full"
        style={{ backgroundColor: sem.surfaceMuted }}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        {({ pressed }) => (
          <Ionicons
            name="arrow-back"
            size={20}
            color={pressed ? sem.accent : sem.textPrimary}
          />
        )}
      </Pressable>

      <Text className="text-lg font-bold" style={{ color: sem.textPrimary }}>
        Edit Profile
      </Text>

      <Pressable
        onPress={onSave}
        className="px-4 py-2 rounded-full"
        accessibilityLabel="Save profile changes"
        accessibilityRole="button"
      >
        {({ pressed }) => (
          <Text
            className="text-base font-bold"
            style={{ color: pressed ? sem.accentStrong : sem.accent }}
          >
            Save
          </Text>
        )}
      </Pressable>
    </View>
  );
});
