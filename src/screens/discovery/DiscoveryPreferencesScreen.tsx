import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useMeStore } from '@/stores/me-store';

// ---------------------------------------------------------------------------
// Types matching discovery_preferences schema
// ---------------------------------------------------------------------------
type DiscoveryMode = 'STANDARD' | 'GLOBAL' | 'INCOGNITO';
type InterestedInGender = 'MALE' | 'FEMALE';
type ResidencyType = 'ETHIOPIA' | 'ERITREA' | 'DIASPORA';

interface Preferences {
  discovery_mode: DiscoveryMode;
  interested_in_gender: InterestedInGender;
  min_age: number;
  max_age: number;
  max_distance_km: number;
  preferred_residency_types: ResidencyType[];
  open_to_long_distance: boolean;
  open_to_relocation: boolean;
  show_verified_only: boolean;
}

const DEFAULT_PREFS: Preferences = {
  discovery_mode: 'STANDARD',
  interested_in_gender: 'FEMALE',
  min_age: 18,
  max_age: 45,
  max_distance_km: 10000,
  preferred_residency_types: [],
  open_to_long_distance: false,
  open_to_relocation: false,
  show_verified_only: false,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function SectionCard({ children, surface, border }: { children: React.ReactNode; surface: string; border: string }) {
  return <View style={[styles.card, { backgroundColor: surface, borderWidth: 1, borderColor: border }]}>{children}</View>;
}

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function useT() { return useTheme(); }

function CheckChip({
  label,
  checked,
  onToggle,
  surface = '#F7EEFF',
  border = '#E9DDF8',
  textColor = '#6B7280',
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  surface?: string;
  border?: string;
  textColor?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: surface, borderColor: border }, checked && styles.chipActive]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      {checked && <Text style={styles.chipCheck}>&#10003; </Text>}
      <Text style={[styles.chipLabel, { color: textColor }, checked && styles.chipLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToggleRow({
  label,
  desc,
  iconName,
  iconBg,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconBg: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { colors: th } = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.toggleIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={18} color={colors.surface} />
      </View>
      <View style={styles.toggleText}>
        <Text style={[styles.toggleLabel, { color: th.text }]}>{label}</Text>
        <Text style={[styles.toggleDesc, { color: th.textSecondary }]}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primaryLight }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
function getOppositeGender(userGender: string): InterestedInGender {
  return userGender === 'FEMALE' ? 'MALE' : 'FEMALE';
}

export default function DiscoveryPreferencesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors: th } = useT();
  const meStore = useMeStore();

  const userGender = (meStore.data?.profile?.gender as string | undefined) ?? null;

  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

  // Auto-lock opposite gender based on user's profile
  useEffect(() => {
    if (userGender) {
      setPrefs((p) => ({ ...p, interested_in_gender: getOppositeGender(userGender) }));
    }
  }, [userGender]);

  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    setPrefs((p) => ({ ...p, [key]: value }));

  const toggleResidency = (type: ResidencyType) => {
    setPrefs((p) => ({
      ...p,
      preferred_residency_types: p.preferred_residency_types.includes(type)
        ? p.preferred_residency_types.filter((r) => r !== type)
        : [...p.preferred_residency_types, type],
    }));
  };

  const handleSave = () => {
    // TODO: call PATCH /api/v1/discovery-preferences with prefs
    Alert.alert('', t('discovery.preferences.saved'));
    router.back();
  };

  const modeOptions: { key: DiscoveryMode; label: string }[] = [
    { key: 'STANDARD', label: t('discovery.preferences.standard') },
    { key: 'GLOBAL',   label: t('discovery.preferences.global') },
    { key: 'INCOGNITO',label: t('discovery.preferences.incognito') },
  ];

  const residencyOptions: { key: ResidencyType; label: string }[] = [
    { key: 'ETHIOPIA', label: t('discovery.preferences.residencyEthiopia') },
    { key: 'ERITREA',  label: t('discovery.preferences.residencyEritrea') },
    { key: 'DIASPORA', label: t('discovery.preferences.residencyDiaspora') },
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.backgroundElement }]} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: th.surface, borderBottomColor: th.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: th.text }]}>{t('discovery.preferences.title')}</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Discovery Mode ── */}
        <SectionCard surface={th.surface} border={th.border}>
          <SectionTitle label={t('discovery.preferences.discoveryMode')} />
          <View style={styles.modeGrid}>
            {modeOptions.map((opt) => {
              const active = prefs.discovery_mode === opt.key;
              const modeIcons: Record<DiscoveryMode, React.ComponentProps<typeof Ionicons>['name']> = {
                STANDARD: 'location-outline',
                GLOBAL: 'globe-outline',
                INCOGNITO: 'eye-off-outline',
              };
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.modeCard, { backgroundColor: th.backgroundElement, borderColor: th.border }, active && styles.modeCardActive]}
                  onPress={() => set('discovery_mode', opt.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={modeIcons[opt.key]}
                    size={22}
                    color={active ? colors.surface : colors.textSecondary}
                  />
                  <Text style={[styles.modeCardText, active && styles.modeCardTextActive]}>
                    {opt.label}
                  </Text>
                  {active && <View style={styles.modeActiveDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.modeDesc, { color: th.textSecondary }]}>
            {prefs.discovery_mode === 'STANDARD' && t('discovery.preferences.standardDesc')}
            {prefs.discovery_mode === 'GLOBAL'   && t('discovery.preferences.globalDesc')}
            {prefs.discovery_mode === 'INCOGNITO'&& t('discovery.preferences.incognitoDesc')}
          </Text>
        </SectionCard>

        {/* ── Interested In (locked) ── */}
        <SectionCard surface={th.surface} border={th.border}>
          <View style={styles.lockedGenderHeader}>
            <Ionicons name="lock-closed" size={12} color={colors.primary} />
            <Text style={[styles.lockedGenderLabel, { color: th.textMuted }]}>
              {t('discovery.preferences.interestedIn')}
            </Text>
          </View>
          <View style={styles.lockedGenderValue}>
            <Text style={styles.lockedGenderIcon}>
              {prefs.interested_in_gender === 'FEMALE' ? '\u2640\uFE0F' : '\u2642\uFE0F'}
            </Text>
            <Text style={[styles.lockedGenderText, { color: th.text }]}>
              {prefs.interested_in_gender === 'FEMALE'
                ? t('discovery.preferences.women')
                : t('discovery.preferences.men')}
            </Text>
          </View>
          <Text style={[styles.lockedGenderHint, { color: th.textMuted }]}>
            Based on your profile ({userGender === 'MALE' ? 'Man' : userGender === 'FEMALE' ? 'Woman' : 'unknown'}) · Qaliye connects men with women only
          </Text>
        </SectionCard>

        {/* ── Age Range ── */}
        <SectionCard surface={th.surface} border={th.border}>
          <SectionTitle label={t('discovery.preferences.ageRange')} />
          <View style={styles.rangeValueRow}>
            <View style={[styles.rangeValueBox, { backgroundColor: th.backgroundSelected }]}>
              <Text style={styles.rangeValueLabel}>Min</Text>
              <TextInput
                style={styles.rangeInput}
                value={String(prefs.min_age)}
                keyboardType="number-pad"
                maxLength={3}
                onChangeText={(text) => {
                  const n = parseInt(text, 10);
                  if (!isNaN(n) && n >= 18 && n <= prefs.max_age) set('min_age', n);
                }}
                selectTextOnFocus
              />
              <Text style={styles.rangeValueUnit}>yrs</Text>
            </View>
            <View style={styles.rangeDash}>
              <View style={styles.rangeDashLine} />
            </View>
            <View style={[styles.rangeValueBox, { backgroundColor: th.backgroundSelected }]}>
              <Text style={styles.rangeValueLabel}>Max</Text>
              <TextInput
                style={styles.rangeInput}
                value={String(prefs.max_age)}
                keyboardType="number-pad"
                maxLength={3}
                onChangeText={(text) => {
                  const n = parseInt(text, 10);
                  if (!isNaN(n) && n >= prefs.min_age && n <= 100) set('max_age', n);
                }}
                selectTextOnFocus
              />
              <Text style={styles.rangeValueUnit}>yrs</Text>
            </View>
          </View>
          <Text style={[styles.sliderLabel, { color: th.textSecondary }]}>Min age</Text>
          <Slider
            style={styles.slider}
            minimumValue={18}
            maximumValue={100}
            step={1}
            value={prefs.min_age}
            onValueChange={(v: number) => set('min_age', Math.min(Math.round(v), prefs.max_age))}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
          <Text style={[styles.sliderLabel, { color: th.textSecondary }]}>Max age</Text>
          <Slider
            style={styles.slider}
            minimumValue={18}
            maximumValue={100}
            step={1}
            value={prefs.max_age}
            onValueChange={(v: number) => set('max_age', Math.max(Math.round(v), prefs.min_age))}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
        </SectionCard>

        {/* ── Max Distance ── */}
        <SectionCard surface={th.surface} border={th.border}>
          <SectionTitle label={t('discovery.preferences.maxDistance')} />
          <View style={[styles.distanceValueRow, { backgroundColor: th.backgroundSelected }]}>
            <Ionicons name="navigate-circle-outline" size={20} color={colors.primary} />
            <TextInput
              style={styles.distanceInput}
              value={String(prefs.max_distance_km)}
              keyboardType="number-pad"
              maxLength={5}
              onChangeText={(text) => {
                const n = parseInt(text, 10);
                if (!isNaN(n) && n > 0 && n <= 20000) set('max_distance_km', n);
              }}
              selectTextOnFocus
            />
            <Text style={styles.distanceUnit}>km</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={20000}
            step={50}
            value={prefs.max_distance_km}
            onValueChange={(v: number) => set('max_distance_km', Math.round(v))}
            minimumTrackTintColor={colors.secondary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.secondary}
          />
          <View style={styles.sliderEndLabels}>
            <Text style={styles.sliderEndText}>1 km</Text>
            <Text style={styles.sliderEndText}>20,000 km</Text>
          </View>
        </SectionCard>

        {/* ── Preferred Residency ── */}
        <SectionCard surface={th.surface} border={th.border}>
          <SectionTitle label={t('discovery.preferences.preferredResidency')} />
          <View style={styles.chipRow}>
            {residencyOptions.map((opt) => (
              <CheckChip
                key={opt.key}
                label={opt.label}
                checked={prefs.preferred_residency_types.includes(opt.key)}
                onToggle={() => toggleResidency(opt.key)}
                surface={th.backgroundElement}
                border={th.border}
                textColor={th.textSecondary}
              />
            ))}
          </View>
        </SectionCard>

        {/* ── Toggles ── */}
        <SectionCard surface={th.surface} border={th.border}>
          <ToggleRow
            label={t('discovery.preferences.openToLongDistance')}
            desc={t('discovery.preferences.longDistanceDesc')}
            iconName="globe-outline"
            iconBg="#8A2CFF"
            value={prefs.open_to_long_distance}
            onChange={(v) => set('open_to_long_distance', v)}
          />
          <View style={[styles.divider, { backgroundColor: th.border }]} />
          <ToggleRow
            label={t('discovery.preferences.openToRelocation')}
            desc={t('discovery.preferences.relocationDesc')}
            iconName="home-outline"
            iconBg="#FF4FA3"
            value={prefs.open_to_relocation}
            onChange={(v) => set('open_to_relocation', v)}
          />
          <View style={[styles.divider, { backgroundColor: th.border }]} />
          <ToggleRow
            label={t('discovery.preferences.showVerifiedOnly')}
            desc={t('discovery.preferences.verifiedDesc')}
            iconName="shield-checkmark-outline"
            iconBg="#2F80ED"
            value={prefs.show_verified_only}
            onChange={(v) => set('show_verified_only', v)}
          />
        </SectionCard>

        {/* ── Save button ── */}
        <TouchableOpacity style={styles.saveFull} onPress={handleSave} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.surface} style={{ marginRight: 8 }} />
          <Text style={styles.saveFullText}>{t('discovery.preferences.save')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4EFFE' },

  // ── Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.textPrimary,
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
  scrollContent: { padding: spacing.md, gap: 12, paddingBottom: 40 },

  // ── Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
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

  // ── Discovery mode cards
  modeGrid: { flexDirection: 'row', gap: spacing.sm },
  modeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    gap: 6,
    position: 'relative',
  },
  modeCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeCardText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  modeCardTextActive: { color: colors.surface },
  modeActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    opacity: 0.8,
  },
  modeDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  // ── Locked Gender
  lockedGenderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  lockedGenderLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.primary,
  },
  lockedGenderValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  lockedGenderIcon: { fontSize: 20 },
  lockedGenderText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  lockedGenderHint: {
    fontSize: 12,
    lineHeight: 18,
  },

  // ── Range value display
  rangeValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rangeValueBox: {
    flex: 1,
    backgroundColor: colors.backgroundLavender,
    borderRadius: radius.md,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  rangeValueLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  rangeInput: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    padding: 0,
    minWidth: 50,
  },
  rangeValueUnit: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  rangeDash: { width: 24, alignItems: 'center' },
  rangeDashLine: { width: 16, height: 2, backgroundColor: colors.border, borderRadius: 1 },

  // ── Sliders
  slider: { width: '100%', height: 36 },
  sliderLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginBottom: -8 },
  sliderEndLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  sliderEndText: { fontSize: 11, color: colors.textMuted },

  // ── Distance
  distanceValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLavender,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  distanceInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.secondary,
    textAlign: 'center',
    padding: 0,
  },
  distanceUnit: { fontSize: 15, color: colors.textSecondary, fontWeight: '700' },

  // ── Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
  },
  chipActive: { backgroundColor: colors.backgroundLavender, borderColor: colors.primary },
  chipCheck: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  chipLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  chipLabelActive: { color: colors.primary },

  // ── Toggle rows
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: { flex: 1, gap: 2 },
  toggleLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  toggleDesc: { fontSize: 13, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },

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
  saveFullText: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.surface,
    letterSpacing: 0.3,
  },
});
