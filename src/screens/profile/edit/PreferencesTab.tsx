import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { memo, useCallback } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';

import { CountryMultiSelectPicker } from '@/components/catalog/CountryMultiSelectPicker';
import { EthnicityMultiSelectPicker } from '@/components/catalog/EthnicityMultiSelectPicker';
import { LanguageMultiSelectPicker } from '@/components/catalog/LanguageMultiSelectPicker';
import { type SemanticTheme } from '@/constants/semantic-colors';
import type { EthnicityOption, LanguageOption } from '@/types/catalog';
import {
    type DiscoveryPrefDraft,
    type HasChildrenPref,
    type LocationMode,
    type WantsChildrenPref,
    RELIGION_OPTIONS,
} from '../mockEditProfile';
import { SectionCard, SectionTitle } from './FormComponents';

type Props = {
  prefs: DiscoveryPrefDraft;
  onPrefsChange: (update: Partial<DiscoveryPrefDraft>) => void;
  onReset: () => void;
  onSave: () => void;
  isSaving?: boolean;
  userGender?: string;
  sem: SemanticTheme;
};

const DISTANCE_MARKS = [1, 100, 250, 400, 500];

const LOCATION_MODES: { key: LocationMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'nearby',             label: 'Near Me',          icon: 'locate-outline' },
  { key: 'diaspora',           label: 'Diaspora',         icon: 'earth-outline' },
  { key: 'specific_countries', label: 'Specific',         icon: 'flag-outline' },
  { key: 'anywhere',           label: 'Anywhere',         icon: 'globe-outline' },
];

const HAS_CHILDREN_OPTIONS: { key: HasChildrenPref; label: string }[] = [
  { key: 'any', label: 'Any' },
  { key: 'yes', label: 'Has children' },
  { key: 'no',  label: 'No children' },
];

const WANTS_CHILDREN_OPTIONS: { key: WantsChildrenPref; label: string }[] = [
  { key: 'any',                label: 'Any' },
  { key: 'yes',                label: 'Wants' },
  { key: 'no',                 label: 'Does not want' },
  { key: 'not_sure',           label: 'Not sure' },
  { key: 'open_to_discussion', label: 'Open to discuss' },
];

export const PreferencesTab = memo(function PreferencesTab({ prefs, onPrefsChange, onReset, onSave, isSaving = false, userGender, sem }: Props) {

  const handleToggleReligion = useCallback((val: string) => {
    const current = prefs.religionPreferences;
    const updated = current.includes(val)
      ? current.filter((r) => r !== val)
      : [...current, val];
    onPrefsChange({ religionPreferences: updated });
  }, [prefs.religionPreferences, onPrefsChange]);

  return (
    <View>
      <SectionCard sem={sem}>
        <SectionTitle title="Discovery Preferences" sem={sem} />
        <Text className="text-sm mb-5" style={{ color: sem.textSecondary }}>
          Control who you see and how discovery works.
        </Text>

        {/* ─── Interested In (locked — auto-derived from gender) ─── */}
        <View className="mb-5">
          <View className="flex-row items-center gap-1 mb-1.5">
            <Text className="text-base font-semibold" style={{ color: sem.textPrimary }}>
              Interested in
            </Text>
            <Ionicons name="lock-closed-outline" size={12} color={sem.textMuted} />
          </View>
          <View
            className="flex-row items-center rounded-xl px-3 py-3 border"
            style={{ backgroundColor: sem.surfaceMuted, borderColor: sem.border }}
          >
            <Ionicons
              name={prefs.interestedIn === 'MALE' ? 'male-outline' : 'female-outline'}
              size={16}
              color={sem.accent}
              style={{ marginRight: 8 }}
            />
            <Text className="flex-1 text-base font-medium" style={{ color: sem.textPrimary }}>
              {prefs.interestedIn === 'MALE' ? 'Male' : 'Female'}
            </Text>
            <Text className="text-sm" style={{ color: sem.textMuted }}>Auto</Text>
          </View>
          <Text className="text-sm mt-1.5 ml-1" style={{ color: sem.textMuted }}>
            {userGender
              ? `Set automatically based on your gender (${userGender === 'MALE' ? 'Man' : 'Woman'}).`
              : 'Automatically set based on your profile gender.'}
          </Text>
        </View>

        {/* ─── Location Mode ─── */}
        <View className="mb-5">
          <Text className="text-base font-semibold mb-2" style={{ color: sem.textPrimary }}>
            Where to discover people
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {LOCATION_MODES.map(({ key, label, icon }) => {
              const isActive = prefs.locationMode === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => onPrefsChange({ locationMode: key })}
                  className="flex-row items-center rounded-full px-4 py-2.5 border gap-2"
                  style={{
                    backgroundColor: isActive ? sem.accentSoft : 'transparent',
                    borderColor: isActive ? sem.accent : sem.border,
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={label}
                >
                  <Ionicons name={icon} size={14} color={isActive ? sem.accent : sem.textMuted} />
                  <Text className="text-sm font-semibold" style={{ color: isActive ? sem.accent : sem.textSecondary }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {prefs.locationMode === 'specific_countries' && (
            <View className="mt-3">
              <CountryMultiSelectPicker
                selected={prefs.specificCountryCodes}
                onChange={(codes) => onPrefsChange({ specificCountryCodes: codes })}
                accentColor={sem.accent}
                textColor={sem.textPrimary}
                mutedColor={sem.textMuted}
                borderColor={sem.border}
                surfaceColor={sem.surface}
              />
            </View>
          )}
        </View>

        {/* ─── Age Range ─── */}
        <View className="mb-5">
          <Text className="text-base font-semibold mb-3" style={{ color: sem.textPrimary }}>
            Age range
          </Text>
          <View className="flex-row items-center gap-3">
            <View
              className="px-3 py-2 rounded-lg border min-w-[50px] items-center"
              style={{ borderColor: sem.border }}
            >
              <Text className="text-base font-bold" style={{ color: sem.textPrimary }}>
                {prefs.minAge}
              </Text>
            </View>
            <View className="flex-1">
              <Slider
                minimumValue={18}
                maximumValue={prefs.maxAge - 1}
                value={prefs.minAge}
                step={1}
                onValueChange={(v: number) => onPrefsChange({ minAge: Math.round(v) })}
                minimumTrackTintColor={sem.accent}
                maximumTrackTintColor={sem.accentSoft}
                thumbTintColor={sem.accent}
                accessibilityLabel={`Minimum age: ${prefs.minAge}`}
              />
              <Slider
                minimumValue={prefs.minAge + 1}
                maximumValue={100}
                value={prefs.maxAge}
                step={1}
                onValueChange={(v: number) => onPrefsChange({ maxAge: Math.round(v) })}
                minimumTrackTintColor={sem.accent}
                maximumTrackTintColor={sem.accentSoft}
                thumbTintColor={sem.accent}
                accessibilityLabel={`Maximum age: ${prefs.maxAge}`}
              />
            </View>
            <View
              className="px-3 py-2 rounded-lg border min-w-[50px] items-center"
              style={{ borderColor: sem.border }}
            >
              <Text className="text-base font-bold" style={{ color: sem.textPrimary }}>
                {prefs.maxAge}
              </Text>
            </View>
          </View>
          <View className="flex-row justify-between mt-1 px-1">
            <Text className="text-sm" style={{ color: sem.textMuted }}>Min age</Text>
            <Text className="text-sm" style={{ color: sem.textMuted }}>Max age</Text>
          </View>
        </View>

        {/* ─── Maximum Distance ─── */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-base font-semibold" style={{ color: sem.textPrimary }}>
              Maximum distance
            </Text>
            <Text className="text-base font-bold" style={{ color: sem.accent }}>
              {prefs.maximumDistanceKm} km
            </Text>
          </View>
          <Slider
            minimumValue={1}
            maximumValue={500}
            value={prefs.maximumDistanceKm}
            step={1}
            onValueChange={(v: number) => onPrefsChange({ maximumDistanceKm: Math.round(v) })}
            minimumTrackTintColor={sem.accent}
            maximumTrackTintColor={sem.accentSoft}
            thumbTintColor={sem.accent}
            accessibilityLabel={`Maximum distance: ${prefs.maximumDistanceKm} kilometers`}
          />
          <View className="flex-row justify-between mt-1">
            {DISTANCE_MARKS.map((d) => (
              <Text
                key={d}
                className="text-sm font-medium"
                style={{ color: d === prefs.maximumDistanceKm ? sem.accent : sem.textMuted }}
              >
                {d === 500 ? '500 km' : `${d} km`}
              </Text>
            ))}
          </View>
        </View>

        {/* ─── Toggles ─── */}
        <View className="gap-1 mb-5">
          <ToggleRow
            icon="search-outline"
            label="Expand search when limited"
            helperText="Broaden discovery if few matches found."
            value={prefs.expandSearchWhenLimited}
            onToggle={(v) => onPrefsChange({ expandSearchWhenLimited: v })}
            sem={sem}
          />
          <ToggleRow
            icon="checkmark-circle-outline"
            label="Show verified profiles only"
            helperText="Only show people with a blue check."
            value={prefs.verifiedProfilesOnly}
            onToggle={(v) => onPrefsChange({ verifiedProfilesOnly: v })}
            sem={sem}
          />
        </View>

        {/* ─── Has Children Preference ─── */}
        <View className="mb-5">
          <Text className="text-sm font-semibold mb-2" style={{ color: sem.textPrimary }}>
            Preferred: has children
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {HAS_CHILDREN_OPTIONS.map(({ key, label }) => {
              const isActive = prefs.hasChildrenPreference === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => onPrefsChange({ hasChildrenPreference: key })}
                  className="rounded-full px-4 py-2 border"
                  style={{ backgroundColor: isActive ? sem.accentSoft : 'transparent', borderColor: isActive ? sem.accent : sem.border }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text className="text-sm font-semibold" style={{ color: isActive ? sem.accent : sem.textSecondary }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ─── Wants Children Preference ─── */}
        <View className="mb-5">
          <Text className="text-sm font-semibold mb-2" style={{ color: sem.textPrimary }}>
            Preferred: wants children
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {WANTS_CHILDREN_OPTIONS.map(({ key, label }) => {
              const isActive = prefs.wantsChildrenPreference === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => onPrefsChange({ wantsChildrenPreference: key })}
                  className="rounded-full px-4 py-2 border"
                  style={{ backgroundColor: isActive ? sem.accentSoft : 'transparent', borderColor: isActive ? sem.accent : sem.border }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text className="text-sm font-semibold" style={{ color: isActive ? sem.accent : sem.textSecondary }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ─── Religion Preferences ─── */}
        <View className="mb-5">
          <Text className="text-sm font-semibold mb-2" style={{ color: sem.textPrimary }}>
            Religion preferences
          </Text>
          <Text className="text-sm mb-2" style={{ color: sem.textMuted }}>
            Leave empty to see all religions.
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {RELIGION_OPTIONS.map((r) => {
              const isActive = prefs.religionPreferences.includes(r);
              return (
                <Pressable
                  key={r}
                  onPress={() => handleToggleReligion(r)}
                  className="rounded-full px-4 py-2 border"
                  style={{ backgroundColor: isActive ? sem.accentSoft : 'transparent', borderColor: isActive ? sem.accent : sem.border }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isActive }}
                >
                  <Text className="text-sm font-semibold" style={{ color: isActive ? sem.accent : sem.textSecondary }}>
                    {r}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ─── Language Preferences ─── */}
        <View className="mb-5">
          <Text className="text-sm font-semibold mb-2" style={{ color: sem.textPrimary }}>
            Language preferences
          </Text>
          <Text className="text-sm mb-2" style={{ color: sem.textMuted }}>
            Leave empty to see all languages.
          </Text>
          <LanguageMultiSelectPicker
            selected={prefs.languagePreferences}
            onChange={(items: LanguageOption[]) => onPrefsChange({ languagePreferences: items })}
            accentColor={sem.accent}
            textColor={sem.textPrimary}
            mutedColor={sem.textMuted}
            borderColor={sem.border}
            surfaceColor={sem.surface}
          />
        </View>

        {/* ─── Ethnicity Preferences ─── */}
        <View className="mb-6">
          <Text className="text-base font-semibold mb-2" style={{ color: sem.textPrimary }}>
            Ethnicity preferences
          </Text>
          <Text className="text-sm mb-2" style={{ color: sem.textMuted }}>
            Leave empty to see all backgrounds.
          </Text>
          <EthnicityMultiSelectPicker
            selected={prefs.ethnicityPreferences}
            onChange={(items: EthnicityOption[]) => onPrefsChange({ ethnicityPreferences: items })}
            accentColor={sem.accent}
            textColor={sem.textPrimary}
            mutedColor={sem.textMuted}
            borderColor={sem.border}
            surfaceColor={sem.surface}
          />
        </View>

        {/* ─── Actions ─── */}
        <Pressable
          onPress={isSaving ? undefined : onSave}
          disabled={isSaving}
          className="rounded-full py-4 items-center mb-3"
          style={{ backgroundColor: sem.accent, opacity: isSaving ? 0.75 : 1 }}
          accessibilityRole="button"
          accessibilityLabel="Save Preferences"
        >
          {({ pressed }) =>
            isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                className="text-lg font-bold"
                style={{ color: '#FFFFFF', opacity: pressed ? 0.8 : 1 }}
              >
                Save Preferences
              </Text>
            )
          }
        </Pressable>

        <Pressable
          onPress={onReset}
          className="rounded-full py-4 items-center border"
          style={{ borderColor: sem.border }}
          accessibilityRole="button"
          accessibilityLabel="Reset preferences to defaults"
        >
          {({ pressed }) => (
            <Text
              className="text-lg font-semibold"
              style={{ color: pressed ? sem.accentStrong : sem.textSecondary }}
            >
              Reset
            </Text>
          )}
        </Pressable>
      </SectionCard>
    </View>
  );
});

// ─── Toggle Row ─────────────────────────────────────────────────────────────────

type ToggleRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  helperText?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  sem: SemanticTheme;
};

function ToggleRow({ icon, label, helperText, value, onToggle, sem }: ToggleRowProps) {
  return (
    <View className="flex-row items-center py-3">
      <View
        className="w-9 h-9 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: sem.accentSoft }}
      >
        <Ionicons name={icon} size={18} color={sem.accent} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-medium" style={{ color: sem.textPrimary }}>
          {label}
        </Text>
        {helperText && (
          <Text className="text-sm" style={{ color: sem.textMuted }}>
            {helperText}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: sem.border, true: sem.accent }}
        thumbColor="#FFFFFF"
        accessibilityLabel={`${label}: ${value ? 'enabled' : 'disabled'}`}
      />
    </View>
  );
}
