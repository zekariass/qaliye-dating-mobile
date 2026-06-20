import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { memo, useCallback } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';
import { type DiscoveryPrefDraft, RESIDENCY_OPTIONS } from '../mockEditProfile';
import { SectionCard, SectionTitle } from './FormComponents';

type Props = {
  prefs: DiscoveryPrefDraft;
  onPrefsChange: (update: Partial<DiscoveryPrefDraft>) => void;
  onReset: () => void;
  sem: SemanticTheme;
};

const DISTANCE_MARKS = [5, 25, 50, 100, 250];
const DISCOVERY_MODES = ['STANDARD', 'GLOBAL', 'INCOGNITO'] as const;
const GENDER_OPTIONS = ['MALE', 'FEMALE'] as const;

const MODE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  STANDARD: 'globe-outline',
  GLOBAL: 'globe',
  INCOGNITO: 'glasses-outline',
};

const MODE_LABELS: Record<string, string> = {
  STANDARD: 'Standard',
  GLOBAL: 'Global',
  INCOGNITO: 'Incognito',
};

const MODE_HELPERS: Record<string, string> = {
  STANDARD: 'Standard mode shows you people near you.',
  GLOBAL: 'Global mode shows people from anywhere.',
  INCOGNITO: 'Incognito mode hides you from discovery.',
};

const GENDER_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  MALE: 'male-outline',
  FEMALE: 'female-outline',
};

const RESIDENCY_DISPLAY: Record<string, string> = {
  ETHIOPIA: 'Ethiopia',
  ERITREA: 'Eritrea',
  DIASPORA: 'Diaspora',
};

const RESIDENCY_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  ETHIOPIA: 'flag-outline',
  ERITREA: 'flag-outline',
  DIASPORA: 'earth-outline',
};

export const PreferencesTab = memo(function PreferencesTab({ prefs, onPrefsChange, onReset, sem }: Props) {
  const handleSave = useCallback(() => {
    console.log('Save Preferences:', JSON.stringify(prefs, null, 2));
  }, [prefs]);

  const handleToggleResidency = useCallback((type: string) => {
    const current = prefs.residencyTypes;
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    if (updated.length > 0) {
      onPrefsChange({ residencyTypes: updated });
    }
  }, [prefs.residencyTypes, onPrefsChange]);

  return (
    <View>
      <SectionCard sem={sem}>
        <SectionTitle title="Discovery Preferences" sem={sem} />
        <Text className="text-xs mb-5" style={{ color: sem.textSecondary }}>
          Control who you see and how discovery works.
        </Text>

        {/* ─── Discovery Mode ─── */}
        <View className="mb-5">
          <View className="flex-row items-center mb-2">
            <Text className="text-sm font-semibold" style={{ color: sem.textPrimary }}>
              Discovery mode
            </Text>
            <Ionicons name="information-circle-outline" size={14} color={sem.textMuted} style={{ marginLeft: 6 }} />
          </View>

          <View
            className="flex-row rounded-xl overflow-hidden border"
            style={{ borderColor: sem.border }}
          >
            {DISCOVERY_MODES.map((mode) => {
              const isActive = prefs.discoveryMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => onPrefsChange({ discoveryMode: mode })}
                  className="flex-1 flex-row items-center justify-center py-3 gap-1.5"
                  style={{
                    backgroundColor: isActive ? sem.accentSoft : 'transparent',
                    borderWidth: isActive ? 1 : 0,
                    borderColor: isActive ? sem.accent : 'transparent',
                    borderRadius: isActive ? 10 : 0,
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={MODE_LABELS[mode]}
                >
                  <Ionicons
                    name={MODE_ICONS[mode]}
                    size={16}
                    color={isActive ? sem.accent : sem.textMuted}
                  />
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: isActive ? sem.accent : sem.textMuted }}
                  >
                    {MODE_LABELS[mode]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="text-xs mt-2" style={{ color: sem.textMuted }}>
            {MODE_HELPERS[prefs.discoveryMode]}
          </Text>
        </View>

        {/* ─── Interested In ─── */}
        <View className="mb-5">
          <Text className="text-sm font-semibold mb-2" style={{ color: sem.textPrimary }}>
            Interested in
          </Text>
          <View
            className="flex-row rounded-xl overflow-hidden border"
            style={{ borderColor: sem.border }}
          >
            {GENDER_OPTIONS.map((g) => {
              const isActive = prefs.interestedIn === g;
              return (
                <Pressable
                  key={g}
                  onPress={() => onPrefsChange({ interestedIn: g })}
                  className="flex-1 flex-row items-center justify-center py-3 gap-1.5"
                  style={{
                    backgroundColor: isActive ? sem.accentSoft : 'transparent',
                    borderWidth: isActive ? 1 : 0,
                    borderColor: isActive ? sem.accent : 'transparent',
                    borderRadius: isActive ? 10 : 0,
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={g === 'MALE' ? 'Male' : 'Female'}
                >
                  <Ionicons
                    name={GENDER_ICONS[g]}
                    size={16}
                    color={isActive ? sem.accent : sem.textMuted}
                  />
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: isActive ? sem.accent : sem.textMuted }}
                  >
                    {g === 'MALE' ? 'Male' : 'Female'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ─── Preferred Residency Types ─── */}
        <View className="mb-5">
          <Text className="text-sm font-semibold mb-2" style={{ color: sem.textPrimary }}>
            Preferred residency types
          </Text>
          <View className="flex-row gap-2">
            {RESIDENCY_OPTIONS.map((type) => {
              const isActive = prefs.residencyTypes.includes(type);
              return (
                <Pressable
                  key={type}
                  onPress={() => handleToggleResidency(type)}
                  className="flex-row items-center rounded-full px-4 py-2.5 border gap-2"
                  style={{
                    backgroundColor: isActive ? sem.accentSoft : 'transparent',
                    borderColor: isActive ? sem.accent : sem.border,
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isActive }}
                  accessibilityLabel={RESIDENCY_DISPLAY[type]}
                >
                  <Ionicons name={RESIDENCY_ICONS[type]} size={14} color={isActive ? sem.accent : sem.textMuted} />
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: isActive ? sem.accent : sem.textSecondary }}
                  >
                    {RESIDENCY_DISPLAY[type]}
                  </Text>
                  {isActive && (
                    <View
                      className="w-4 h-4 rounded-full items-center justify-center"
                      style={{ backgroundColor: sem.accent }}
                    >
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                  {!isActive && (
                    <View
                      className="w-4 h-4 rounded-full border"
                      style={{ borderColor: sem.border }}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
          <Text className="text-xs mt-2" style={{ color: sem.textMuted }}>
            Select all that apply
          </Text>
        </View>

        {/* ─── Age Range ─── */}
        <View className="mb-5">
          <Text className="text-sm font-semibold mb-3" style={{ color: sem.textPrimary }}>
            Age range
          </Text>
          <View className="flex-row items-center gap-3">
            <View
              className="px-3 py-2 rounded-lg border min-w-[50px] items-center"
              style={{ borderColor: sem.border }}
            >
              <Text className="text-sm font-bold" style={{ color: sem.textPrimary }}>
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
                maximumValue={80}
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
              <Text className="text-sm font-bold" style={{ color: sem.textPrimary }}>
                {prefs.maxAge}
              </Text>
            </View>
          </View>
          <View className="flex-row justify-between mt-1 px-1">
            <Text className="text-xs" style={{ color: sem.textMuted }}>Min age</Text>
            <Text className="text-xs" style={{ color: sem.textMuted }}>Max age</Text>
          </View>
        </View>

        {/* ─── Maximum Distance ─── */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold" style={{ color: sem.textPrimary }}>
              Maximum distance
            </Text>
            <Text className="text-sm font-bold" style={{ color: sem.accent }}>
              {prefs.maximumDistanceKm} km
            </Text>
          </View>
          <Slider
            minimumValue={5}
            maximumValue={250}
            value={prefs.maximumDistanceKm}
            step={5}
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
                className="text-xs font-medium"
                style={{ color: d === prefs.maximumDistanceKm ? sem.accent : sem.textMuted }}
              >
                {d === 250 ? '250+ km' : `${d} km`}
              </Text>
            ))}
          </View>
        </View>

        {/* ─── Toggles ─── */}
        <View className="gap-1 mb-6">
          <ToggleRow
            icon="paper-plane-outline"
            label="Open to long-distance"
            value={prefs.openToLongDistance}
            onToggle={(v) => onPrefsChange({ openToLongDistance: v })}
            sem={sem}
          />
          <ToggleRow
            icon="home-outline"
            label="Open to relocation"
            value={prefs.openToRelocation}
            onToggle={(v) => onPrefsChange({ openToRelocation: v })}
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

        {/* ─── Actions ─── */}
        <Pressable
          onPress={handleSave}
          className="rounded-full py-4 items-center mb-3"
          style={{ backgroundColor: sem.accent }}
          accessibilityRole="button"
          accessibilityLabel="Save Preferences"
        >
          {({ pressed }) => (
            <Text
              className="text-base font-bold"
              style={{ color: '#FFFFFF', opacity: pressed ? 0.8 : 1 }}
            >
              Save Preferences
            </Text>
          )}
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
              className="text-base font-semibold"
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
        <Text className="text-sm font-medium" style={{ color: sem.textPrimary }}>
          {label}
        </Text>
        {helperText && (
          <Text className="text-xs" style={{ color: sem.textMuted }}>
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
