import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
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
import type { EthnicityOption, LanguageOption } from '@/types/catalog';
import { isInsufficientCreditsError } from '@/utils/entitlements';
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
import { VisibilityTab } from './edit/VisibilityTab';
import {
    type DiscoveryPrefDraft,
    type EditProfileDraft,
} from './mockEditProfile';

// Tabs whose edits go through handleSave (shared profile mutation)
const PROFILE_SAVE_TABS: readonly TabKey[] = ['bio', 'details', 'lifestyle', 'visibility'];

export default function EditProfileScreen() {
  const { sem } = useSemanticTheme();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();
  const { entitlements } = useEntitlements();

  const [activeTab, setActiveTab] = useState<TabKey>('bio');
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [draft, setDraft] = useState<EditProfileDraft | null>(null);
  const [prefs, setPrefs] = useState<DiscoveryPrefDraft | null>(null);

  // ─── Dirty-state tracking refs ────────────────────────────────────────
  // savedDraftRef = last server-synced state (updated on load and after save)
  const savedDraftRef = useRef<EditProfileDraft | null>(null);
  const savedPrefsRef = useRef<DiscoveryPrefDraft | null>(null);
  // draftRef/prefsRef mirror current state so we can read it inside callbacks without stale closures
  const draftRef = useRef<EditProfileDraft | null>(draft);
  const prefsRef = useRef<DiscoveryPrefDraft | null>(prefs);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  // ─── Data fetching ────────────────────────────────────────────────────
  const { data: profileDto, isLoading, isError, error } = useCurrentProfile();

  // ─── Mutations ────────────────────────────────────────────────────────
  const updateProfileMutation = useUpdateProfile();
  const updatePrefsMutation = useUpdateProfilePreferences();
  const updateLocationMutation = useUpdateProfileLocation();
  const registerPhotoMutation = useRegisterPhoto();
  const reorderPhotosMutation = useReorderPhotos();
  const deletePhotoMutation = useDeletePhoto();

  // ─── Track keyboard height for dynamic bottom padding ────────────────
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });
    const showSubAndroid = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSubAndroid = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
      showSubAndroid.remove();
      hideSubAndroid.remove();
    };
  }, []);

  // ─── Initialise form state from API data ──────────────────────────────
  const [draftVersion, setDraftVersion] = useState(0);

  useEffect(() => {
    if (profileDto && !draft) {
      if (__DEV__) console.log('[EditProfileScreen] user_id:', profileDto.user_id);
      const initial = mapProfileMeDtoToEditDraft(profileDto);
      setDraft(initial);
      savedDraftRef.current = initial;
      const initialPrefs = mapApiPrefsToDiscoveryPrefDraft(profileDto.discovery_preferences, profileDto.discovery_mode, profileDto.gender);
      setPrefs(initialPrefs);
      savedPrefsRef.current = initialPrefs;
    }
  }, [profileDto, draft]);

  // Re-sync draft from server after a successful save (draftVersion bump)
  useEffect(() => {
    if (profileDto && draftVersion > 0) {
      const synced = mapProfileMeDtoToEditDraft(profileDto);
      setDraft(synced);
      savedDraftRef.current = synced;
      const syncedPrefs = mapApiPrefsToDiscoveryPrefDraft(profileDto.discovery_preferences, profileDto.discovery_mode, profileDto.gender);
      setPrefs(syncedPrefs);
      savedPrefsRef.current = syncedPrefs;
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
  // Returns true on success so callers can act on the outcome (e.g. tab switch guard).
  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!draft) return false;

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
            return false;
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
      return true;
    } catch (err: unknown) {
      if (isInsufficientCreditsError(err)) return false;
      themedError('Error', (err as Error)?.message ?? 'Failed to save profile.');
      return false;
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
      if (isInsufficientCreditsError(err)) return;
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
        if (isInsufficientCreditsError(err)) return;
        themedError('Error', (err as Error)?.message ?? 'Failed to save location.');
      }
    },
    [updateLocationMutation],
  );

  // ─── Dirty-state detection ────────────────────────────────────────────
  // Returns true if the draft or prefs have uncommitted changes vs. the last saved state.
  const isDraftDirty = useCallback((): boolean => {
    const currentDraft = draftRef.current;
    const savedDraft = savedDraftRef.current;
    const draftDirty = currentDraft && savedDraft
      ? JSON.stringify(currentDraft) !== JSON.stringify(savedDraft)
      : false;
    const currentPrefs = prefsRef.current;
    const savedPrefs = savedPrefsRef.current;
    const prefsDirty = currentPrefs && savedPrefs
      ? JSON.stringify(currentPrefs) !== JSON.stringify(savedPrefs)
      : false;
    return draftDirty || prefsDirty;
  }, []);

  // ─── Tab-change guard ─────────────────────────────────────────────────
  const handleTabChange = useCallback((newTab: TabKey) => {
    if (newTab === activeTab) return;

    // Only guard tabs that share handleSave
    const leavingDirtyTab = PROFILE_SAVE_TABS.includes(activeTab) && isDraftDirty();

    if (!leavingDirtyTab) {
      setActiveTab(newTab);
      return;
    }

    themedAlert({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes in this tab. What would you like to do?',
      icon: 'alert-circle-outline',
      iconColor: '#F59E0B',
      buttons: [
        {
          text: 'Save',
          style: 'default',
          onPress: () => {
            void handleSave().then((saved) => {
              if (saved) setActiveTab(newTab);
            });
          },
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            if (savedDraftRef.current) {
              setDraft(savedDraftRef.current);
            }
            if (savedPrefsRef.current) {
              setPrefs(savedPrefsRef.current);
            }
            setActiveTab(newTab);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    });
  }, [activeTab, isDraftDirty, handleSave]);

  const isSavingProfile = updateProfileMutation.isPending;
  const showSaveButton = PROFILE_SAVE_TABS.includes(activeTab);
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
            scrollRef={scrollRef}
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
      case 'visibility':
        return (
          <VisibilityTab
            sem={sem}
            discoveryMode={currentPrefs.discoveryMode}
            onDiscoveryModeChange={(mode: 'PUBLIC' | 'INCOGNITO') => handlePrefsChange({ discoveryMode: mode })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: sem.bg, paddingTop: safeTop }}>
      <EditProfileHeader sem={sem} />
      <ProfileCompletionBar percent={completionPercent} sem={sem} />
      <EditProfileTabBar activeTab={activeTab} onTabChange={handleTabChange} sem={sem} />

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: showSaveButton
            ? 0  // save button below provides spacing
            : keyboardHeight > 0 ? keyboardHeight + safeBottom + 24 : safeBottom + 24,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentInsetAdjustmentBehavior="automatic"
      >
        {renderTab()}
      </ScrollView>

      {/* ── Per-tab save button (bio / details / lifestyle) ── */}
      {showSaveButton && (
        <View
          style={[
            saveStyles.container,
            {
              borderTopColor: sem.border,
              backgroundColor: sem.bg,
              paddingBottom: safeBottom > 0 ? safeBottom : 16,
            },
          ]}
        >
          <Pressable
            onPress={isSavingProfile ? undefined : handleSave}
            disabled={isSavingProfile}
            style={[
              saveStyles.button,
              { backgroundColor: sem.accent, opacity: isSavingProfile ? 0.75 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Save changes"
          >
            {({ pressed }: { pressed: boolean }) =>
              isSavingProfile ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={[saveStyles.buttonText, { opacity: pressed ? 0.8 : 1 }]}
                >
                  Save Changes
                </Text>
              )
            }
          </Pressable>
        </View>
      )}
    </View>
  );
}

const saveStyles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  button: {
    borderRadius: 9999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
