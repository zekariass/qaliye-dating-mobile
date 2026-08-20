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
  { key: 'nearby',             label: 'Near Me',   icon: 'locate-outline' },
  { key: 'diaspora',           label: 'Diaspora',  icon: 'earth-outline' },
  { key: 'specific_countries', label: 'Specific',  icon: 'flag-outline' },
  { key: 'anywhere',           label: 'Anywhere',  icon: 'globe-outline' },
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
    <View style={{ gap: 12 }}>

      {/* ═══════════════════════════════════════════════════════════════════
          CARD 1 · Who you want to meet
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard sem={sem}>
        <SectionTitle title="Who You Want to Meet" sem={sem} />

        {/* ─── Interested In (locked — auto-derived from gender) ─── */}
        <PrefsLabel label="Interested in" sem={sem}>
          <Ionicons name="lock-closed-outline" size={13} color={sem.textMuted} />
        </PrefsLabel>
        <View
          className="flex-row items-center rounded-2xl px-4 py-4 border"
          style={{ backgroundColor: sem.surfaceMuted, borderColor: sem.border }}
        >
          <View
            className="w-8 h-8 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: sem.accentSoft }}
          >
            <Ionicons
              name={prefs.interestedIn === 'MALE' ? 'male-outline' : 'female-outline'}
              size={17}
              color={sem.accent}
            />
          </View>
          <Text className="flex-1 text-base font-semibold" style={{ color: sem.textPrimary }}>
            {prefs.interestedIn === 'MALE' ? 'Men' : 'Women'}
          </Text>
          <View
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: sem.accentSoft }}
          >
            <Text className="text-xs font-semibold" style={{ color: sem.accent }}>Auto</Text>
          </View>
        </View>
        <Text className="text-sm mt-2 ml-0.5" style={{ color: sem.textMuted }}>
          {userGender
            ? `Automatically set based on your gender (${userGender === 'MALE' ? 'Man' : 'Woman'}).`
            : 'Automatically set based on your profile gender.'}
        </Text>

        <SectionDivider sem={sem} />

        {/* ─── Location Mode ─── */}
        <PrefsLabel label="Where to discover people" sem={sem} />
        <View className="flex-row flex-wrap gap-2.5 mt-1">
          {LOCATION_MODES.map(({ key, label, icon }) => {
            const isActive = prefs.locationMode === key;
            return (
              <Pressable
                key={key}
                onPress={() => onPrefsChange({ locationMode: key })}
                className="flex-row items-center rounded-2xl px-4 py-3 border gap-2"
                style={{
                  backgroundColor: isActive ? sem.accentSoft : sem.surfaceMuted,
                  borderColor: isActive ? sem.accent : sem.border,
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={label}
              >
                <Ionicons name={icon} size={16} color={isActive ? sem.accent : sem.textMuted} />
                <Text className="text-sm font-semibold" style={{ color: isActive ? sem.accent : sem.textSecondary }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {prefs.locationMode === 'specific_countries' && (
          <View className="mt-4">
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
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          CARD 2 · Age & Distance
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard sem={sem}>
        <SectionTitle title="Age & Distance" sem={sem} />

        {/* ─── Age Range ─── */}
        <PrefsLabel label="Age range" sem={sem} />
        <View className="flex-row items-center gap-3 mt-2">
          <AgeDisplay value={prefs.minAge} label="Min" sem={sem} />
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
          <AgeDisplay value={prefs.maxAge} label="Max" sem={sem} />
        </View>

        <SectionDivider sem={sem} />

        {/* ─── Maximum Distance ─── */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-base font-semibold" style={{ color: sem.textPrimary }}>
            Maximum distance
          </Text>
          <View
            className="px-3 py-1.5 rounded-full"
            style={{ backgroundColor: sem.accentSoft }}
          >
            <Text className="text-base font-bold" style={{ color: sem.accent }}>
              {prefs.maximumDistanceKm} km
            </Text>
          </View>
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
        <View className="flex-row justify-between mt-2">
          {DISTANCE_MARKS.map((d) => (
            <Text
              key={d}
              className="text-xs font-medium"
              style={{ color: d === prefs.maximumDistanceKm ? sem.accent : sem.textMuted }}
            >
              {d === 500 ? '500+' : `${d}`}
            </Text>
          ))}
        </View>
        <Text className="text-xs text-center mt-1" style={{ color: sem.textMuted }}>km</Text>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          CARD 3 · Filters & Children Preferences
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard sem={sem}>
        <SectionTitle title="Filters" sem={sem} />

        {/* ─── Toggles ─── */}
        <ToggleRow
          icon="search-outline"
          label="Expand search when limited"
          helperText="Broaden discovery if few matches found."
          value={prefs.expandSearchWhenLimited}
          onToggle={(v) => onPrefsChange({ expandSearchWhenLimited: v })}
          sem={sem}
        />
        <View style={{ height: 1, backgroundColor: sem.border, marginVertical: 4 }} />
        <ToggleRow
          icon="checkmark-circle-outline"
          label="Show verified profiles only"
          helperText="Only show people with a blue check."
          value={prefs.verifiedProfilesOnly}
          onToggle={(v) => onPrefsChange({ verifiedProfilesOnly: v })}
          sem={sem}
        />

        <SectionDivider sem={sem} />

        {/* ─── Has Children Preference ─── */}
        <PrefsLabel label="Partner has children" sem={sem} />
        <View className="flex-row flex-wrap gap-2.5 mt-1">
          {HAS_CHILDREN_OPTIONS.map(({ key, label }) => {
            const isActive = prefs.hasChildrenPreference === key;
            return (
              <ChipButton
                key={key}
                label={label}
                isActive={isActive}
                onPress={() => onPrefsChange({ hasChildrenPreference: key })}
                role="radio"
                sem={sem}
              />
            );
          })}
        </View>

        <SectionDivider sem={sem} />

        {/* ─── Wants Children Preference ─── */}
        <PrefsLabel label="Partner wants children" sem={sem} />
        <View className="flex-row flex-wrap gap-2.5 mt-1">
          {WANTS_CHILDREN_OPTIONS.map(({ key, label }) => {
            const isActive = prefs.wantsChildrenPreference === key;
            return (
              <ChipButton
                key={key}
                label={label}
                isActive={isActive}
                onPress={() => onPrefsChange({ wantsChildrenPreference: key })}
                role="radio"
                sem={sem}
              />
            );
          })}
        </View>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          CARD 4 · Culture & Background
      ═══════════════════════════════════════════════════════════════════ */}
      <SectionCard sem={sem}>
        <SectionTitle title="Culture & Background" sem={sem} />

        {/* ─── Religion Preferences ─── */}
        <PrefsLabel label="Religion" sem={sem} />
        <Text className="text-sm mb-3" style={{ color: sem.textMuted }}>
          Leave empty to see all religions.
        </Text>
        <View className="flex-row flex-wrap gap-2.5">
          {RELIGION_OPTIONS.map((r) => {
            const isActive = prefs.religionPreferences.includes(r);
            return (
              <ChipButton
                key={r}
                label={r}
                isActive={isActive}
                onPress={() => handleToggleReligion(r)}
                role="checkbox"
                sem={sem}
              />
            );
          })}
        </View>

        <SectionDivider sem={sem} />

        {/* ─── Language Preferences ─── */}
        <PrefsLabel label="Languages" sem={sem} />
        <Text className="text-sm mb-3" style={{ color: sem.textMuted }}>
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

        <SectionDivider sem={sem} />

        {/* ─── Ethnicity Preferences ─── */}
        <PrefsLabel label="Ethnicity" sem={sem} />
        <Text className="text-sm mb-3" style={{ color: sem.textMuted }}>
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
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════════════
          Actions
      ═══════════════════════════════════════════════════════════════════ */}
      <View style={{ gap: 12, paddingBottom: 8 }}>
        <Pressable
          onPress={isSaving ? undefined : onSave}
          disabled={isSaving}
          className="rounded-2xl items-center justify-center"
          style={{ backgroundColor: sem.accent, opacity: isSaving ? 0.75 : 1, minHeight: 60 }}
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
          className="rounded-2xl items-center justify-center border"
          style={{ borderColor: sem.border, minHeight: 60 }}
          accessibilityRole="button"
          accessibilityLabel="Reset preferences to defaults"
        >
          {({ pressed }) => (
            <Text
              className="text-base font-semibold"
              style={{ color: pressed ? sem.accentStrong : sem.textSecondary }}
            >
              Reset to Defaults
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
});

// ─── Section Label ──────────────────────────────────────────────────────────────

type PrefsLabelProps = {
  label: string;
  sem: SemanticTheme;
  children?: React.ReactNode;
};

function PrefsLabel({ label, sem, children }: PrefsLabelProps) {
  return (
    <View className="flex-row items-center gap-1.5 mb-2">
      <Text className="text-base font-semibold" style={{ color: sem.textPrimary }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

// ─── Section Divider ─────────────────────────────────────────────────────────

function SectionDivider({ sem }: { sem: SemanticTheme }) {
  return <View style={{ height: 1, backgroundColor: sem.border, marginVertical: 20 }} />;
}

// ─── Age Display Box ─────────────────────────────────────────────────────────

type AgeDisplayProps = {
  value: number;
  label: string;
  sem: SemanticTheme;
};

function AgeDisplay({ value, label, sem }: AgeDisplayProps) {
  return (
    <View className="items-center gap-1">
      <View
        className="px-4 py-3 rounded-2xl border items-center min-w-[62px]"
        style={{ borderColor: sem.accent, backgroundColor: sem.accentSoft }}
      >
        <Text className="text-xl font-bold" style={{ color: sem.accent }}>
          {value}
        </Text>
      </View>
      <Text className="text-xs font-medium" style={{ color: sem.textMuted }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Chip Button ─────────────────────────────────────────────────────────────

type ChipButtonProps = {
  label: string;
  isActive: boolean;
  onPress: () => void;
  role: 'radio' | 'checkbox';
  sem: SemanticTheme;
};

function ChipButton({ label, isActive, onPress, role, sem }: ChipButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl px-5 py-3 border"
      style={{
        backgroundColor: isActive ? sem.accentSoft : sem.surfaceMuted,
        borderColor: isActive ? sem.accent : sem.border,
      }}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected: isActive } : { checked: isActive }}
    >
      <Text className="text-sm font-semibold" style={{ color: isActive ? sem.accent : sem.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

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
    <View className="flex-row items-center py-4">
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-4"
        style={{ backgroundColor: sem.accentSoft }}
      >
        <Ionicons name={icon} size={20} color={sem.accent} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold" style={{ color: sem.textPrimary }}>
          {label}
        </Text>
        {helperText && (
          <Text className="text-sm mt-0.5" style={{ color: sem.textMuted }}>
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
