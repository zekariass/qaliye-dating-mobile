/**
 * Screen 3 — Additional Preferences (Step 2 of 3)
 *
 * Collects lifestyle and compatibility dimensions:
 * smoking, drinking, marriage timeline, long-distance, family involvement,
 * religion importance, willing to relocate, and notes for the matchmaker.
 */
import MatchmakingTabBar from '@/components/matchmaking/MatchmakingTabBar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useMatchmakingWizardStore } from '@/stores/matchmaking-wizard-store';

// ─── Option definitions ───────────────────────────────────────────────────────

const SMOKING_OPTIONS = [
  { value: 'NO', label: 'Non-smoker' },
  { value: 'OCCASIONALLY', label: 'Occasional smoker' },
  { value: 'TRYING_TO_QUIT', label: 'Trying to quit' },
  { value: 'YES', label: 'Smoker' },
];

const DRINKING_OPTIONS = [
  { value: 'NO', label: "Doesn't drink" },
  { value: 'SOCIALLY', label: 'Social drinker' },
  { value: 'OCCASIONALLY', label: 'Occasional drinker' },
  { value: 'YES', label: 'Regular drinker' },
];

const MARRIAGE_TIMELINE_OPTIONS = [
  { value: null, label: 'No preference' },
  { value: 'NOW', label: 'Now — ready for marriage' },
  { value: 'ONE_TO_TWO_YEARS', label: 'Within 1–2 years' },
  { value: 'THREE_TO_FIVE_YEARS', label: 'Within 3–5 years' },
  { value: 'NOT_SURE', label: 'Not sure yet' },
];

const YES_NO_OPTIONS = [
  { value: null, label: 'No preference' },
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
];

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
function PreferenceSelect({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: string | null;
  options: { value: string | null; label: string }[];
  onChange: (v: string | null) => void;
}) {
  const { colors: th } = useTheme();
  const [open, setOpen] = useState(false);
  const displayLabel = options.find((o) => o.value === value)?.label ?? 'No preference';

  return (
    <>
      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: th.textSecondary }]}>{label}</Text>
        {description && (
          <Text style={[styles.fieldDescription, { color: th.textMuted }]}>{description}</Text>
        )}
        <TouchableOpacity
          style={[styles.selector, { backgroundColor: th.surface, borderColor: th.border }]}
          onPress={() => setOpen(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={[styles.selectorText, { color: value ? th.text : th.textMuted }]}>
            {displayLabel}
          </Text>
          <Ionicons name="chevron-down" size={18} color={th.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={[styles.modalSheet, { backgroundColor: th.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: th.border }]} />
            <Text style={[styles.modalTitle, { color: th.text }]}>{label}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((opt, i) => {
                const isSelected = opt.value === value;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.modalOption,
                      { borderBottomColor: th.border },
                      isSelected && { backgroundColor: colors.primary + '0E' },
                    ]}
                    onPress={() => { onChange(opt.value); setOpen(false); }}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      { color: isSelected ? colors.primary : th.text },
                      isSelected && { fontWeight: '700' },
                    ]}>
                      {opt.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
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
  description,
  values,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  values: string[];
  options: { value: string; label: string }[];
  onChange: (v: string[]) => void;
}) {
  const { colors: th } = useTheme();
  const [open, setOpen] = useState(false);

  const summaryText =
    values.length === 0
      ? 'Any'
      : values.length === 1
        ? (options.find((o) => o.value === values[0])?.label ?? values[0])
        : `${values.length} selected`;

  const toggle = (val: string) => {
    onChange(values.includes(val) ? values.filter((v) => v !== val) : [...values, val]);
  };

  return (
    <>
      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: th.textSecondary }]}>{label}</Text>
        {description && (
          <Text style={[styles.fieldDescription, { color: th.textMuted }]}>{description}</Text>
        )}
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

// ─── Section divider ──────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  const { colors: th } = useTheme();
  return (
    <Text style={[styles.sectionLabel, { color: th.textMuted }]}>{text}</Text>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function MatchmakingPreferencesAdditionalScreen() {
  const router = useRouter();
  const { colors: th } = useTheme();
  const { additional, setAdditional } = useMatchmakingWizardStore();

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
          <ProgressDots step={2} total={3} />

          <View style={styles.introBlock}>
            <Text style={[styles.screenTitle, { color: th.text }]}>Lifestyle & Values</Text>
            <Text style={[styles.sectionSub, { color: th.textSecondary }]}>
              These help us find people who share your lifestyle and expectations.
            </Text>
          </View>

          {/* ── Lifestyle ─────────────────────────────────────── */}
          <SectionLabel text="LIFESTYLE" />

          <MultiSelect
            label="Smoking"
            description="What smoking habits are you comfortable with?"
            values={additional.smoking_preferences}
            options={SMOKING_OPTIONS}
            onChange={(v) => setAdditional({ smoking_preferences: v })}
          />

          <MultiSelect
            label="Drinking"
            description="What drinking habits are you comfortable with?"
            values={additional.drinking_preferences}
            options={DRINKING_OPTIONS}
            onChange={(v) => setAdditional({ drinking_preferences: v })}
          />

          {/* ── Compatibility dims ───────────────────────────── */}
          <SectionLabel text="COMPATIBILITY" />

          <PreferenceSelect
            label="Marriage timeline"
            description="How soon are you looking to marry?"
            value={additional.marriage_timeline}
            options={MARRIAGE_TIMELINE_OPTIONS}
            onChange={(v) => setAdditional({ marriage_timeline: v })}
          />

          <PreferenceSelect
            label="Long-distance relationship"
            description="Are you open to a long-distance relationship?"
            value={additional.long_distance_relationship}
            options={YES_NO_OPTIONS}
            onChange={(v) => setAdditional({ long_distance_relationship: v })}
          />

          <PreferenceSelect
            label="Family involvement"
            description="Do you expect family to be involved in the process?"
            value={additional.family_involvement}
            options={YES_NO_OPTIONS}
            onChange={(v) => setAdditional({ family_involvement: v })}
          />

          <PreferenceSelect
            label="Religion important"
            description="Is shared religion important to you?"
            value={additional.religion_important}
            options={YES_NO_OPTIONS}
            onChange={(v) => setAdditional({ religion_important: v })}
          />

          <PreferenceSelect
            label="Willing to relocate"
            description="Are you willing to relocate for the right person?"
            value={additional.willing_to_relocate}
            options={YES_NO_OPTIONS}
            onChange={(v) => setAdditional({ willing_to_relocate: v })}
          />

          {/* ── Notes for matchmaker ─────────────────────────── */}
          <SectionLabel text="NOTES FOR YOUR MATCHMAKER" />

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: th.textSecondary }]}>Anything else to share?</Text>
            <Text style={[styles.fieldDescription, { color: th.textMuted }]}>
              Optional. Tell your matchmaker anything that might help them find the right person for you.
            </Text>
            <TextInput
              style={[
                styles.notesInput,
                { backgroundColor: th.surface, borderColor: th.border, color: th.text },
              ]}
              value={additional.user_notes ?? ''}
              onChangeText={(t) => setAdditional({ user_notes: t.length > 0 ? t : null })}
              placeholder="E.g. Prefer someone based in Addis or willing to relocate..."
              placeholderTextColor={th.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={[styles.charCount, { color: th.textMuted }]}>
              {(additional.user_notes ?? '').length} / 500
            </Text>
          </View>
        </ScrollView>

        {/* Footer — Back + Next */}
        <View style={[styles.footer, { borderTopColor: th.border }]}>
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.backFooterBtn, { borderColor: th.border }]}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={[styles.backFooterText, { color: th.textSecondary }]}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(app)/shimgilina-review' as never)}
              activeOpacity={0.85}
            >
              <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>
          </View>
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
  introBlock: { gap: 6 },
  screenTitle: { fontSize: 20, fontWeight: '700' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: spacing.xs },
  sectionSub: { fontSize: 14, lineHeight: 20 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '600' },
  fieldDescription: { fontSize: 12, lineHeight: 17 },
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
  notesInput: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 110,
  },
  charCount: { fontSize: 12, textAlign: 'right' },
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
  modalFooter: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  modalDoneBtn: { borderRadius: radius.xl, paddingVertical: 14, alignItems: 'center' },
  modalDoneText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  footer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  footerRow: { flexDirection: 'row', gap: spacing.md },
  backFooterBtn: { flex: 1, borderRadius: radius.xl, paddingVertical: 18, alignItems: 'center', borderWidth: 1.5 },
  backFooterText: { fontSize: 16, fontWeight: '600' },
  nextBtn: { flex: 2, borderRadius: radius.xl, paddingVertical: 18, alignItems: 'center' },
  nextText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
