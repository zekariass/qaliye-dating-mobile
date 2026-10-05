/**
 * Screen 4 — Review Preferences (Step 3 of 3)
 *
 * Shows a summary of all preferences from the wizard store.
 * "Save Preferences" calls PUT /api/v1/matchmaking/preferences (full replace) →
 * navigates to Submit.
 * "Edit preferences" goes back.
 */
import MatchmakingTabBar from '@/components/matchmaking/MatchmakingTabBar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { themedAlert } from '@/components/common/ThemedAlert';
import { colors, radius, spacing } from '@/constants/theme';
import {
    useUpdateMatchmakingPreferences,
} from '@/hooks/matchmaking/useMatchmakingPreferences';
import { useTheme } from '@/hooks/use-theme';
import { useMatchmakingWizardStore } from '@/stores/matchmaking-wizard-store';
import { extractApiError, getApiErrorMessage, getApiErrorTitle } from '@/utils/apiError';

// ─── Value formatters ─────────────────────────────────────────────────────────

const RELIGION_LABELS: Record<string, string> = {
  ORTHODOX_CHRISTIAN: 'Orthodox Christian',
  PROTESTANT: 'Protestant',
  CATHOLIC: 'Catholic',
  MUSLIM: 'Muslim',
  TRADITIONAL: 'Traditional',
  OTHER: 'Other',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
};

const EDUCATION_LABELS: Record<string, string> = {
  HIGH_SCHOOL: 'High School',
  DIPLOMA: 'Diploma',
  BACHELORS: "Bachelor's",
  MASTERS: "Master's",
  DOCTORATE: 'Doctorate',
  OTHER: 'Other',
};

const MARITAL_LABELS: Record<string, string> = {
  NEVER_MARRIED: 'Never married',
  DIVORCED: 'Divorced',
  WIDOWED: 'Widowed',
  SEPARATED: 'Separated',
};

const HAS_CHILDREN_LABELS: Record<string, string> = {
  any: 'No preference',
  yes: 'Has children',
  no: "Doesn't have children",
};

const WANTS_CHILDREN_LABELS: Record<string, string> = {
  any: 'No preference',
  yes: 'Wants children',
  no: "Doesn't want children",
  not_sure: 'Not sure',
  open_to_discussion: 'Open to discussion',
};

const SMOKING_LABELS: Record<string, string> = {
  NO: 'Non-smoker',
  OCCASIONALLY: 'Occasional smoker',
  TRYING_TO_QUIT: 'Trying to quit',
  YES: 'Smoker',
};

const DRINKING_LABELS: Record<string, string> = {
  NO: "Doesn't drink",
  SOCIALLY: 'Social drinker',
  OCCASIONALLY: 'Occasional drinker',
  YES: 'Regular drinker',
};

const MARRIAGE_LABELS: Record<string, string> = {
  NOW: 'Now — ready for marriage',
  ONE_TO_TWO_YEARS: 'Within 1–2 years',
  THREE_TO_FIVE_YEARS: 'Within 3–5 years',
  NOT_SURE: 'Not sure yet',
};

const YES_NO_LABELS: Record<string, string> = {
  YES: 'Yes',
  NO: 'No',
};

function formatList(arr: string[], labels: Record<string, string>): string {
  if (!arr || arr.length === 0) return 'Any';
  return arr.map((v) => labels[v] ?? v).join(', ');
}

function formatCountries(codes: string[]): string {
  if (!codes || codes.length === 0) return 'Any';
  if (codes.length === 1) return codes[0];
  return `${codes.length} countries`;
}

function formatHeight(min: number | null, max: number | null): string {
  if (min == null && max == null) return 'Any';
  if (min != null && max != null) return `${min}–${max} cm`;
  if (min != null) return `${min}+ cm`;
  return `up to ${max} cm`;
}

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

// ─── Row component ────────────────────────────────────────────────────────────
function PrefRow({ label, value, th }: { label: string; value: string; th: any }) {
  return (
    <View style={[styles.prefRow, { borderBottomColor: th.border }]}>
      <Text style={[styles.prefLabel, { color: th.textSecondary }]}>{label}</Text>
      <Text style={[styles.prefValue, { color: th.text }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function MatchmakingReviewScreen() {
  const router = useRouter();
  const { colors: th } = useTheme();
  const { basic, additional } = useMatchmakingWizardStore();
  const { mutate: savePrefs, isPending } = useUpdateMatchmakingPreferences();

  const handleSave = () => {
    savePrefs(
      {
        // Basic demographic preferences
        min_age: basic.min_age,
        max_age: basic.max_age,
        min_height_cm: basic.min_height_cm ?? undefined,
        max_height_cm: basic.max_height_cm ?? undefined,
        specific_country_codes: basic.specific_country_codes,
        religion_preferences: basic.religion_preferences,
        education_levels: basic.education_levels,
        marital_statuses: basic.marital_statuses,
        has_children_preference: basic.has_children_preference,
        wants_children_preference: basic.wants_children_preference,
        // Lifestyle preferences
        smoking_preferences: additional.smoking_preferences,
        drinking_preferences: additional.drinking_preferences,
        // Compatibility alignment dimensions
        marriage_timeline: additional.marriage_timeline,
        long_distance_relationship: additional.long_distance_relationship,
        family_involvement: additional.family_involvement,
        religion_important: additional.religion_important,
        willing_to_relocate: additional.willing_to_relocate,
        // Notes for matchmaker
        user_notes: additional.user_notes,
      },
      {
        onSuccess: () => {
          router.push('/(app)/shimgilina-request-submit' as never);
        },
        onError: (err) => {
          const detail = extractApiError(err);
          themedAlert({
            title: getApiErrorTitle(detail.code),
            message: getApiErrorMessage(detail),
            icon: 'alert-circle',
            iconColor: colors.danger,
          });
        },
      },
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: th.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: th.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={th.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: th.text }]}>Review Preferences</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ProgressDots step={3} total={3} />

          <View style={styles.introBlock}>
            <Text style={[styles.sectionTitle, { color: th.text }]}>Review your preferences</Text>
            <Text style={[styles.sectionSub, { color: th.textSecondary }]}>
              Make sure everything looks right before saving.
            </Text>
          </View>

          {/* ── Basic Preferences ────────────────────────────── */}
          <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
            <Text style={[styles.cardSectionLabel, { color: th.textMuted }]}>WHO I'M LOOKING FOR</Text>
            <PrefRow label="Age" value={`${basic.min_age} – ${basic.max_age}`} th={th} />
            <PrefRow label="Height" value={formatHeight(basic.min_height_cm, basic.max_height_cm)} th={th} />
            <PrefRow label="Location" value={formatCountries(basic.specific_country_codes)} th={th} />
            <PrefRow label="Religion" value={formatList(basic.religion_preferences, RELIGION_LABELS)} th={th} />
            <PrefRow label="Education" value={formatList(basic.education_levels, EDUCATION_LABELS)} th={th} />
            <PrefRow label="Marital status" value={formatList(basic.marital_statuses, MARITAL_LABELS)} th={th} />
            <PrefRow label="Has children" value={HAS_CHILDREN_LABELS[basic.has_children_preference] ?? 'Any'} th={th} />
            <PrefRow label="Wants children" value={WANTS_CHILDREN_LABELS[basic.wants_children_preference] ?? 'Any'} th={th} />
          </View>

          {/* ── Lifestyle ───────────────────────────────────── */}
          <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
            <Text style={[styles.cardSectionLabel, { color: th.textMuted }]}>LIFESTYLE</Text>
            <PrefRow label="Smoking" value={formatList(additional.smoking_preferences, SMOKING_LABELS)} th={th} />
            <PrefRow label="Drinking" value={formatList(additional.drinking_preferences, DRINKING_LABELS)} th={th} />
          </View>

          {/* ── Compatibility ────────────────────────────────── */}
          <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
            <Text style={[styles.cardSectionLabel, { color: th.textMuted }]}>COMPATIBILITY</Text>
            <PrefRow
              label="Marriage timeline"
              value={additional.marriage_timeline ? (MARRIAGE_LABELS[additional.marriage_timeline] ?? additional.marriage_timeline) : 'No preference'}
              th={th}
            />
            <PrefRow
              label="Long distance"
              value={additional.long_distance_relationship ? (YES_NO_LABELS[additional.long_distance_relationship] ?? additional.long_distance_relationship) : 'No preference'}
              th={th}
            />
            <PrefRow
              label="Family involvement"
              value={additional.family_involvement ? (YES_NO_LABELS[additional.family_involvement] ?? additional.family_involvement) : 'No preference'}
              th={th}
            />
            <PrefRow
              label="Religion important"
              value={additional.religion_important ? (YES_NO_LABELS[additional.religion_important] ?? additional.religion_important) : 'No preference'}
              th={th}
            />
            <PrefRow
              label="Willing to relocate"
              value={additional.willing_to_relocate ? (YES_NO_LABELS[additional.willing_to_relocate] ?? additional.willing_to_relocate) : 'No preference'}
              th={th}
            />
          </View>

          {/* ── Notes for matchmaker ─────────────────────────── */}
          {additional.user_notes && (
            <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
              <Text style={[styles.cardSectionLabel, { color: th.textMuted }]}>NOTES FOR MATCHMAKER</Text>
              <View style={styles.notesRow}>
                <Text style={[styles.notesText, { color: th.text }]}>{additional.user_notes}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: th.border }]}>
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.primary, opacity: isPending ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={isPending}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            {isPending
              ? <ActivityIndicator color="#FFF" size="small" />
              : <Text style={styles.ctaText}>Save & Continue</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit preferences</Text>
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
  introBlock: { gap: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  sectionSub: { fontSize: 14, lineHeight: 20 },
  card: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  prefLabel: { fontSize: 14, flex: 1 },
  prefValue: { fontSize: 14, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  notesRow: { paddingHorizontal: spacing.lg, paddingVertical: 12 },
  notesText: { fontSize: 14, lineHeight: 20 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  cta: {
    borderRadius: radius.xl,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  editBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  editBtnText: { fontSize: 15, fontWeight: '600' },
});
