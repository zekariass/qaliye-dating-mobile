import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import { useDeletePhoto, useRegisterPhoto, useReorderPhotos } from '@/hooks/profile/useProfilePhotos';
import { useUpdateProfilePreferences } from '@/hooks/profile/useProfilePreferences';
import { useUpdateProfile } from '@/hooks/profile/useUpdateProfile';
import { useUpdateProfileLocation } from '@/hooks/profile/useUpdateProfileLocation';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import {
    mapApiPrefsToDiscoveryPrefDraft,
    mapDiscoveryPrefDraftToUpdateRequest,
    mapEditDraftToUpdateRequest,
    mapProfileMeDtoToEditDraft,
} from '@/utils/profileMappers';
import { EditBioTab } from './edit/EditBioTab';
import { EditDetailsTab } from './edit/EditDetailsTab';
import { EditProfileHeader } from './edit/EditProfileHeader';
import { EditProfileTabBar, type TabKey } from './edit/EditProfileTabBar';
import { LifestyleTab } from './edit/LifestyleTab';
import { LocationTab } from './edit/LocationTab';
import { PhotosTabReal } from './edit/PhotosTabReal';
import { PreferencesTab } from './edit/PreferencesTab';
import { ProfileCompletionBar } from './edit/ProfileCompletionBar';
import {
    type DiscoveryPrefDraft,
    type EditProfileDraft,
} from './mockEditProfile';

export default function EditProfileScreen() {
  const { sem } = useSemanticTheme();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>('bio');
  const [draft, setDraft] = useState<EditProfileDraft | null>(null);
  const [prefs, setPrefs] = useState<DiscoveryPrefDraft | null>(null);

  // ─── Data fetching ────────────────────────────────────────────────────
  const { data: profileDto, isLoading, isError, error } = useCurrentProfile();

  // ─── Mutations ────────────────────────────────────────────────────────
  const updateProfileMutation = useUpdateProfile();
  const updatePrefsMutation = useUpdateProfilePreferences();
  const updateLocationMutation = useUpdateProfileLocation();
  const registerPhotoMutation = useRegisterPhoto();
  const reorderPhotosMutation = useReorderPhotos();
  const deletePhotoMutation = useDeletePhoto();

  // ─── Initialise form state from API data ──────────────────────────────
  useEffect(() => {
    if (profileDto && !draft) {
      setDraft(mapProfileMeDtoToEditDraft(profileDto));
      setPrefs(mapApiPrefsToDiscoveryPrefDraft(profileDto.discovery_preferences, profileDto.discovery_mode, profileDto.gender));
    }
  }, [profileDto, draft]);

  const completionPercent = profileDto?.profile_completion_score ?? 0;
  const apiPhotos = useMemo(() => profileDto?.photos ?? [], [profileDto]);

  // ─── Draft field updater ──────────────────────────────────────────────
  const handleChange = useCallback((path: string, value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const parts = path.split('.');
      if (parts.length !== 2) return prev;
      const [section, field] = parts as [keyof EditProfileDraft, string];
      return {
        ...prev,
        [section]: {
          ...(prev[section] as Record<string, unknown>),
          [field]: value,
        },
      };
    });
  }, []);

  // ─── Array toggle (interests, languages) ──────────────────────────────
  const handleToggleArrayItem = useCallback((path: string, value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const parts = path.split('.');
      if (parts.length !== 2) return prev;
      const [section, field] = parts as [keyof EditProfileDraft, string];
      const current = (prev[section] as Record<string, unknown>)[field] as string[];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return {
        ...prev,
        [section]: {
          ...(prev[section] as Record<string, unknown>),
          [field]: updated,
        },
      };
    });
  }, []);

  // ─── Preferences updater ──────────────────────────────────────────────
  const handlePrefsChange = useCallback((update: Partial<DiscoveryPrefDraft>) => {
    setPrefs((prev) => (prev ? { ...prev, ...update } : prev));
  }, []);

  const handlePrefsReset = useCallback(() => {
    if (profileDto) {
      setPrefs(mapApiPrefsToDiscoveryPrefDraft(profileDto.discovery_preferences, profileDto.discovery_mode, profileDto.gender));
    }
  }, [profileDto]);

  // ─── Save profile fields (bio + details + lifestyle) ──────────────────
  const handleSave = useCallback(async () => {
    if (!draft) return;
    try {
      const payload = mapEditDraftToUpdateRequest(draft);
      await updateProfileMutation.mutateAsync(payload);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (err: unknown) {
      Alert.alert('Error', (err as Error)?.message ?? 'Failed to save profile.');
    }
  }, [draft, updateProfileMutation]);

  // ─── Save preferences ─────────────────────────────────────────────────
  const handleSavePrefs = useCallback(async () => {
    if (!prefs) return;
    try {
      const payload = mapDiscoveryPrefDraftToUpdateRequest(prefs);
      await updatePrefsMutation.mutateAsync(payload);
      await updateProfileMutation.mutateAsync({ discovery_mode: prefs.discoveryMode });
      Alert.alert('Saved', 'Your preferences have been updated.');
    } catch (err: unknown) {
      Alert.alert('Error', (err as Error)?.message ?? 'Failed to save preferences.');
    }
  }, [prefs, updatePrefsMutation, updateProfileMutation]);

  // ─── Photo operations ─────────────────────────────────────────────────
  const handleRegisterPhoto = useCallback(
    async (
      storageBucket: string,
      storagePath: string,
      photoOrder: number,
      isPrimary: boolean,
    ) => {
      await registerPhotoMutation.mutateAsync({
        storage_bucket: storageBucket,
        storage_path: storagePath,
        photo_order: photoOrder,
        is_primary: isPrimary,
      });
    },
    [registerPhotoMutation],
  );

  const handleReorderPhotos = useCallback(
    async (items: Array<{ id: string; photo_order: number; is_primary: boolean }>) => {
      await reorderPhotosMutation.mutateAsync({ photos: items });
    },
    [reorderPhotosMutation],
  );

  const handleDeletePhoto = useCallback(
    async (photoId: string) => {
      await deletePhotoMutation.mutateAsync(photoId);
    },
    [deletePhotoMutation],
  );

  // ─── Save location ──────────────────────────────────────────────────
  const handleSaveLocation = useCallback(
    async (payload: Parameters<typeof updateLocationMutation.mutateAsync>[0]) => {
      try {
        await updateLocationMutation.mutateAsync(payload);
        Alert.alert('Saved', 'Your location has been updated.');
      } catch (err: unknown) {
        Alert.alert('Error', (err as Error)?.message ?? 'Failed to save location.');
      }
    },
    [updateLocationMutation],
  );

  const isSaving = updateProfileMutation.isPending;
  const isPhotoMutating =
    registerPhotoMutation.isPending ||
    reorderPhotosMutation.isPending ||
    deletePhotoMutation.isPending;

  // ─── Loading state ────────────────────────────────────────────────────
  if (isLoading || !draft || !prefs) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: sem.bg, paddingTop: safeTop }}
      >
        <ActivityIndicator size="large" color={sem.accent} />
      </View>
    );
  }

  if (isError) {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: sem.bg, paddingTop: safeTop }}
      >
        <Text className="text-sm text-center" style={{ color: sem.textSecondary }}>
          {(error as Error)?.message ?? 'Failed to load profile. Please try again.'}
        </Text>
      </View>
    );
  }

  // ─── Const aliases so TypeScript preserves narrowed types inside renderTab ──
  const currentDraft: EditProfileDraft = draft;
  const currentPrefs: DiscoveryPrefDraft = prefs;

  // ─── Render active tab ────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case 'bio':
        return <EditBioTab draft={currentDraft} onChange={handleChange} sem={sem} />;
      case 'details':
        return (
          <EditDetailsTab
            draft={currentDraft}
            onChange={handleChange}
            sem={sem}
            discoveryMode={currentPrefs.discoveryMode}
            onDiscoveryModeChange={(mode) => handlePrefsChange({ discoveryMode: mode })}
          />
        );
      case 'photo':
        return (
          <PhotosTabReal
            photos={apiPhotos}
            isOnboarded={profileDto?.is_onboarded ?? false}
            isVerified={profileDto?.is_verified ?? false}
            sem={sem}
            onRegisterPhoto={handleRegisterPhoto}
            onReorderPhotos={handleReorderPhotos}
            onDeletePhoto={handleDeletePhoto}
            isUploading={isPhotoMutating}
          />
        );
      case 'lifestyle':
        return (
          <LifestyleTab
            draft={currentDraft}
            onChange={handleChange}
            onToggleArrayItem={handleToggleArrayItem}
            sem={sem}
          />
        );
      case 'location':
        return (
          <LocationTab
            currentFormattedAddress={
              profileDto?.address?.formatted_address ||
              [profileDto?.address?.city, profileDto?.address?.country_name]
                .filter(Boolean)
                .join(', ') ||
              null
            }
            sem={sem}
            onSave={handleSaveLocation}
            isSaving={updateLocationMutation.isPending}
          />
        );
      case 'preferences':
        return (
          <PreferencesTab
            prefs={currentPrefs}
            onPrefsChange={handlePrefsChange}
            onReset={handlePrefsReset}
            onSave={handleSavePrefs}
            isSaving={updatePrefsMutation.isPending || updateProfileMutation.isPending}
            userGender={profileDto?.gender}
            sem={sem}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: sem.bg, paddingTop: safeTop }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <EditProfileHeader sem={sem} onSave={handleSave} isSaving={isSaving} />
        <ProfileCompletionBar percent={completionPercent} sem={sem} />
        <EditProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} sem={sem} />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: safeBottom + 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderTab()}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
