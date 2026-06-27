import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { memo, useCallback } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';
import { type DiscoveryPrefDraft, RESIDENCY_OPTIONS } from '../mockEditProfile';
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

export const PreferencesTab = memo(function PreferencesTab({ prefs, onPrefsChange, onReset, onSave, isSaving = false, userGender, sem }: Props) {

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

        {/* ─── Interested In (locked — auto-derived from gender) ─── */}
        <View className="mb-5">
          <View className="flex-row items-center gap-1 mb-1.5">
            <Text className="text-sm font-semibold" style={{ color: sem.textPrimary }}>
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
            <Text className="flex-1 text-sm font-medium" style={{ color: sem.textPrimary }}>
              {prefs.interestedIn === 'MALE' ? 'Male' : 'Female'}
            </Text>
            <Text className="text-xs" style={{ color: sem.textMuted }}>Auto</Text>
          </View>
          <Text className="text-xs mt-1.5 ml-1" style={{ color: sem.textMuted }}>
            {userGender
              ? `Set automatically based on your gender (${userGender === 'MALE' ? 'Man' : 'Woman'}).`
              : 'Automatically set based on your profile gender.'}
          </Text>
        </View>

        {/* ─── Preferred Residency Types ─── */}
        <View className="mb-5">
          <Text className="text-sm font-semibold mb-2" style={{ color: sem.textPrimary }}>
            Preferred residency types
          </Text>
          <View className="flex-row flex-wrap gap-2">
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
                className="text-xs font-medium"
                style={{ color: d === prefs.maximumDistanceKm ? sem.accent : sem.textMuted }}
              >
                {d === 500 ? '500 km' : `${d} km`}
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
                className="text-base font-bold"
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
