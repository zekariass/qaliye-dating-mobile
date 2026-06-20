import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { fetchDiscoveryPreferences, updateDiscoveryPreferences } from '@/api/preferencesApi';
import { fetchProfileMe } from '@/api/profileApi';
import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useMeStore } from '@/stores/me-store';
import { DiscoveryPreferencesPayload, InterestedInGender } from '@/types/api';

type Props = { onComplete: () => Promise<void>; isCompleted: boolean };

function getOppositeGender(userGender: string): InterestedInGender {
  return userGender === 'FEMALE' ? 'MALE' : 'FEMALE';
}

export default function PreferencesStep({ onComplete, isCompleted }: Props) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const meStore = useMeStore();

  // ME store gender is the bootstrap snapshot — may be stale for returning users.
  // We override it with a direct backend fetch below; this is just the initial fallback.
  const meStoreGender = (meStore.data?.profile?.gender as string | undefined) ?? null;

  const [userGender, setUserGender] = useState<string | null>(meStoreGender);
  const [interestedIn, setInterestedIn] = useState<InterestedInGender | null>(
    meStoreGender ? getOppositeGender(meStoreGender) : null,
  );
  const [minAge, setMinAge] = useState(22);
  const [maxAge, setMaxAge] = useState(35);
  const [maxDistance, setMaxDistance] = useState(50);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(true);

  // Track initial values to detect dirty state
  const [initialPrefs, setInitialPrefs] = useState<{ min_age: number; max_age: number; max_distance_km: number } | null>(null);

  // Unified prefill: always fetch gender from backend (authoritative), and
  // if step is already completed also fetch saved discovery preferences.
  useEffect(() => {
    const fetchGender = fetchProfileMe().then((profile) => {
      setUserGender(profile.gender);
      setInterestedIn(getOppositeGender(profile.gender));
    }).catch(() => {
      // Fall back to ME store value already set in initial state
    });

    const fetchPrefs = isCompleted
      ? fetchDiscoveryPreferences().then((prefs) => {
          setMinAge(prefs.min_age);
          setMaxAge(prefs.max_age);
          setMaxDistance(prefs.max_distance_km);
          setInitialPrefs({ min_age: prefs.min_age, max_age: prefs.max_age, max_distance_km: prefs.max_distance_km });
        }).catch(() => { /* prefill failed — defaults remain */ })
      : Promise.resolve();

    Promise.allSettled([fetchGender, fetchPrefs]).finally(() => setIsPrefilling(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  const isDirty = !initialPrefs || (
    minAge !== initialPrefs.min_age ||
    maxAge !== initialPrefs.max_age ||
    maxDistance !== initialPrefs.max_distance_km
  );

  const handleSubmit = useCallback(async () => {
    if (!interestedIn) { setError(t('onboarding.preferences.selectWho')); return; }
    // If completed and sliders unchanged, navigate without API call
    if (isCompleted && !isDirty) {
      await onComplete();
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const safeMin = Math.min(minAge, maxAge);
      const safeMax = Math.max(minAge, maxAge);
      const payload: DiscoveryPreferencesPayload = {
        interested_in_gender: interestedIn,
        min_age: safeMin,
        max_age: safeMax,
        max_distance_km: maxDistance,
      };
      await updateDiscoveryPreferences(payload);
      await onComplete();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message ?? err?.message ?? t('onboarding.errorGeneric'));
    } finally {
      setIsSubmitting(false);
    }
  }, [interestedIn, isCompleted, isDirty, minAge, maxAge, maxDistance, onComplete]);

  const ageLabel = `${minAge} – ${maxAge === 80 ? '80+' : maxAge}`;
  const distanceLabel = maxDistance >= 200 ? '200+ km' : `${maxDistance} km`;
  const saveLabel = isCompleted && isDirty ? t('onboarding.preferences.saveAndContinue') : t('onboarding.preferences.continue');

  if (isPrefilling) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: th.text }]}>{t('onboarding.preferences.title')}</Text>
      <Text style={[styles.subtitle, { color: th.textSecondary }]}>
        {t('onboarding.preferences.subtitle')}
      </Text>

      {/* Locked gender preference */}
      <View style={[styles.lockedCard, { backgroundColor: th.surface, borderColor: th.border }]}>
        <View style={styles.lockedCardRow}>
          <Ionicons name="lock-closed" size={14} color={colors.primary} />
          <Text style={[styles.lockedCardLabel, { color: th.textMuted }]}>{t('onboarding.preferences.lockedLabel')}</Text>
        </View>
        <View style={styles.lockedValueRow}>
          <Ionicons
            name={interestedIn === 'MALE' ? 'male' : 'female'}
            size={22}
            color={colors.primary}
          />
          <Text style={[styles.lockedValueText, { color: th.text }]}>
            {interestedIn === 'MALE' ? t('onboarding.preferences.men') : interestedIn === 'FEMALE' ? t('onboarding.preferences.women') : '—'}
          </Text>
        </View>
        <Text style={[styles.lockedCardHint, { color: th.textMuted }]}>
          {t('onboarding.preferences.lockedHint')} ({userGender === 'MALE' ? t('onboarding.preferences.man') : userGender === 'FEMALE' ? t('onboarding.preferences.woman') : 'unknown'})
        </Text>
      </View>

      {/* Age range */}
      <Text style={[styles.label, { color: th.textMuted }]}>{t('onboarding.preferences.ageRange')}</Text>
      <View style={[styles.sliderCard, { backgroundColor: th.surface, borderColor: th.border }]}>
        <View style={styles.sliderHeader}>
          <View style={styles.sliderTitleRow}>
            <Ionicons name="people-outline" size={15} color={th.textSecondary} />
            <Text style={[styles.sliderCardLabel, { color: th.textSecondary }]}>{t('onboarding.preferences.agePreference')}</Text>
          </View>
          <Text style={[styles.sliderCardValue, { color: th.text }]}>{ageLabel}</Text>
        </View>
        <View style={styles.sliderRow}>
          <Text style={[styles.sliderSideLabel, { color: th.textMuted }]}>18</Text>
          <Slider
            style={styles.slider}
            minimumValue={18}
            maximumValue={79}
            step={1}
            value={minAge}
            onValueChange={(v: number) => setMinAge(Math.min(v, maxAge - 1))}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={th.border}
            thumbTintColor={colors.primary}
          />
          <Text style={[styles.sliderSideLabel, { color: th.textMuted }]}>80+</Text>
        </View>
        <View style={styles.sliderRow}>
          <Text style={[styles.sliderSideLabel, { color: th.textMuted }]}>18</Text>
          <Slider
            style={styles.slider}
            minimumValue={19}
            maximumValue={80}
            step={1}
            value={maxAge}
            onValueChange={(v: number) => setMaxAge(Math.max(v, minAge + 1))}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={th.border}
            thumbTintColor={colors.primary}
          />
          <Text style={[styles.sliderSideLabel, { color: th.textMuted }]}>80+</Text>
        </View>
        <View style={styles.ageLabelsRow}>
          <Text style={[styles.ageRangeHint, { color: th.textMuted }]}>{t('onboarding.preferences.min')}: {minAge}</Text>
          <Text style={[styles.ageRangeHint, { color: th.textMuted }]}>{t('onboarding.preferences.max')}: {maxAge === 80 ? '80+' : maxAge}</Text>
        </View>
      </View>

      {/* Max distance */}
      <Text style={[styles.label, { color: th.textMuted }]}>{t('onboarding.preferences.maxDistance')}</Text>
      <View style={[styles.sliderCard, { backgroundColor: th.surface, borderColor: th.border }]}>
        <View style={styles.sliderHeader}>
          <View style={styles.sliderTitleRow}>
            <Ionicons name="location-outline" size={15} color={th.textSecondary} />
            <Text style={[styles.sliderCardLabel, { color: th.textSecondary }]}>{t('onboarding.preferences.distancePreference')}</Text>
          </View>
          <Text style={[styles.sliderCardValue, { color: th.text }]}>{distanceLabel}</Text>
        </View>
        <View style={styles.sliderRow}>
          <Text style={[styles.sliderSideLabel, { color: th.textMuted }]}>5</Text>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={200}
            step={5}
            value={maxDistance}
            onValueChange={(v: number) => setMaxDistance(v)}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={th.border}
            thumbTintColor={colors.primary}
          />
          <Text style={[styles.sliderSideLabel, { color: th.textMuted }]}>200+</Text>
        </View>
      </View>

      {error != null && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.btn, (!interestedIn || isSubmitting) && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={!interestedIn || isSubmitting}
        activeOpacity={0.85}
      >
        {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>{saveLabel}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
  },

  title: { fontSize: 26, fontWeight: '800', marginBottom: 6, letterSpacing: -0.4, marginTop: spacing.xs },
  subtitle: { fontSize: 15, marginBottom: spacing.lg, lineHeight: 22 },

  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  lockedCard: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  lockedCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  lockedCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  lockedValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  lockedValueText: {
    fontSize: 18,
    fontWeight: '700',
  },
  lockedCardHint: {
    fontSize: 12,
  },

  sliderCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sliderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sliderCardLabel: { fontSize: 13, fontWeight: '500' },
  sliderCardValue: { fontSize: 16, fontWeight: '700' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sliderSideLabel: { fontSize: 11, width: 28, textAlign: 'center', fontWeight: '500' },
  slider: { flex: 1, height: 40 },
  ageLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  ageRangeHint: { fontSize: 11 },

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
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.lg,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
