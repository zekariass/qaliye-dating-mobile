import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';

type Props = {
  sem: SemanticTheme;
  onSave: () => void;
  isSaving?: boolean;
};

export const EditProfileHeader = memo(function EditProfileHeader({ sem, onSave, isSaving = false }: Props) {
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
        disabled={isSaving}
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
        onPress={isSaving ? undefined : onSave}
        className="px-4 py-2 rounded-full min-w-[56px] items-center"
        accessibilityLabel="Save profile changes"
        accessibilityRole="button"
        disabled={isSaving}
      >
        {({ pressed }) =>
          isSaving ? (
            <ActivityIndicator size="small" color={sem.accent} />
          ) : (
            <Text
              className="text-base font-bold"
              style={{ color: pressed ? sem.accentStrong : sem.accent }}
            >
              Save
            </Text>
          )
        }
      </Pressable>
    </View>
  );
});
