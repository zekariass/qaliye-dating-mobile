import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import {
  computeCompletionPercent,
  type DiscoveryPrefDraft,
  type EditableProfilePhoto,
  type EditProfileDraft,
  INITIAL_DRAFT,
  INITIAL_PREFS,
  MOCK_PHOTOS,
} from './mockEditProfile';
import { BasicsTab } from './edit/BasicsTab';
import { EditProfileHeader } from './edit/EditProfileHeader';
import { type TabKey, EditProfileTabBar } from './edit/EditProfileTabBar';
import { LifestyleTab } from './edit/LifestyleTab';
import { PersonalTab } from './edit/PersonalTab';
import { PhotosTab } from './edit/PhotosTab';
import { PreferencesTab } from './edit/PreferencesTab';
import { ProfileCompletionBar } from './edit/ProfileCompletionBar';

export default function EditProfileScreen() {
  const { sem } = useSemanticTheme();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>('basics');
  const [draft, setDraft] = useState<EditProfileDraft>(INITIAL_DRAFT);
  const [prefs, setPrefs] = useState<DiscoveryPrefDraft>(INITIAL_PREFS);
  const [photos, setPhotos] = useState<EditableProfilePhoto[]>(MOCK_PHOTOS);

  const completionPercent = computeCompletionPercent(draft, prefs, photos.length);

  // ─── Draft field updater ──────────────────────────────────────────────
  const handleChange = useCallback((path: string, value: string) => {
    setDraft((prev) => {
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
    setPrefs((prev) => ({ ...prev, ...update }));
  }, []);

  const handlePrefsReset = useCallback(() => {
    setPrefs(INITIAL_PREFS);
  }, []);

  // ─── Save handler ─────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const payload = { draft, prefs, photos };
    console.log('Save profile (full payload):', JSON.stringify(payload, null, 2));
  }, [draft, prefs, photos]);

  // ─── Render active tab ────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case 'basics':
        return <BasicsTab draft={draft} onChange={handleChange} sem={sem} />;
      case 'personal':
        return <PersonalTab draft={draft} onChange={handleChange} sem={sem} />;
      case 'lifestyle':
        return (
          <LifestyleTab
            draft={draft}
            onChange={handleChange}
            onToggleArrayItem={handleToggleArrayItem}
            sem={sem}
          />
        );
      case 'preferences':
        return (
          <PreferencesTab
            prefs={prefs}
            onPrefsChange={handlePrefsChange}
            onReset={handlePrefsReset}
            sem={sem}
          />
        );
      case 'photos':
        return (
          <PhotosTab
            photos={photos}
            onPhotosChange={setPhotos}
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
        {/* Fixed header area */}
        <EditProfileHeader sem={sem} onSave={handleSave} />
        <ProfileCompletionBar percent={completionPercent} sem={sem} />
        <EditProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} sem={sem} />

        {/* Scrollable tab content */}
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
