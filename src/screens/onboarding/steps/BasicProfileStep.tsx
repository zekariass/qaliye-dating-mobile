import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { fetchProfileMe, updateBasicProfile } from '@/api/profileApi';
import { InterestPicker } from '@/components/profile/InterestPicker';
import { colors, radius, spacing } from '@/constants/theme';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useTheme } from '@/hooks/use-theme';
import {
    DatePickerField,
    LabeledField,
    RowPair,
    SectionCard,
    SectionTitle,
    SelectField,
    TextInputField,
} from '@/screens/profile/edit/FormComponents';
import {
    ACTIVITY_OPTIONS,
    DRINKING_OPTIONS,
    EDUCATION_OPTIONS,
    RELIGION_OPTIONS,
    SMOKING_OPTIONS,
} from '@/screens/profile/mockEditProfile';
import { Gender, RelationshipIntention } from '@/types/api';
import { sanitizeInterests } from '@/utils/interests';
import {
    ACTIVITY_API_TO_LABEL,
    ACTIVITY_LABEL_TO_API,
    DRINKING_API_TO_LABEL,
    DRINKING_LABEL_TO_API,
    EDUCATION_API_TO_LABEL,
    EDUCATION_LABEL_TO_API,
    RELIGION_API_TO_LABEL,
    RELIGION_LABEL_TO_API,
    SMOKING_API_TO_LABEL,
    SMOKING_LABEL_TO_API,
} from '@/utils/profileMappers';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SCREEN_WIDTH = Dimensions.get('window').width;

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
    date_of_birth: z
      .string()
      .min(1, 'Date of birth is required.')
      .refine((v) => /^\d{1,2}\s+\w{3}\s+\d{4}$/.test(v), { message: 'Please select a valid date.' })
      .refine((v) => {
        const match = v.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
        if (!match) return false;
        const day = parseInt(match[1], 10);
        const monthIdx = MONTHS_SHORT.indexOf(match[2]);
        const year = parseInt(match[3], 10);
        if (monthIdx < 0) return false;
        const dob = new Date(year, monthIdx, day);
        return dob.getFullYear() === year && dob.getMonth() === monthIdx && dob.getDate() === day;
      }, { message: 'Invalid date.' })
      .refine((v) => {
        const match = v.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
        if (!match) return false;
        const day = parseInt(match[1], 10);
        const monthIdx = MONTHS_SHORT.indexOf(match[2]);
        const year = parseInt(match[3], 10);
        if (monthIdx < 0) return false;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const eighteenthBirthday = new Date(year + 18, monthIdx, day);
        return eighteenthBirthday <= today;
      }, { message: 'You must be at least 18 years old.' }),
    relationship_intention: z.enum(
      ['MARRIAGE', 'SERIOUS_RELATIONSHIP', 'LONG_TERM', 'FRIENDSHIP', 'NOT_SURE_YET'] as const,
      { error: 'Please select what you are looking for.' },
    ),
    religion: z.string().optional(),
    smoking_detail: z.string().optional(),
    drinking_detail: z.string().optional(),
    activity_level: z.string().optional(),
    education_level: z.string().optional(),
    occupation: z.string().max(100, 'Must be 100 characters or less.').optional(),
  })

type FormValues = z.infer<typeof schema>;

// ─── Constants ───────────────────────────────────────────────────────────────

const GENDERS: { labelKey: string; value: Gender; icon: 'male' | 'female' }[] = [
  { labelKey: 'onboarding.basicProfile.genderMan', value: 'MALE', icon: 'male' },
  { labelKey: 'onboarding.basicProfile.genderWoman', value: 'FEMALE', icon: 'female' },
];

const INTENTIONS: { labelKey: string; value: RelationshipIntention; icon: string }[] = [
  { labelKey: 'onboarding.basicProfile.lookingForMarriage', value: 'MARRIAGE', icon: '💍' },
  { labelKey: 'onboarding.basicProfile.lookingForRelationship', value: 'SERIOUS_RELATIONSHIP', icon: '❤️' },
  { labelKey: 'onboarding.basicProfile.lookingForLongTerm', value: 'LONG_TERM', icon: '🌱' },
  { labelKey: 'onboarding.basicProfile.lookingForFriendship', value: 'FRIENDSHIP', icon: '🤝' },
  { labelKey: 'onboarding.basicProfile.lookingForNotSure', value: 'NOT_SURE_YET', icon: '🌟' },
];

const TOTAL_STEPS = 8;

// ─── Component ───────────────────────────────────────────────────────────────

export default function BasicProfileStep({ onComplete, isCompleted }: Props) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const { sem } = useSemanticTheme();
  const insets = useSafeAreaInsets();

  const {
    control,
    handleSubmit,
    setError,
    reset,
    trigger,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { display_name: '', date_of_birth: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const [isPrefilling, setIsPrefilling] = useState(isCompleted);
  const [subStep, setSubStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Prefill form from backend when step was already completed
  useEffect(() => {
    if (!isCompleted) return;
    setIsPrefilling(true);
    fetchProfileMe()
      .then((profile) => {
        const [year, month, day] = profile.date_of_birth.split('-');
        const d = parseInt(day, 10);
        const m = parseInt(month, 10);
        const dobDisplay = `${d} ${MONTHS_SHORT[m - 1]} ${year}`;
        reset({
          display_name: profile.display_name,
          gender: profile.gender as 'MALE' | 'FEMALE',
          date_of_birth: dobDisplay,
          relationship_intention: profile.relationship_intention,
          religion: profile.religion ? (RELIGION_API_TO_LABEL[profile.religion] ?? '') : '',
          smoking_detail: profile.smoking_detail ? (SMOKING_API_TO_LABEL[profile.smoking_detail] ?? '') : '',
          drinking_detail: profile.drinking_detail ? (DRINKING_API_TO_LABEL[profile.drinking_detail] ?? '') : '',
          activity_level: profile.activity_level ? (ACTIVITY_API_TO_LABEL[profile.activity_level] ?? '') : '',
          education_level: profile.education_level ? (EDUCATION_API_TO_LABEL[profile.education_level] ?? '') : '',
          occupation: profile.occupation ?? '',
        });
        setSelectedInterests(sanitizeInterests(profile.interests));
      })
      .catch(() => { /* prefill failed — form stays empty and user fills manually */ })
      .finally(() => setIsPrefilling(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  const goToStep = (newStep: number) => {
    const direction = newStep > subStep ? 1 : -1;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: direction * SCREEN_WIDTH * 0.3,
        duration: 150,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSubStep(newStep);
      slideAnim.setValue(direction * -SCREEN_WIDTH * 0.3);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleToggleInterest = (val: string) => {
    setSelectedInterests((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  };

  const handleNext = async () => {
    const fieldToValidate: (keyof FormValues)[] = ['display_name', 'gender', 'date_of_birth', 'relationship_intention'];
    if (subStep < fieldToValidate.length) {
      const valid = await trigger(fieldToValidate[subStep]);
      if (valid && subStep < TOTAL_STEPS - 1) {
        goToStep(subStep + 1);
      }
    } else if (subStep < TOTAL_STEPS - 1) {
      goToStep(subStep + 1);
    }
  };

  const handleBack = () => {
    if (subStep > 0) goToStep(subStep - 1);
  };

  const onSubmit = async (values: FormValues) => {
    if (isCompleted && !isDirty) {
      await onComplete();
      return;
    }
    const match = values.date_of_birth.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
    const day = parseInt(match![1], 10);
    const monthIdx = MONTHS_SHORT.indexOf(match![2]);
    const year = parseInt(match![3], 10);
    try {
      await updateBasicProfile({
        display_name: values.display_name.trim(),
        gender: values.gender,
        date_of_birth: `${String(year).padStart(4, '0')}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        relationship_intention: values.relationship_intention,
        interests: sanitizeInterests(selectedInterests),
        religion: values.religion ? (RELIGION_LABEL_TO_API[values.religion] ?? null) : null,
        education_level: values.education_level ? (EDUCATION_LABEL_TO_API[values.education_level] ?? null) : null,
        occupation: values.occupation?.trim() || null,
        smoking_detail: values.smoking_detail ? (SMOKING_LABEL_TO_API[values.smoking_detail] ?? null) : null,
        drinking_detail: values.drinking_detail ? (DRINKING_LABEL_TO_API[values.drinking_detail] ?? null) : null,
        activity_level: values.activity_level ? (ACTIVITY_LABEL_TO_API[values.activity_level] ?? null) : null,
      });
      await onComplete();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError('root', {
        message: err?.response?.data?.message ?? err?.message ?? 'Something went wrong. Please try again.',
      });
    }
  };

  const handleSubmitPress = () => {
    handleSubmit(onSubmit)();
  };

  const saveLabel = isCompleted && isDirty ? t('onboarding.basicProfile.saveAndContinue') : t('onboarding.basicProfile.continue');
  const isLastStep = subStep === TOTAL_STEPS - 1;

  if (isPrefilling) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom + spacing.md : 0}
    >
      {/* Progress dots */}
      <View style={styles.progressContainer}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              {
                backgroundColor: i <= subStep ? colors.primary : th.border,
                width: i === subStep ? 28 : 8,
              },
            ]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xxxl + insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
        >
          {/* Step 0: Display Name */}
          {subStep === 0 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="person-outline" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.stepSubtitle, { color: th.textSecondary }]}>
                {t('onboarding.basicProfile.subtitleNew')}
              </Text>
              <Text style={[styles.stepTitle, { color: th.text }]}>
                {t('onboarding.basicProfile.displayName')}
              </Text>
              <Controller
                control={control}
                name="display_name"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[
                      styles.bigInput,
                      {
                        backgroundColor: th.backgroundElement,
                        borderColor: errors.display_name ? '#FF6B6B' : th.border,
                        color: th.text,
                      },
                    ]}
                    value={value}
                    onChangeText={onChange}
                    placeholder={t('onboarding.basicProfile.displayNamePlaceholder')}
                    placeholderTextColor={th.textMuted}
                    autoCapitalize="words"
                    returnKeyType="done"
                    maxLength={50}
                    autoFocus
                  />
                )}
              />
              {errors.display_name && <FieldError message={errors.display_name.message} />}
            </View>
          )}

          {/* Step 1: Gender */}
          {subStep === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="people-outline" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.stepSubtitle, { color: th.textSecondary }]}>
                {t('onboarding.basicProfile.subtitleNew')}
              </Text>
              <Text style={[styles.stepTitle, { color: th.text }]}>
                {t('onboarding.basicProfile.gender')}
              </Text>
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
                          <Ionicons name={g.icon} size={48} color={sel ? '#FFFFFF' : th.text} style={{ opacity: sel ? 1 : 0.55 }} />
                          <Text style={[styles.genderLabel, { color: sel ? '#FFFFFF' : th.text }]}>
                            {t(g.labelKey)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              />
              {errors.gender && <FieldError message={errors.gender.message} />}
            </View>
          )}

          {/* Step 2: Date of Birth */}
          {subStep === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="calendar-outline" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.stepSubtitle, { color: th.textSecondary }]}>
                {t('onboarding.basicProfile.subtitleNew')}
              </Text>
              <Text style={[styles.stepTitle, { color: th.text }]}>
                {t('onboarding.basicProfile.dob')}
              </Text>
              <Controller
                control={control}
                name="date_of_birth"
                render={({ field: { onChange, value } }) => (
                  <DatePickerField
                    value={value}
                    onSelect={onChange}
                    sem={sem}
                    placeholder="DD MMM YYYY"
                  />
                )}
              />
              {errors.date_of_birth && <FieldError message={errors.date_of_birth.message} />}
            </View>
          )}

          {/* Step 3: Relationship Intention */}
          {subStep === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="heart-outline" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.stepSubtitle, { color: th.textSecondary }]}>
                {t('onboarding.basicProfile.subtitleNew')}
              </Text>
              <Text style={[styles.stepTitle, { color: th.text }]}>
                {t('onboarding.basicProfile.lookingFor')}
              </Text>
              <Controller
                control={control}
                name="relationship_intention"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.intentionList}>
                    {INTENTIONS.map((i) => {
                      const sel = value === i.value;
                      return (
                        <TouchableOpacity
                          key={i.value}
                          style={[
                            styles.intentionRow,
                            {
                              backgroundColor: sel ? colors.primary : th.surface,
                              borderColor: errors.relationship_intention ? '#FF6B6B' : sel ? colors.primary : th.border,
                            },
                          ]}
                          onPress={() => onChange(i.value)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.intentionEmoji}>{i.icon}</Text>
                          <Text style={[styles.intentionText, { color: sel ? '#FFFFFF' : th.text }]}>{t(i.labelKey)}</Text>
                          {sel && <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginLeft: 'auto' }} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              />
              {errors.relationship_intention && <FieldError message={errors.relationship_intention.message} />}
            </View>
          )}

          {/* Step 4: Interests */}
          {subStep === 4 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="color-palette-outline" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.stepSubtitle, { color: th.textSecondary }]}>
                {t('onboarding.basicProfile.interestsSubtitle')}
              </Text>
              <Text style={[styles.stepTitle, { color: th.text }]}>
                {t('onboarding.basicProfile.interests')}
              </Text>
              <View style={{ width: '100%' }}>
                <InterestPicker
                  selected={selectedInterests}
                  onToggle={handleToggleInterest}
                  sem={sem}
                />
              </View>
            </View>
          )}

          {/* Step 5: Religion */}
          {subStep === 5 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="leaf-outline" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.stepSubtitle, { color: th.textSecondary }]}>
                {t('onboarding.basicProfile.religionSubtitle')}
              </Text>
              <Text style={[styles.stepTitle, { color: th.text }]}>
                {t('onboarding.basicProfile.religion')}
              </Text>
              <View style={{ width: '100%' }}>
                <SectionCard sem={sem}>
                  <LabeledField label={t('onboarding.basicProfile.religionLabel')} sem={sem}>
                    <Controller
                      control={control}
                      name="religion"
                      render={({ field: { onChange, value } }) => (
                        <SelectField
                          value={value ?? ''}
                          options={RELIGION_OPTIONS}
                          onSelect={onChange}
                          sem={sem}
                          leftIcon="leaf-outline"
                          placeholder={t('onboarding.basicProfile.religionPlaceholder')}
                        />
                      )}
                    />
                  </LabeledField>
                </SectionCard>
              </View>
            </View>
          )}

          {/* Step 6: Lifestyle (Smoking, Drinking, Activity Level) */}
          {subStep === 6 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="fitness-outline" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.stepSubtitle, { color: th.textSecondary }]}>
                {t('onboarding.basicProfile.lifestyleSubtitle')}
              </Text>
              <Text style={[styles.stepTitle, { color: th.text }]}>
                {t('onboarding.basicProfile.lifestyle')}
              </Text>
              <View style={{ width: '100%' }}>
                <SectionCard sem={sem}>
                  <SectionTitle title={t('onboarding.basicProfile.habits')} sem={sem} />
                  <RowPair>
                    <LabeledField label={t('onboarding.basicProfile.smoking')} sem={sem}>
                      <Controller
                        control={control}
                        name="smoking_detail"
                        render={({ field: { onChange, value } }) => (
                          <SelectField
                            value={value ?? ''}
                            options={SMOKING_OPTIONS}
                            onSelect={onChange}
                            sem={sem}
                            leftIcon="ban-outline"
                            placeholder={t('onboarding.basicProfile.smokingPlaceholder')}
                          />
                        )}
                      />
                    </LabeledField>
                    <LabeledField label={t('onboarding.basicProfile.drinking')} sem={sem}>
                      <Controller
                        control={control}
                        name="drinking_detail"
                        render={({ field: { onChange, value } }) => (
                          <SelectField
                            value={value ?? ''}
                            options={DRINKING_OPTIONS}
                            onSelect={onChange}
                            sem={sem}
                            leftIcon="wine-outline"
                            placeholder={t('onboarding.basicProfile.drinkingPlaceholder')}
                          />
                        )}
                      />
                    </LabeledField>
                  </RowPair>
                  <LabeledField label={t('onboarding.basicProfile.activityLevel')} sem={sem} flex={false}>
                    <Controller
                      control={control}
                      name="activity_level"
                      render={({ field: { onChange, value } }) => (
                        <SelectField
                          value={value ?? ''}
                          options={ACTIVITY_OPTIONS}
                          onSelect={onChange}
                          sem={sem}
                          leftIcon="fitness-outline"
                          placeholder={t('onboarding.basicProfile.activityLevelPlaceholder')}
                        />
                      )}
                    />
                  </LabeledField>
                </SectionCard>
              </View>
            </View>
          )}

          {/* Step 7: Education & Occupation */}
          {subStep === 7 && (
            <View style={styles.stepContainer}>
              <View style={styles.iconCircle}>
                <Ionicons name="school-outline" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.stepSubtitle, { color: th.textSecondary }]}>
                {t('onboarding.basicProfile.educationOccupationSubtitle')}
              </Text>
              <Text style={[styles.stepTitle, { color: th.text }]}>
                {t('onboarding.basicProfile.educationOccupation')}
              </Text>
              <View style={{ width: '100%' }}>
                <SectionCard sem={sem}>
                  <SectionTitle title={t('onboarding.basicProfile.educationWork')} sem={sem} />
                  <LabeledField label={t('onboarding.basicProfile.educationLevel')} sem={sem} flex={false}>
                    <Controller
                      control={control}
                      name="education_level"
                      render={({ field: { onChange, value } }) => (
                        <SelectField
                          value={value ?? ''}
                          options={EDUCATION_OPTIONS}
                          onSelect={onChange}
                          sem={sem}
                          leftIcon="school-outline"
                          placeholder={t('onboarding.basicProfile.educationLevelPlaceholder')}
                        />
                      )}
                    />
                  </LabeledField>
                  <View style={{ height: spacing.md }} />
                  <LabeledField label={t('onboarding.basicProfile.occupation')} sem={sem} flex={false}>
                    <Controller
                      control={control}
                      name="occupation"
                      render={({ field: { onChange, value } }) => (
                        <TextInputField
                          value={value ?? ''}
                          onChangeText={onChange}
                          sem={sem}
                          leftIcon="briefcase-outline"
                          placeholder={t('onboarding.basicProfile.occupationPlaceholder')}
                        />
                      )}
                    />
                  </LabeledField>
                </SectionCard>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Server / root error */}
        {errors.root && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" />
            <Text style={styles.errorText}>{errors.root.message}</Text>
          </View>
        )}

        {/* Navigation buttons */}
        <View style={styles.navRow}>
          {subStep > 0 && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={th.text} />
              <Text style={[styles.backBtnText, { color: th.text }]}>{t('common.back')}</Text>
            </TouchableOpacity>
          )}

          {!isLastStep ? (
            <TouchableOpacity
              style={[styles.nextBtn, { marginLeft: subStep > 0 ? spacing.sm : 0 }]}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.nextBtnText}>{t('onboarding.basicProfile.continue')}</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextBtn, { marginLeft: subStep > 0 ? spacing.sm : 0 }, isSubmitting && styles.btnDisabled]}
              onPress={handleSubmitPress}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>{saveLabel}</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <View style={styles.fieldErrorRow}>
      <Ionicons name="alert-circle" size={14} color="#FF6B6B" />
      <Text style={styles.fieldErrorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  // Progress dots
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  progressDot: {
    height: 8,
    borderRadius: 4,
  },

  // Step container
  stepContainer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    minHeight: 300,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  stepSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },

  // Big input
  bigInput: {
    borderWidth: 2,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 18,
    fontSize: 20,
    width: '100%',
    fontWeight: '500',
  },

  // Gender cards (bigger)
  genderRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  genderCard: {
    flex: 1,
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  genderLabel: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Intention rows
  intentionList: {
    gap: 6,
    width: '100%',
  },
  intentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: spacing.sm,
  },
  intentionEmoji: { fontSize: 18 },
  intentionText: { fontSize: 15, fontWeight: '600' },

  // Error
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
  errorText: { color: '#FF6B6B', fontSize: 14, flex: 1 },

  // Navigation
  navRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  nextBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  btnDisabled: { opacity: 0.55 },

  // Field error
  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: spacing.sm,
    width: '100%',
  },
  fieldErrorText: { color: '#FF6B6B', fontSize: 13, flex: 1 },
});
