import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CountryMultiSelectPicker } from '@/components/catalog/CountryMultiSelectPicker';
import { EthnicityMultiSelectPicker } from '@/components/catalog/EthnicityMultiSelectPicker';
import { LanguageMultiSelectPicker } from '@/components/catalog/LanguageMultiSelectPicker';
import { themedAlert } from '@/components/common/ThemedAlert';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import {
    useProfilePreferences,
    useUpdateProfilePreferences,
} from '@/hooks/profile/useProfilePreferences';
import { useTheme } from '@/hooks/use-theme';
import {
    type DiscoveryPrefDraft,
    type HasChildrenPref,
    type LocationMode,
    type WantsChildrenPref,
    RELIGION_OPTIONS,
} from '@/screens/profile/mockEditProfile';
import { useMeStore } from '@/stores/me-store';
import type { EthnicityOption, LanguageOption } from '@/types/catalog';
import {
    mapApiPrefsToDiscoveryPrefDraft,
    mapDiscoveryPrefDraftToUpdateRequest,
} from '@/utils/profileMappers';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const LOCATION_MODES: { key: LocationMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'nearby',             label: 'Near Me',   icon: 'locate-outline' },
  { key: 'diaspora',           label: 'Diaspora',  icon: 'earth-outline' },
  { key: 'specific_countries', label: 'Specific',  icon: 'flag-outline' },
  { key: 'anywhere',           label: 'Anywhere',  icon: 'globe-outline' },
];

const HAS_CHILDREN_OPTS: { key: HasChildrenPref; label: string }[] = [
  { key: 'any', label: 'Any' },
  { key: 'yes', label: 'Has children' },
  { key: 'no',  label: 'No children' },
];

const WANTS_CHILDREN_OPTS: { key: WantsChildrenPref; label: string }[] = [
  { key: 'any',                label: 'Any' },
  { key: 'yes',                label: 'Wants' },
  { key: 'no',                 label: "Doesn't want" },
  { key: 'not_sure',           label: 'Not sure' },
  { key: 'open_to_discussion', label: 'Open to discuss' },
];

const DEFAULT_PREFS: DiscoveryPrefDraft = {
  discoveryMode: 'PUBLIC',
  interestedIn: 'FEMALE',
  locationMode: 'anywhere',
  specificCountryCodes: [],
  expandSearchWhenLimited: false,
  minAge: 18,
  maxAge: 45,
  maximumDistanceKm: 500,
  verifiedProfilesOnly: false,
  hasChildrenPreference: 'any',
  wantsChildrenPreference: 'any',
  religionPreferences: [],
  languagePreferences: [],
  ethnicityPreferences: [],
  preferencesVersion: 0,
};

// ---------------------------------------------------------------------------
// Sub-components (use useTheme internally)
// ---------------------------------------------------------------------------
function Card({ children }: { children: React.ReactNode }) {
  const { colors: th } = useTheme();
  return <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>{children}</View>;
}

function STitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function TRow({
  label, desc, iconName, iconBg, value, onChange,
}: {
  label: string; desc?: string; iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconBg: string; value: boolean; onChange: (v: boolean) => void;
}) {
  const { colors: th } = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.toggleIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={18} color="#fff" />
      </View>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {desc ? <Text style={[styles.toggleDesc, { color: th.textSecondary }]}>{desc}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: th.border, true: colors.primaryLight }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function DiscoveryPreferencesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors: th } = useTheme();
  const meStore = useMeStore();

  const userGender = (meStore.data?.profile?.gender as string | undefined) ?? null;

  const [prefs, setPrefs] = useState<DiscoveryPrefDraft>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  const { data: apiPrefs, isLoading: isLoadingPrefs } = useProfilePreferences();
  const { mutate: savePrefs, isPending: isSaving } = useUpdateProfilePreferences();

  // Hydrate local state from API once loaded
  useEffect(() => {
    if (apiPrefs && !hydrated) {
      setPrefs(mapApiPrefsToDiscoveryPrefDraft(apiPrefs, 'PUBLIC', userGender ?? undefined));
      setHydrated(true);
    }
  }, [apiPrefs, hydrated, userGender]);

  const update = useCallback(<K extends keyof DiscoveryPrefDraft>(key: K, value: DiscoveryPrefDraft[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  }, []);

  const handleToggleReligion = useCallback((val: string) => {
    setPrefs((p) => ({
      ...p,
      religionPreferences: p.religionPreferences.includes(val)
        ? p.religionPreferences.filter((r) => r !== val)
        : [...p.religionPreferences, val],
    }));
  }, []);

  const handleSave = useCallback(() => {
    const payload = mapDiscoveryPrefDraftToUpdateRequest(prefs);
    savePrefs(
      payload,
      {
        onSuccess: () => {
          themedAlert({ message: t('discovery.preferences.saved'), icon: 'checkmark-circle', iconColor: colors.success });
          router.back();
        },
        onError: () => {
          themedAlert({
            title: t('common.errorTitle', { defaultValue: 'Something went wrong' }),
            message: t('common.errorRetryHint', { defaultValue: 'Please try again.' }),
            icon: 'alert-circle',
            iconColor: colors.danger,
          });
        },
      },
    );
  }, [prefs, savePrefs, t, router]);

  if (isLoadingPrefs) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: th.backgroundElement }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { backgroundColor: th.surface, borderBottomColor: th.border }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: th.text }]}>{t('discovery.preferences.title')}</Text>
          <View style={styles.saveBtn} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.backgroundElement }]} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: th.surface, borderBottomColor: th.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: th.text }]}>{t('discovery.preferences.title')}</Text>
        <Pressable style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
          {isSaving
            ? <ActivityIndicator size="small" color={colors.surface} />
            : <Text style={styles.saveBtnText}>Save</Text>
          }
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Location Mode ── */}
        <Card>
          <STitle label="Where to discover people" />
          <View style={styles.chipRow}>
            {LOCATION_MODES.map(({ key, label, icon }) => {
              const isActive = prefs.locationMode === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => update('locationMode', key)}
                  style={[styles.chip, { borderColor: isActive ? colors.primary : th.border, backgroundColor: isActive ? '#F0E6FF' : 'transparent' }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                >
                  <Ionicons name={icon} size={13} color={isActive ? colors.primary : th.textSecondary} />
                  <Text style={[styles.chipLabel, { color: isActive ? colors.primary : th.textSecondary }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          {prefs.locationMode === 'specific_countries' && (
            <View style={{ marginTop: 12 }}>
              <CountryMultiSelectPicker
                selected={prefs.specificCountryCodes}
                onChange={(codes) => update('specificCountryCodes', codes)}
                accentColor={colors.primary}
                textColor={th.text}
                mutedColor={th.textMuted}
                borderColor={th.border}
                surfaceColor={th.surface}
              />
            </View>
          )}
        </Card>

        {/* ── Age Range ── */}
        <Card>
          <View style={styles.ageRangeHeader}>
            <STitle label={t('discovery.preferences.ageRange')} />
            <View style={styles.rangeDisplay}>
              <Text style={[styles.rangeValue, { color: colors.primary }]}>{prefs.minAge}</Text>
              <Text style={[styles.rangeSep, { color: th.textMuted }]}>–</Text>
              <Text style={[styles.rangeValue, { color: colors.primary }]}>{prefs.maxAge}</Text>
              <Text style={[styles.rangeUnit, { color: th.textSecondary }]}>yrs</Text>
            </View>
          </View>
          <View style={styles.ageSlidersRow}>
            <View style={styles.ageSliderCol}>
              <Text style={[styles.sliderLabel, { color: th.textSecondary }]}>Min</Text>
              <Slider
                style={styles.slider}
                minimumValue={18}
                maximumValue={prefs.maxAge - 1}
                step={1}
                value={prefs.minAge}
                onValueChange={(v: number) => update('minAge', Math.round(v))}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={th.border}
                thumbTintColor={colors.primary}
              />
            </View>
            <View style={styles.ageSliderCol}>
              <Text style={[styles.sliderLabel, { color: th.textSecondary }]}>Max</Text>
              <Slider
                style={styles.slider}
                minimumValue={prefs.minAge + 1}
                maximumValue={100}
                step={1}
                value={prefs.maxAge}
                onValueChange={(v: number) => update('maxAge', Math.round(v))}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={th.border}
                thumbTintColor={colors.primary}
              />
            </View>
          </View>
        </Card>

        {/* ── Max Distance ── */}
        <Card>
          <View style={styles.distanceHeader}>
            <STitle label={t('discovery.preferences.maxDistance')} />
            <View style={[styles.distanceValueRow, { backgroundColor: th.backgroundSelected }]}>
              <Ionicons name="navigate-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.distanceInput, { color: colors.secondary }]}>{prefs.maximumDistanceKm} km</Text>
            </View>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={500}
            step={5}
            value={Math.min(prefs.maximumDistanceKm, 500)}
            onValueChange={(v: number) => update('maximumDistanceKm', Math.round(v))}
            minimumTrackTintColor={colors.secondary}
            maximumTrackTintColor={th.border}
            thumbTintColor={colors.secondary}
          />
          <View style={styles.sliderEndLabels}>
            <Text style={styles.sliderEndText}>1 km</Text>
            <Text style={styles.sliderEndText}>500 km</Text>
          </View>
        </Card>

        {/* ── Toggles ── */}
        <Card>
          <TRow
            label="Expand search when limited"
            desc="Broaden discovery if few matches found"
            iconName="search-outline"
            iconBg="#F59E0B"
            value={prefs.expandSearchWhenLimited}
            onChange={(v) => update('expandSearchWhenLimited', v)}
          />
          <View style={[styles.divider, { backgroundColor: th.border }]} />
          <TRow
            label={t('discovery.preferences.showVerifiedOnly')}
            desc={t('discovery.preferences.verifiedDesc')}
            iconName="shield-checkmark-outline"
            iconBg="#2F80ED"
            value={prefs.verifiedProfilesOnly}
            onChange={(v) => update('verifiedProfilesOnly', v)}
          />
        </Card>

        {/* ── Has Children Preference ── */}
        <Card>
          <STitle label="Preferred: has children" />
          <View style={styles.chipRow}>
            {HAS_CHILDREN_OPTS.map(({ key, label }) => {
              const isActive = prefs.hasChildrenPreference === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => update('hasChildrenPreference', key)}
                  style={[styles.chip, { borderColor: isActive ? colors.primary : th.border, backgroundColor: isActive ? '#F0E6FF' : 'transparent' }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[styles.chipLabel, { color: isActive ? colors.primary : th.textSecondary }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* ── Wants Children Preference ── */}
        <Card>
          <STitle label="Preferred: wants children" />
          <View style={styles.chipRow}>
            {WANTS_CHILDREN_OPTS.map(({ key, label }) => {
              const isActive = prefs.wantsChildrenPreference === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => update('wantsChildrenPreference', key)}
                  style={[styles.chip, { borderColor: isActive ? colors.primary : th.border, backgroundColor: isActive ? '#F0E6FF' : 'transparent' }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                >
                  <Text style={[styles.chipLabel, { color: isActive ? colors.primary : th.textSecondary }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* ── Religion Preferences ── */}
        <Card>
          <STitle label="Religion preferences" />
          <Text style={[styles.helperText, { color: th.textMuted }]}>Leave empty to see all religions.</Text>
          <View style={styles.chipRow}>
            {RELIGION_OPTIONS.map((r) => {
              const isActive = prefs.religionPreferences.includes(r);
              return (
                <Pressable
                  key={r}
                  onPress={() => handleToggleReligion(r)}
                  style={[styles.chip, { borderColor: isActive ? colors.primary : th.border, backgroundColor: isActive ? '#F0E6FF' : 'transparent' }]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isActive }}
                >
                  <Text style={[styles.chipLabel, { color: isActive ? colors.primary : th.textSecondary }]}>{r}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* ── Language Preferences ── */}
        <Card>
          <STitle label="Language preferences" />
          <Text style={[styles.helperText, { color: th.textMuted }]}>Leave empty to see all languages.</Text>
          <LanguageMultiSelectPicker
            selected={prefs.languagePreferences}
            onChange={(items: LanguageOption[]) => update('languagePreferences', items)}
            accentColor={colors.primary}
            textColor={th.text}
            mutedColor={th.textMuted}
            borderColor={th.border}
            surfaceColor={th.surface}
          />
        </Card>

        {/* ── Ethnicity Preferences ── */}
        <Card>
          <STitle label="Ethnicity preferences" />
          <Text style={[styles.helperText, { color: th.textMuted }]}>Leave empty to see all backgrounds.</Text>
          <EthnicityMultiSelectPicker
            selected={prefs.ethnicityPreferences}
            onChange={(items: EthnicityOption[]) => update('ethnicityPreferences', items)}
            accentColor={colors.primary}
            textColor={th.text}
            mutedColor={th.textMuted}
            borderColor={th.border}
            surfaceColor={th.surface}
          />
        </Card>

        {/* ── Save button ── */}
        <Pressable style={styles.saveFull} onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.surface} style={{ marginRight: 8 }} />
              <Text style={styles.saveFullText}>{t('discovery.preferences.save')}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  screen: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    shadowColor: colors.primary,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.backgroundLavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  saveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: colors.surface },

  // ── Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.sm, paddingTop: spacing.md, gap: 12, paddingBottom: 40 },

  // ── Card
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#8A2CFF',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  helperText: { fontSize: 12, marginTop: -4 },

  // ── Range display
  ageRangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rangeDisplay: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rangeValue: { fontSize: 22, fontWeight: '800' },
  rangeSep: { fontSize: 18, fontWeight: '600' },
  rangeUnit: { fontSize: 13, fontWeight: '600', marginLeft: 2 },
  ageSlidersRow: { flexDirection: 'row', gap: spacing.md },
  ageSliderCol: { flex: 1, gap: 2 },

  // ── Sliders
  slider: { width: '100%', height: 36 },
  sliderLabel: { fontSize: 12, fontWeight: '600', marginBottom: -8 },
  sliderEndLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  sliderEndText: { fontSize: 11, color: colors.textMuted },

  // ── Distance
  distanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distanceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    gap: spacing.sm,
  },
  distanceInput: { fontSize: 18, fontWeight: '800', textAlign: 'center' },

  // ── Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  chipLabel: { fontSize: 13, fontWeight: '600' },

  // ── Toggle rows
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  toggleDesc: { fontSize: 13 },
  divider: { height: 1, marginVertical: 2 },

  // ── Save
  saveFull: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginTop: 4,
  },
  saveFullText: { fontSize: fontSize.md, fontWeight: '800', color: colors.surface, letterSpacing: 0.3 },
});
