import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { z } from 'zod';

import { fetchProfileMe, updateBasicProfile } from '@/api/profileApi';
import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Gender, RelationshipIntention, ResidencyType } from '@/types/api';

type Props = { onComplete: () => Promise<void>; isCompleted: boolean };

// ─── Zod schema ──────────────────────────────────────────────────────────────

const schema = z
  .object({
    display_name: z
      .string()
      .min(1, 'Display name is required.')
      .max(50, 'Must be 50 characters or less.'),
    gender: z.enum(['MALE', 'FEMALE'] as const, {
      error: 'Please select your gender.',
    }),
    dob_day: z
      .string()
      .min(1, 'Day is required.')
      .refine((v) => /^\d+$/.test(v), { message: 'Numbers only.' })
      .refine((v) => { const n = parseInt(v, 10); return n >= 1 && n <= 31; }, { message: 'Day must be 1–31.' }),
    dob_month: z
      .string()
      .min(1, 'Month is required.')
      .refine((v) => /^\d+$/.test(v), { message: 'Numbers only.' })
      .refine((v) => { const n = parseInt(v, 10); return n >= 1 && n <= 12; }, { message: 'Month must be 1–12.' }),
    dob_year: z
      .string()
      .min(1, 'Year is required.')
      .refine((v) => /^\d{4}$/.test(v), { message: 'Enter a 4-digit year.' })
      .refine((v) => parseInt(v, 10) >= 1900, { message: 'Enter a valid year.' }),
    residency_type: z.enum(['ETHIOPIA', 'ERITREA', 'DIASPORA'] as const, {
      error: 'Please select where you are based.',
    }),
    relationship_intention: z.enum(
      ['MARRIAGE', 'SERIOUS_RELATIONSHIP', 'LONG_TERM', 'FRIENDSHIP', 'NOT_SURE_YET'] as const,
      { error: 'Please select what you are looking for.' },
    ),
  })
  .superRefine((data, ctx) => {
    const d = parseInt(data.dob_day, 10);
    const m = parseInt(data.dob_month, 10);
    const y = parseInt(data.dob_year, 10);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return;

    // Calendar check: catches Feb 30, Apr 31, etc.
    const dob = new Date(y, m - 1, d);
    if (dob.getFullYear() !== y || dob.getMonth() !== m - 1 || dob.getDate() !== d) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${d} is not a valid day for month ${m}.`,
        path: ['dob_day'],
      });
      return;
    }

    // Age ≥ 18
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 18);
    if (dob > cutoff) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'You must be at least 18 years old.',
        path: ['dob_year'],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

// ─── Constants ───────────────────────────────────────────────────────────────

const GENDERS: { labelKey: string; value: Gender; icon: 'male' | 'female' }[] = [
  { labelKey: 'onboarding.basicProfile.genderMan', value: 'MALE', icon: 'male' },
  { labelKey: 'onboarding.basicProfile.genderWoman', value: 'FEMALE', icon: 'female' },
];

const RESIDENCY: { labelKey: string; value: ResidencyType; flag: string }[] = [
  { labelKey: 'onboarding.basicProfile.residencyEthiopia', value: 'ETHIOPIA', flag: '🇪🇹' },
  { labelKey: 'onboarding.basicProfile.residencyEritrea', value: 'ERITREA', flag: '🇪🇷' },
  { labelKey: 'onboarding.basicProfile.residencyDiaspora', value: 'DIASPORA', flag: '✈️' },
];

const INTENTIONS: { labelKey: string; value: RelationshipIntention; icon: string }[] = [
  { labelKey: 'onboarding.basicProfile.lookingForMarriage', value: 'MARRIAGE', icon: '💍' },
  { labelKey: 'onboarding.basicProfile.lookingForRelationship', value: 'SERIOUS_RELATIONSHIP', icon: '❤️' },
  { labelKey: 'onboarding.basicProfile.lookingForRelationship', value: 'LONG_TERM', icon: '🌱' },
  { labelKey: 'onboarding.basicProfile.lookingForRelationship', value: 'FRIENDSHIP', icon: '🤝' },
  { labelKey: 'onboarding.basicProfile.lookingForNotSure', value: 'NOT_SURE_YET', icon: '🌟' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function BasicProfileStep({ onComplete, isCompleted }: Props) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const currentYear = new Date().getFullYear();
  const maxYear = currentYear - 18;

  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { display_name: '', dob_day: '', dob_month: '', dob_year: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const [isPrefilling, setIsPrefilling] = useState(isCompleted);

  // Prefill form from backend when step was already completed
  useEffect(() => {
    if (!isCompleted) return;
    setIsPrefilling(true);
    fetchProfileMe()
      .then((profile) => {
        const [year, month, day] = profile.date_of_birth.split('-');
        reset({
          display_name: profile.display_name,
          gender: profile.gender as 'MALE' | 'FEMALE',
          dob_day: String(parseInt(day, 10)),
          dob_month: String(parseInt(month, 10)),
          dob_year: year,
          residency_type: profile.residency_type,
          relationship_intention: profile.relationship_intention,
        });
      })
      .catch(() => { /* prefill failed — form stays empty and user fills manually */ })
      .finally(() => setIsPrefilling(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  const onSubmit = async (values: FormValues) => {
    // If step was completed and form is unchanged, navigate forward without an API call
    if (isCompleted && !isDirty) {
      await onComplete();
      return;
    }
    const d = parseInt(values.dob_day, 10);
    const m = parseInt(values.dob_month, 10);
    const y = parseInt(values.dob_year, 10);
    try {
      await updateBasicProfile({
        display_name: values.display_name.trim(),
        gender: values.gender,
        date_of_birth: `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        residency_type: values.residency_type,
        relationship_intention: values.relationship_intention,
      });
      await onComplete();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError('root', {
        message: err?.response?.data?.message ?? err?.message ?? 'Something went wrong. Please try again.',
      });
    }
  };

  const saveLabel = isCompleted && isDirty ? t('onboarding.basicProfile.saveAndContinue') : t('onboarding.basicProfile.continue');

  // Combine the first DOB error to show under the row
  const dobError =
    errors.dob_day?.message ?? errors.dob_month?.message ?? errors.dob_year?.message;

  if (isPrefilling) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: th.text }]}>
          {isCompleted ? t('onboarding.basicProfile.titleEdit') : t('onboarding.basicProfile.titleNew')}
        </Text>
        <Text style={[styles.subtitle, { color: th.textSecondary }]}>
          {isCompleted ? t('onboarding.basicProfile.subtitleEdit') : t('onboarding.basicProfile.subtitleNew')}
        </Text>

        {/* Display name */}
        <Text style={[styles.label, { color: th.textMuted }]}>{t('onboarding.basicProfile.displayName')}</Text>
        <Controller
          control={control}
          name="display_name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[
                styles.input,
                { backgroundColor: th.backgroundElement, borderColor: errors.display_name ? '#FF6B6B' : th.border, color: th.text },
              ]}
              value={value}
              onChangeText={onChange}
              placeholder={t('onboarding.basicProfile.displayNamePlaceholder')}
              placeholderTextColor={th.textMuted}
              autoCapitalize="words"
              returnKeyType="done"
              maxLength={50}
            />
          )}
        />
        {errors.display_name && <FieldError message={errors.display_name.message} />}

        {/* Gender */}
        <Text style={[styles.label, { color: th.textMuted }]}>{t('onboarding.basicProfile.gender')}</Text>
        <Controller
          control={control}
          name="gender"
          render={({ field: { onChange, value } }) => (
            <View style={styles.genderRow}>
              {GENDERS.map((g) => {
                const sel = value === g.value;
                return (
                  <TouchableOpacity
                    key={g.value}
                    style={[
                      styles.genderCard,
                      {
                        backgroundColor: sel ? colors.primary : th.surface,
                        borderColor: errors.gender ? '#FF6B6B' : sel ? colors.primary : th.border,
                      },
                    ]}
                    onPress={() => onChange(g.value)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={g.icon} size={32} color={sel ? '#FFFFFF' : th.text} style={{ opacity: sel ? 1 : 0.55 }} />
                    <Text style={[styles.genderLabel, { color: sel ? '#FFFFFF' : th.text }]}>{t(g.labelKey)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        />
        {errors.gender && <FieldError message={errors.gender.message} />}

        {/* Date of birth */}
        <Text style={[styles.label, { color: th.textMuted }]}>{t('onboarding.basicProfile.dob')}</Text>
        <View style={styles.dobRow}>
          {/* Day */}
          <View style={styles.dobCol}>
            <Text style={[styles.dobFieldLabel, { color: th.textMuted }]}>{t('onboarding.basicProfile.dobDay')}</Text>
            <Controller
              control={control}
              name="dob_day"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[
                    styles.dobInput,
                    {
                      backgroundColor: th.backgroundElement,
                      borderColor: errors.dob_day ? '#FF6B6B' : th.border,
                      color: th.text,
                    },
                  ]}
                  value={value}
                  onChangeText={(v) => {
                    let c = v.replace(/\D/g, '').slice(0, 2);
                    const n = parseInt(c, 10);
                    if (!isNaN(n) && n > 31) c = '31';
                    onChange(c);
                    if (c.length === 2) monthRef.current?.focus();
                  }}
                  placeholder="DD"
                  placeholderTextColor={th.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                  textAlign="center"
                />
              )}
            />
          </View>
          <Text style={[styles.dobSep, { color: th.border }]}>/</Text>
          {/* Month */}
          <View style={styles.dobCol}>
            <Text style={[styles.dobFieldLabel, { color: th.textMuted }]}>{t('onboarding.basicProfile.dobMonth')}</Text>
            <Controller
              control={control}
              name="dob_month"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  ref={monthRef}
                  style={[
                    styles.dobInput,
                    {
                      backgroundColor: th.backgroundElement,
                      borderColor: errors.dob_month ? '#FF6B6B' : th.border,
                      color: th.text,
                    },
                  ]}
                  value={value}
                  onChangeText={(v) => {
                    let c = v.replace(/\D/g, '').slice(0, 2);
                    const n = parseInt(c, 10);
                    if (!isNaN(n) && n > 12) c = '12';
                    onChange(c);
                    if (c.length === 2) yearRef.current?.focus();
                  }}
                  placeholder="MM"
                  placeholderTextColor={th.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                  textAlign="center"
                />
              )}
            />
          </View>
          <Text style={[styles.dobSep, { color: th.border }]}>/</Text>
          {/* Year */}
          <View style={[styles.dobCol, { flex: 2 }]}>
            <Text style={[styles.dobFieldLabel, { color: th.textMuted }]}>{t('onboarding.basicProfile.dobYear')}</Text>
            <Controller
              control={control}
              name="dob_year"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  ref={yearRef}
                  style={[
                    styles.dobInput,
                    {
                      backgroundColor: th.backgroundElement,
                      borderColor: errors.dob_year ? '#FF6B6B' : th.border,
                      color: th.text,
                    },
                  ]}
                  value={value}
                  onChangeText={(v) => {
                    let c = v.replace(/\D/g, '').slice(0, 4);
                    if (c.length === 4) {
                      const n = parseInt(c, 10);
                      if (!isNaN(n) && n > maxYear) c = String(maxYear);
                    }
                    onChange(c);
                  }}
                  placeholder="YYYY"
                  placeholderTextColor={th.textMuted}
                  keyboardType="number-pad"
                  maxLength={4}
                  textAlign="center"
                />
              )}
            />
          </View>
        </View>
        {dobError && <FieldError message={dobError} />}

        {/* Residency */}
        <Text style={[styles.label, { color: th.textMuted }]}>{t('onboarding.basicProfile.residency')}</Text>
        <Controller
          control={control}
          name="residency_type"
          render={({ field: { onChange, value } }) => (
            <View style={styles.chipRow}>
              {RESIDENCY.map((r) => {
                const sel = value === r.value;
                return (
                  <TouchableOpacity
                    key={r.value}
                    style={[
                      styles.flagChip,
                      {
                        backgroundColor: sel ? th.backgroundSelected : th.surface,
                        borderColor: errors.residency_type ? '#FF6B6B' : sel ? colors.primary : th.border,
                      },
                    ]}
                    onPress={() => onChange(r.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.flagEmoji}>{r.flag}</Text>
                    <Text style={[styles.flagLabel, { color: sel ? colors.primary : th.text }]}>{t(r.labelKey)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        />
        {errors.residency_type && <FieldError message={errors.residency_type.message} />}

        {/* Relationship intention */}
        <Text style={[styles.label, { color: th.textMuted }]}>{t('onboarding.basicProfile.lookingFor')}</Text>
        <Controller
          control={control}
          name="relationship_intention"
          render={({ field: { onChange, value } }) => (
            <View style={styles.intentionCol}>
              {INTENTIONS.map((i) => {
                const sel = value === i.value;
                return (
                  <TouchableOpacity
                    key={i.value}
                    style={[
                      styles.intentionRow,
                      {
                        backgroundColor: sel ? th.backgroundSelected : th.surface,
                        borderColor: errors.relationship_intention ? '#FF6B6B' : sel ? colors.primary : th.border,
                      },
                    ]}
                    onPress={() => onChange(i.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.intentionEmoji}>{i.icon}</Text>
                    <Text style={[styles.intentionText, { color: sel ? colors.primary : th.text }]}>{t(i.labelKey)}</Text>
                    {sel && <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        />
        {errors.relationship_intention && <FieldError message={errors.relationship_intention.message} />}

        {/* Server / root error */}
        {errors.root && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" />
            <Text style={styles.errorText}>{errors.root.message}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btn, isSubmitting && styles.btnDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnText}>{saveLabel}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={styles.fieldErrorRow}>
      <Ionicons name="alert-circle" size={12} color="#FF6B6B" />
      <Text style={styles.fieldErrorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.4,
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },

  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  input: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
  },

  genderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderCard: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  genderLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  dobRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  dobCol: { flex: 1 },
  dobFieldLabel: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 5,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  dobInput: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 14,
    fontSize: 16,
  },
  dobSep: {
    fontSize: 22,
    paddingBottom: 10,
    fontWeight: '300',
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  flagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderRadius: radius.full,
    borderWidth: 1.5,
    gap: 7,
  },
  flagEmoji: { fontSize: 17 },
  flagLabel: { fontSize: 14, fontWeight: '600' },

  intentionCol: { gap: spacing.sm },
  intentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: spacing.sm,
  },
  intentionEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  intentionText: { fontSize: 15, fontWeight: '500' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,80,80,0.08)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  errorText: { color: '#FF6B6B', fontSize: 13, flex: 1 },

  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.lg,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  btnDisabled: { opacity: 0.55 },
  btnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },

  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
    marginBottom: 2,
  },
  fieldErrorText: { color: '#FF6B6B', fontSize: 12, flex: 1 },
});
