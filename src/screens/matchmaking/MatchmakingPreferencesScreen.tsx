/**
 * Screen 2 — Basic Preferences (Step 1 of 3)
 *
 * Collects: age range, height range, preferred location, religion (multi),
 * education (multi), marital status (multi), children preferences.
 * Saves draft to the wizard store on "Next" → navigates to Additional Preferences.
 */
import MatchmakingTabBar from '@/components/matchmaking/MatchmakingTabBar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CountryMultiSelectPicker } from '@/components/catalog/CountryMultiSelectPicker';
import { colors, radius, spacing } from '@/constants/theme';
import { useMatchmakingPreferences } from '@/hooks/matchmaking/useMatchmakingPreferences';
import { useTheme } from '@/hooks/use-theme';
import { useMatchmakingWizardStore } from '@/stores/matchmaking-wizard-store';
import type { HasChildrenPreference, WantsChildrenPreference } from '@/types/matchmaking';

// ─── Option definitions ───────────────────────────────────────────────────────

const RELIGION_OPTIONS = [
  { value: 'ORTHODOX_CHRISTIAN', label: 'Orthodox Christian' },
  { value: 'PROTESTANT', label: 'Protestant' },
  { value: 'CATHOLIC', label: 'Catholic' },
  { value: 'MUSLIM', label: 'Muslim' },
  { value: 'TRADITIONAL', label: 'Traditional' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

const EDUCATION_OPTIONS = [
  { value: 'HIGH_SCHOOL', label: 'High School' },
  { value: 'DIPLOMA', label: 'Diploma' },
  { value: 'BACHELORS', label: "Bachelor's" },
  { value: 'MASTERS', label: "Master's" },
  { value: 'DOCTORATE', label: 'Doctorate' },
  { value: 'OTHER', label: 'Other' },
];

const MARITAL_OPTIONS = [
  { value: 'NEVER_MARRIED', label: 'Never married' },
  { value: 'DIVORCED', label: 'Divorced' },
  { value: 'WIDOWED', label: 'Widowed' },
  { value: 'SEPARATED', label: 'Separated' },
];

const HAS_CHILDREN_OPTIONS: { value: HasChildrenPreference; label: string }[] = [
  { value: 'any', label: 'No preference' },
  { value: 'yes', label: 'Has children' },
  { value: 'no', label: "Doesn't have children" },
];

const WANTS_CHILDREN_OPTIONS: { value: WantsChildrenPreference; label: string }[] = [
  { value: 'any', label: 'No preference' },
  { value: 'yes', label: 'Wants children' },
  { value: 'no', label: "Doesn't want children" },
  { value: 'not_sure', label: 'Not sure' },
  { value: 'open_to_discussion', label: 'Open to discussion' },
];

const AGE_OPTIONS = Array.from({ length: 63 }, (_, i) => i + 18); // 18–80
const HEIGHT_OPTIONS = Array.from({ length: 101 }, (_, i) => i + 140); // 140–240 cm

// ─── Progress dots ────────────────────────────────────────────────────────────
function ProgressDots({ step, total }: { step: number; total: number }) {
  const { colors: th } = useTheme();
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            {
              backgroundColor: i < step ? colors.primary : th.border,
              width: i < step ? 24 : 10,
            },
          ]}
        />
      ))}
      <Text style={[styles.progressLabel, { color: th.textSecondary }]}>
        {step} of {total}
      </Text>
    </View>
  );
}

// ─── Single-select dropdown modal ─────────────────────────────────────────────

type SelectOption<T extends string> = { value: T; label: string };

function SingleSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
}) {
  const { colors: th } = useTheme();
  const [open, setOpen] = useState(false);
  const displayLabel = options.find((o) => o.value === value)?.label ?? 'No preference';

  return (
    <>
      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: th.textSecondary }]}>{label}</Text>
        <TouchableOpacity
          style={[styles.selector, { backgroundColor: th.surface, borderColor: th.border }]}
          onPress={() => setOpen(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={[styles.selectorText, { color: th.text }]}>{displayLabel}</Text>
          <Ionicons name="chevron-down" size={18} color={th.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: th.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: th.border }]} />
            <Text style={[styles.modalTitle, { color: th.text }]}>{label}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: th.border },
                    opt.value === value && { backgroundColor: colors.primary + '0E' },
                  ]}
                  onPress={() => { onChange(opt.value); setOpen(false); }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    { color: opt.value === value ? colors.primary : th.text },
                    opt.value === value && { fontWeight: '700' },
                  ]}>
                    {opt.label}
                  </Text>
                  {opt.value === value && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Multi-select chip/check modal ────────────────────────────────────────────

function MultiSelect({
  label,
  values,
  options,
  onChange,
  anyLabel = 'Any',
}: {
  label: string;
  values: string[];
  options: { value: string; label: string }[];
  onChange: (v: string[]) => void;
  anyLabel?: string;
}) {
  const { colors: th } = useTheme();
  const [open, setOpen] = useState(false);

  const summaryText =
    values.length === 0
      ? anyLabel
      : values.length === 1
        ? (options.find((o) => o.value === values[0])?.label ?? values[0])
        : `${values.length} selected`;

  const toggle = (val: string) => {
    onChange(
      values.includes(val) ? values.filter((v) => v !== val) : [...values, val],
    );
  };

  return (
    <>
      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: th.textSecondary }]}>{label}</Text>
        <TouchableOpacity
          style={[styles.selector, { backgroundColor: th.surface, borderColor: th.border }]}
          onPress={() => setOpen(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={[styles.selectorText, { color: values.length === 0 ? th.textMuted : th.text }]}>
            {summaryText}
          </Text>
          <Ionicons name="chevron-down" size={18} color={th.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: th.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: th.border }]} />
            <View style={styles.modalTitleRow}>
              <Text style={[styles.modalTitle, { color: th.text }]}>{label}</Text>
              {values.length > 0 && (
                <TouchableOpacity onPress={() => onChange([])} activeOpacity={0.7}>
                  <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((opt) => {
                const isChecked = values.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.modalOption,
                      { borderBottomColor: th.border },
                      isChecked && { backgroundColor: colors.primary + '0E' },
                    ]}
                    onPress={() => toggle(opt.value)}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      { color: isChecked ? colors.primary : th.text },
                      isChecked && { fontWeight: '700' },
                    ]}>
                      {opt.label}
                    </Text>
                    <View style={[
                      styles.checkbox,
                      { borderColor: isChecked ? colors.primary : th.border },
                      isChecked && { backgroundColor: colors.primary },
                    ]}>
                      {isChecked && <Ionicons name="checkmark" size={13} color="#FFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={[styles.modalFooter, { borderTopColor: th.border }]}>
              <TouchableOpacity
                style={[styles.modalDoneBtn, { backgroundColor: colors.primary }]}
                onPress={() => setOpen(false)}
              >
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Age range selector ───────────────────────────────────────────────────────
function AgeRangeSelector({
  minAge,
  maxAge,
  onMinChange,
  onMaxChange,
}: {
  minAge: number;
  maxAge: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
}) {
  const { colors: th } = useTheme();
  const [openMin, setOpenMin] = useState(false);
  const [openMax, setOpenMax] = useState(false);

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: th.textSecondary }]}>Preferred age</Text>
      <View style={styles.rangeRow}>
        <TouchableOpacity
          style={[styles.rangePicker, { backgroundColor: th.surface, borderColor: th.border }]}
          onPress={() => setOpenMin(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.selectorText, { color: th.text }]}>{minAge}</Text>
          <Ionicons name="chevron-down" size={16} color={th.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.rangeDash, { color: th.textMuted }]}>to</Text>
        <TouchableOpacity
          style={[styles.rangePicker, { backgroundColor: th.surface, borderColor: th.border }]}
          onPress={() => setOpenMax(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.selectorText, { color: th.text }]}>{maxAge}</Text>
          <Ionicons name="chevron-down" size={16} color={th.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal visible={openMin} transparent animationType="slide" onRequestClose={() => setOpenMin(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpenMin(false)}>
          <View style={[styles.modalSheet, { backgroundColor: th.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: th.border }]} />
            <Text style={[styles.modalTitle, { color: th.text }]}>Minimum Age</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {AGE_OPTIONS.filter((a) => a < maxAge).map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.modalOption, { borderBottomColor: th.border }, a === minAge && { backgroundColor: colors.primary + '0E' }]}
                  onPress={() => { onMinChange(a); setOpenMin(false); }}
                >
                  <Text style={[styles.modalOptionText, { color: a === minAge ? colors.primary : th.text }, a === minAge && { fontWeight: '700' }]}>{a}</Text>
                  {a === minAge && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={openMax} transparent animationType="slide" onRequestClose={() => setOpenMax(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpenMax(false)}>
          <View style={[styles.modalSheet, { backgroundColor: th.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: th.border }]} />
            <Text style={[styles.modalTitle, { color: th.text }]}>Maximum Age</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {AGE_OPTIONS.filter((a) => a > minAge).map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.modalOption, { borderBottomColor: th.border }, a === maxAge && { backgroundColor: colors.primary + '0E' }]}
                  onPress={() => { onMaxChange(a); setOpenMax(false); }}
                >
                  <Text style={[styles.modalOptionText, { color: a === maxAge ? colors.primary : th.text }, a === maxAge && { fontWeight: '700' }]}>{a}</Text>
                  {a === maxAge && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Height range selector ────────────────────────────────────────────────────
function HeightRangeSelector({
  minHeight,
  maxHeight,
  onMinChange,
  onMaxChange,
}: {
  minHeight: number | null;
  maxHeight: number | null;
  onMinChange: (v: number | null) => void;
  onMaxChange: (v: number | null) => void;
}) {
  const { colors: th } = useTheme();
  const [openMin, setOpenMin] = useState(false);
  const [openMax, setOpenMax] = useState(false);

  const minLabel = minHeight != null ? `${minHeight} cm` : 'Any';
  const maxLabel = maxHeight != null ? `${maxHeight} cm` : 'Any';

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: th.textSecondary }]}>Preferred height</Text>
      <View style={styles.rangeRow}>
        <TouchableOpacity
          style={[styles.rangePicker, { backgroundColor: th.surface, borderColor: th.border }]}
          onPress={() => setOpenMin(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.selectorText, { color: minHeight != null ? th.text : th.textMuted }]}>{minLabel}</Text>
          <Ionicons name="chevron-down" size={16} color={th.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.rangeDash, { color: th.textMuted }]}>to</Text>
        <TouchableOpacity
          style={[styles.rangePicker, { backgroundColor: th.surface, borderColor: th.border }]}
          onPress={() => setOpenMax(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.selectorText, { color: maxHeight != null ? th.text : th.textMuted }]}>{maxLabel}</Text>
          <Ionicons name="chevron-down" size={16} color={th.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal visible={openMin} transparent animationType="slide" onRequestClose={() => setOpenMin(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpenMin(false)}>
          <View style={[styles.modalSheet, { backgroundColor: th.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: th.border }]} />
            <Text style={[styles.modalTitle, { color: th.text }]}>Minimum Height</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.modalOption, { borderBottomColor: th.border }, minHeight == null && { backgroundColor: colors.primary + '0E' }]}
                onPress={() => { onMinChange(null); setOpenMin(false); }}
              >
                <Text style={[styles.modalOptionText, { color: minHeight == null ? colors.primary : th.text }, minHeight == null && { fontWeight: '700' }]}>Any</Text>
                {minHeight == null && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
              {HEIGHT_OPTIONS.filter((h) => maxHeight == null || h < maxHeight).map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[styles.modalOption, { borderBottomColor: th.border }, h === minHeight && { backgroundColor: colors.primary + '0E' }]}
                  onPress={() => { onMinChange(h); setOpenMin(false); }}
                >
                  <Text style={[styles.modalOptionText, { color: h === minHeight ? colors.primary : th.text }, h === minHeight && { fontWeight: '700' }]}>{h} cm</Text>
                  {h === minHeight && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={openMax} transparent animationType="slide" onRequestClose={() => setOpenMax(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpenMax(false)}>
          <View style={[styles.modalSheet, { backgroundColor: th.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: th.border }]} />
            <Text style={[styles.modalTitle, { color: th.text }]}>Maximum Height</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.modalOption, { borderBottomColor: th.border }, maxHeight == null && { backgroundColor: colors.primary + '0E' }]}
                onPress={() => { onMaxChange(null); setOpenMax(false); }}
              >
                <Text style={[styles.modalOptionText, { color: maxHeight == null ? colors.primary : th.text }, maxHeight == null && { fontWeight: '700' }]}>Any</Text>
                {maxHeight == null && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
              {HEIGHT_OPTIONS.filter((h) => minHeight == null || h > minHeight).map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[styles.modalOption, { borderBottomColor: th.border }, h === maxHeight && { backgroundColor: colors.primary + '0E' }]}
                  onPress={() => { onMaxChange(h); setOpenMax(false); }}
                >
                  <Text style={[styles.modalOptionText, { color: h === maxHeight ? colors.primary : th.text }, h === maxHeight && { fontWeight: '700' }]}>{h} cm</Text>
                  {h === maxHeight && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function MatchmakingPreferencesScreen() {
  const router = useRouter();
  const { colors: th } = useTheme();
  const hydrated = useRef(false);

  const { data: apiPrefs, isLoading } = useMatchmakingPreferences();
  const { basic, setBasic, hydrateFromApi } = useMatchmakingWizardStore();

  // Hydrate from saved API prefs once on first mount (if not already hydrated by intro screen)
  useEffect(() => {
    if (hydrated.current || isLoading) return;
    hydrated.current = true;
    if (apiPrefs) hydrateFromApi(apiPrefs);
  }, [apiPrefs, isLoading, hydrateFromApi]);

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: th.background }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
        </SafeAreaView>
        <MatchmakingTabBar activeTab="requests" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: th.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: th.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={th.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: th.text }]}>Matchmaking Preferences</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ProgressDots step={1} total={3} />

          <Text style={[styles.sectionTitle, { color: th.text }]}>Who would you like to meet?</Text>

          {/* Age */}
          <AgeRangeSelector
            minAge={basic.min_age}
            maxAge={basic.max_age}
            onMinChange={(v) => setBasic({ min_age: v })}
            onMaxChange={(v) => setBasic({ max_age: v })}
          />

          {/* Height */}
          <HeightRangeSelector
            minHeight={basic.min_height_cm}
            maxHeight={basic.max_height_cm}
            onMinChange={(v) => setBasic({ min_height_cm: v })}
            onMaxChange={(v) => setBasic({ max_height_cm: v })}
          />

          {/* Location */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: th.textSecondary }]}>Preferred location</Text>
            <CountryMultiSelectPicker
              selected={basic.specific_country_codes}
              onChange={(codes) => setBasic({ specific_country_codes: codes })}
              accentColor={colors.primary}
              textColor={th.text}
              mutedColor={th.textMuted}
              borderColor={th.border}
              surfaceColor={th.surface}
              placeholder="Any country"
            />
          </View>

          {/* Religion — multi-select */}
          <MultiSelect
            label="Religion"
            values={basic.religion_preferences}
            options={RELIGION_OPTIONS}
            onChange={(v) => setBasic({ religion_preferences: v })}
          />

          {/* Education — multi-select */}
          <MultiSelect
            label="Education"
            values={basic.education_levels}
            options={EDUCATION_OPTIONS}
            onChange={(v) => setBasic({ education_levels: v })}
          />

          {/* Marital status — multi-select */}
          <MultiSelect
            label="Marital status"
            values={basic.marital_statuses}
            options={MARITAL_OPTIONS}
            onChange={(v) => setBasic({ marital_statuses: v })}
          />

          {/* Has children */}
          <SingleSelect
            label="Do they have children?"
            value={basic.has_children_preference}
            options={HAS_CHILDREN_OPTIONS}
            onChange={(v) => setBasic({ has_children_preference: v as HasChildrenPreference })}
          />

          {/* Wants children */}
          <SingleSelect
            label="Do they want children?"
            value={basic.wants_children_preference}
            options={WANTS_CHILDREN_OPTIONS}
            onChange={(v) => setBasic({ wants_children_preference: v as WantsChildrenPreference })}
          />
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: th.border }]}>
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(app)/shimgilina-preferences-additional' as never)}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>Next</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <MatchmakingTabBar activeTab="requests" />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressDot: { height: 8, borderRadius: 4 },
  progressLabel: { marginLeft: 4, fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: spacing.xs },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '600' },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  selectorText: { fontSize: 16, flex: 1, marginRight: 8 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rangePicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  rangeDash: { fontSize: 16, fontWeight: '500' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: '75%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  clearText: { fontSize: 14, fontWeight: '600' },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalOptionText: { fontSize: 16, flex: 1 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalDoneBtn: {
    borderRadius: radius.xl,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalDoneText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  footer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  cta: { borderRadius: radius.xl, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
