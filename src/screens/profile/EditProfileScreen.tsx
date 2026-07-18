import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { themedAlert, themedError, themedSuccess } from '@/components/common/ThemedAlert';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import { useDeletePhoto, useRegisterPhoto, useReorderPhotos } from '@/hooks/profile/useProfilePhotos';
import { useUpdateProfilePreferences } from '@/hooks/profile/useProfilePreferences';
import { useUpdateProfile } from '@/hooks/profile/useUpdateProfile';
import { useUpdateProfileLocation } from '@/hooks/profile/useUpdateProfileLocation';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { isPremiumPlan } from '@/types/billing';
import type { EthnicityOption, LanguageOption } from '@/types/catalog';
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
  const { entitlements } = useEntitlements();
  const canUseIncognito = entitlements?.features?.incognito_mode ?? isPremiumPlan(entitlements?.plan) ?? false;

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
  const [draftVersion, setDraftVersion] = useState(0);

  useEffect(() => {
    if (profileDto && !draft) {
      setDraft(mapProfileMeDtoToEditDraft(profileDto));
      setPrefs(mapApiPrefsToDiscoveryPrefDraft(profileDto.discovery_preferences, profileDto.discovery_mode, profileDto.gender));
    }
  }, [profileDto, draft]);

  // Re-sync draft from server after a successful save (draftVersion bump)
  useEffect(() => {
    if (profileDto && draftVersion > 0) {
      setDraft(mapProfileMeDtoToEditDraft(profileDto));
      setPrefs(mapApiPrefsToDiscoveryPrefDraft(profileDto.discovery_preferences, profileDto.discovery_mode, profileDto.gender));
    }
  }, [draftVersion, profileDto]);

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

  // ─── Catalog item handlers (ethnicities, languages) ──────────────────────
  const handleChangeEthnicities = useCallback((items: EthnicityOption[]) => {
    setDraft((prev) => prev ? { ...prev, personal: { ...prev.personal, ethnicities: items } } : prev);
  }, []);

  const handleChangeLanguages = useCallback((items: LanguageOption[]) => {
    setDraft((prev) => prev ? { ...prev, lifestyle: { ...prev.lifestyle, languages: items } } : prev);
  }, []);

  // ─── Array toggle (interests) ─────────────────────────────────────────────
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

    // Validate user is 18 or older
    const dob = draft.basics.dateOfBirth;
    if (dob) {
      const match = dob.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
      if (match) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const day = parseInt(match[1], 10);
        const monthIdx = months.indexOf(match[2]);
        const year = parseInt(match[3], 10);
        if (monthIdx >= 0) {
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const eighteenthBirthday = new Date(year + 18, monthIdx, day);
          if (eighteenthBirthday > today) {
            themedAlert({
              title: 'Invalid Date of Birth',
              message: 'You must be at least 18 years old to use Qaliye.',
              icon: 'alert-circle',
              iconColor: '#EF4444',
              buttons: [{ text: 'OK', style: 'default' }],
            });
            return;
          }
        }
      }
    }

    try {
      const payload = mapEditDraftToUpdateRequest(draft);
      // Include discovery_mode if prefs are loaded
      if (prefs) {
        payload.discovery_mode = prefs.discoveryMode;
      }
      await updateProfileMutation.mutateAsync(payload);
      setDraftVersion((v) => v + 1);
      themedSuccess('Saved', 'Your profile has been updated.');
    } catch (err: unknown) {
      themedError('Error', (err as Error)?.message ?? 'Failed to save profile.');
    }
  }, [draft, prefs, updateProfileMutation]);

  // ─── Save preferences ─────────────────────────────────────────────────
  const handleSavePrefs = useCallback(async () => {
    if (!prefs) return;
    try {
      const payload = mapDiscoveryPrefDraftToUpdateRequest(prefs);
      await updatePrefsMutation.mutateAsync(payload);
      // Best-effort discovery_mode update — don't fail the whole operation if this errors
      try {
        await updateProfileMutation.mutateAsync({ discovery_mode: prefs.discoveryMode });
      } catch {
        // non-fatal: preferences were saved successfully
      }
      setDraftVersion((v) => v + 1);
      themedSuccess('Saved', 'Your preferences have been updated.');
    } catch (err: unknown) {
      themedError('Error', (err as Error)?.message ?? 'Failed to save preferences.');
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
        setDraftVersion((v) => v + 1);
        themedSuccess('Saved', 'Your location has been updated.');
      } catch (err: unknown) {
        themedError('Error', (err as Error)?.message ?? 'Failed to save location.');
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
        <Text className="text-base text-center" style={{ color: sem.textSecondary }}>
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
            onChangeEthnicities={handleChangeEthnicities}
            sem={sem}
            discoveryMode={currentPrefs.discoveryMode}
            onDiscoveryModeChange={(mode) => handlePrefsChange({ discoveryMode: mode })}
            incognitoEnabled={canUseIncognito}
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
            onChangeLanguages={handleChangeLanguages}
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
          contentContainerStyle={{ padding: 10, paddingBottom: safeBottom + 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderTab()}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
