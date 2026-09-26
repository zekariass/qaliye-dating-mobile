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
import { isInsufficientCreditsError } from '@/utils/entitlements';
import {
    mapApiPrefsToDiscoveryPrefDraft,
    mapDiscoveryPrefDraftToUpdateRequest,
} from '@/utils/profileMappers';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const LOCATION_MODES: { key: LocationMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; desc: string }[] = [
  { key: 'nearby',             label: 'Near Me',   icon: 'locate-outline',  desc: 'Within a distance' },
  { key: 'diaspora',           label: 'Diaspora',  icon: 'earth-outline',   desc: 'Abroad communities' },
  { key: 'specific_countries', label: 'Specific',  icon: 'flag-outline',    desc: 'Choose countries' },
  { key: 'anywhere',           label: 'Anywhere',  icon: 'globe-outline',   desc: 'No location filter' },
];

const HAS_CHILDREN_OPTS: { key: HasChildrenPref; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'any', label: 'Any',          icon: 'remove-outline' },
  { key: 'yes', label: 'Has kids',     icon: 'heart-outline' },
  { key: 'no',  label: 'No kids',      icon: 'close-circle-outline' },
];

const WANTS_CHILDREN_OPTS: { key: WantsChildrenPref; label: string }[] = [
  { key: 'any',                label: 'Any' },
  { key: 'yes',                label: 'Wants kids' },
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
// Sub-components
// ---------------------------------------------------------------------------

/** Grouped section with a floating label header */
function Section({
  icon,
  label,
  children,
  accent,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  children: React.ReactNode;
  accent?: string;
}) {
  const { colors: th } = useTheme();
  const accentColor = accent ?? colors.primary;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconBadge, { backgroundColor: accentColor + '18' }]}>
          <Ionicons name={icon} size={14} color={accentColor} />
        </View>
        <Text style={[styles.sectionLabel, { color: accentColor }]}>{label}</Text>
      </View>
      <View style={[styles.sectionCard, { backgroundColor: th.surface, borderColor: th.border }]}>
        {children}
      </View>
    </View>
  );
}

/** Divider inside a card */
function CardDivider() {
  const { colors: th } = useTheme();
  return <View style={[styles.cardDivider, { backgroundColor: th.border }]} />;
}

/** Row with a label and a switch */
function ToggleRow({
  label,
  desc,
  iconName,
  iconBg,
  value,
  onChange,
}: {
  label: string;
  desc?: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconBg: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors: th } = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.toggleIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={17} color="#fff" />
      </View>
      <View style={styles.toggleTextWrap}>
        <Text style={[styles.toggleLabel, { color: th.text }]}>{label}</Text>
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

/** Pill chip for single/multi select */
function Chip({
  label,
  isActive,
  onPress,
  icon,
  accent,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  accent?: string;
}) {
  const { colors: th } = useTheme();
  const accentColor = accent ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: isActive ? accentColor : th.border,
          backgroundColor: isActive ? accentColor + '18' : 'transparent',
        },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected: isActive }}
    >
      {icon ? <Ionicons name={icon} size={13} color={isActive ? accentColor : th.textSecondary} /> : null}
      <Text style={[styles.chipLabel, { color: isActive ? accentColor : th.textSecondary }]}>{label}</Text>
    </Pressable>
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
          themedAlert({
            message: t('discovery.preferences.saved'),
            icon: 'checkmark-circle',
            iconColor: colors.success,
            autoDismissMs: 3000,
          });
          setTimeout(() => router.back(), 3000);
        },
        onError: (err) => {
          if (isInsufficientCreditsError(err)) return;
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
          <View style={styles.saveBtnPlaceholder} />
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
        <Pressable style={styles.saveHeaderBtn} onPress={handleSave} disabled={isSaving}>
          {isSaving
            ? <ActivityIndicator size="small" color={colors.surface} />
            : <Text style={styles.saveHeaderBtnText}>Save</Text>
          }
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── 1. Location ── */}
        <Section icon="navigate-outline" label="Location">
          <Text style={[styles.helperText, { color: th.textSecondary }]}>Where should we look for people?</Text>
          <View style={styles.locationGrid}>
            {LOCATION_MODES.map(({ key, label, icon, desc }) => {
              const isActive = prefs.locationMode === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => update('locationMode', key)}
                  style={[
                    styles.locationTile,
                    {
                      borderColor: isActive ? colors.primary : th.border,
                      backgroundColor: isActive ? colors.primary + '12' : th.surface,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isActive }}
                >
                  <View style={[styles.locationTileIcon, { backgroundColor: isActive ? colors.primary + '20' : th.backgroundElement }]}>
                    <Ionicons name={icon} size={20} color={isActive ? colors.primary : th.textSecondary} />
                  </View>
                  <Text style={[styles.locationTileLabel, { color: isActive ? colors.primary : th.text }]}>{label}</Text>
                  <Text style={[styles.locationTileDesc, { color: isActive ? colors.primary + 'AA' : th.textMuted }]}>{desc}</Text>
                  {isActive && (
                    <View style={styles.locationTileCheck}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          {prefs.locationMode === 'specific_countries' && (
            <View style={[styles.countryPicker, { borderTopColor: th.border }]}>
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
        </Section>

        {/* ── 2. Age Range ── */}
        <Section icon="calendar-outline" label="Age Range">
          <View style={styles.ageDisplayRow}>
            <View style={styles.ageDisplayBox}>
              <Text style={[styles.ageDisplayNum, { color: colors.primary }]}>{prefs.minAge}</Text>
              <Text style={[styles.ageDisplayUnit, { color: th.textMuted }]}>min</Text>
            </View>
            <View style={[styles.ageDisplaySep, { backgroundColor: th.border }]} />
            <View style={styles.ageDisplayBox}>
              <Text style={[styles.ageDisplayNum, { color: colors.primary }]}>{prefs.maxAge}</Text>
              <Text style={[styles.ageDisplayUnit, { color: th.textMuted }]}>max</Text>
            </View>
          </View>
          <View style={styles.slidersRow}>
            <View style={styles.sliderCol}>
              <View style={styles.sliderLabelRow}>
                <Ionicons name="remove-outline" size={14} color={th.textMuted} />
                <Text style={[styles.sliderLabel, { color: th.textSecondary }]}>Minimum age</Text>
              </View>
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
            <View style={styles.sliderCol}>
              <View style={styles.sliderLabelRow}>
                <Ionicons name="add-outline" size={14} color={th.textMuted} />
                <Text style={[styles.sliderLabel, { color: th.textSecondary }]}>Maximum age</Text>
              </View>
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
        </Section>

        {/* ── 3. Max Distance (Nearby only) ── */}
        {prefs.locationMode === 'nearby' && (
          <Section icon="compass-outline" label="Distance" accent={colors.secondary}>
            <View style={styles.distanceRow}>
              <View style={[styles.distanceBadge, { backgroundColor: colors.secondary + '14' }]}>
                <Ionicons name="navigate-circle-outline" size={18} color={colors.secondary} />
                <Text style={[styles.distanceValue, { color: colors.secondary }]}>{prefs.maximumDistanceKm} km</Text>
              </View>
              <Text style={[styles.distanceHint, { color: th.textMuted }]}>radius from you</Text>
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
            <View style={styles.sliderEndRow}>
              <Text style={[styles.sliderEndText, { color: th.textMuted }]}>1 km</Text>
              <Text style={[styles.sliderEndText, { color: th.textMuted }]}>500 km</Text>
            </View>
          </Section>
        )}

        {/* ── 4. Quality Filters ── */}
        <Section icon="shield-checkmark-outline" label="Quality Filters" accent="#2F80ED">
          <ToggleRow
            label="Verified profiles only"
            desc={t('discovery.preferences.verifiedDesc')}
            iconName="shield-checkmark-outline"
            iconBg="#2F80ED"
            value={prefs.verifiedProfilesOnly}
            onChange={(v) => update('verifiedProfilesOnly', v)}
          />
          {prefs.locationMode === 'nearby' && (
            <>
              <CardDivider />
              <ToggleRow
                label="Expand search when limited"
                desc="Broaden discovery if few matches are found nearby"
                iconName="search-outline"
                iconBg="#F59E0B"
                value={prefs.expandSearchWhenLimited}
                onChange={(v) => update('expandSearchWhenLimited', v)}
              />
            </>
          )}
        </Section>

        {/* ── 5. Family & Children ── */}
        <Section icon="people-outline" label="Family & Children" accent="#22C55E">
          <Text style={[styles.subLabel, { color: th.text }]}>Already has children?</Text>
          <View style={styles.chipRow}>
            {HAS_CHILDREN_OPTS.map(({ key, label, icon }) => (
              <Chip
                key={key}
                label={label}
                icon={icon}
                isActive={prefs.hasChildrenPreference === key}
                onPress={() => update('hasChildrenPreference', key)}
                accent="#22C55E"
              />
            ))}
          </View>
          <CardDivider />
          <Text style={[styles.subLabel, { color: th.text }]}>Wants children?</Text>
          <View style={styles.chipRow}>
            {WANTS_CHILDREN_OPTS.map(({ key, label }) => (
              <Chip
                key={key}
                label={label}
                isActive={prefs.wantsChildrenPreference === key}
                onPress={() => update('wantsChildrenPreference', key)}
                accent="#22C55E"
              />
            ))}
          </View>
        </Section>

        {/* ── 6. Religion ── */}
        <Section icon="prism-outline" label="Religion" accent="#A020F0">
          <Text style={[styles.helperText, { color: th.textSecondary }]}>Leave empty to see all. Select one or more.</Text>
          <View style={styles.chipRow}>
            {RELIGION_OPTIONS.map((r) => (
              <Chip
                key={r}
                label={r}
                isActive={prefs.religionPreferences.includes(r)}
                onPress={() => handleToggleReligion(r)}
                accent="#A020F0"
              />
            ))}
          </View>
        </Section>

        {/* ── 7. Background & Culture ── */}
        <Section icon="globe-outline" label="Background & Culture" accent="#FF4FA3">
          <Text style={[styles.subLabel, { color: th.text }]}>Ethnicity</Text>
          <Text style={[styles.helperText, { color: th.textSecondary }]}>Leave empty to see all backgrounds.</Text>
          <EthnicityMultiSelectPicker
            selected={prefs.ethnicityPreferences}
            onChange={(items: EthnicityOption[]) => update('ethnicityPreferences', items)}
            accentColor={colors.secondary}
            textColor={th.text}
            mutedColor={th.textMuted}
            borderColor={th.border}
            surfaceColor={th.surface}
          />
          <CardDivider />
          <Text style={[styles.subLabel, { color: th.text }]}>Languages spoken</Text>
          <Text style={[styles.helperText, { color: th.textSecondary }]}>Leave empty to see all languages.</Text>
          <LanguageMultiSelectPicker
            selected={prefs.languagePreferences}
            onChange={(items: LanguageOption[]) => update('languagePreferences', items)}
            accentColor={colors.secondary}
            textColor={th.text}
            mutedColor={th.textMuted}
            borderColor={th.border}
            surfaceColor={th.surface}
          />
        </Section>

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
  saveHeaderBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    minWidth: 56,
    alignItems: 'center',
  },
  saveHeaderBtnText: { fontSize: 13, fontWeight: '700', color: colors.surface },
  saveBtnPlaceholder: { width: 56 },

  // ── Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: 48,
    gap: 6,
  },

  // ── Section wrapper
  section: {
    gap: 6,
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  sectionIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#8A2CFF',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardDivider: { height: 1, marginVertical: 2 },

  // ── Helper / sub-labels
  helperText: { fontSize: 13, lineHeight: 18, marginTop: -4 },
  subLabel: { fontSize: 15, fontWeight: '600' },

  // ── Location grid
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  locationTile: {
    width: '47%',
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: spacing.sm + 2,
    gap: 4,
    position: 'relative',
  },
  locationTileIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  locationTileLabel: { fontSize: 15, fontWeight: '700' },
  locationTileDesc: { fontSize: 12 },
  locationTileCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  countryPicker: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: 4,
  },

  // ── Age display
  ageDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  ageDisplayBox: { alignItems: 'center', gap: 2 },
  ageDisplayNum: { fontSize: 36, fontWeight: '800', lineHeight: 40 },
  ageDisplayUnit: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  ageDisplaySep: { width: 1, height: 40, marginHorizontal: 4 },

  // ── Sliders
  slidersRow: { flexDirection: 'row', gap: spacing.md },
  sliderCol: { flex: 1, gap: 2 },
  sliderLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sliderLabel: { fontSize: 12, fontWeight: '600' },
  slider: { width: '100%', height: 36 },
  sliderEndRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
  sliderEndText: { fontSize: 11 },

  // ── Distance
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  distanceValue: { fontSize: 22, fontWeight: '800' },
  distanceHint: { fontSize: 13 },

  // ── Toggle rows
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  toggleTextWrap: { flex: 1, gap: 3 },
  toggleLabel: { fontSize: 15, fontWeight: '600' },
  toggleDesc: { fontSize: 13, lineHeight: 18 },

  // ── Chip row
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  chipLabel: { fontSize: 13, fontWeight: '600' },

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
    marginTop: 8,
  },
  saveFullText: { fontSize: fontSize.md, fontWeight: '800', color: colors.surface, letterSpacing: 0.3 },
});
