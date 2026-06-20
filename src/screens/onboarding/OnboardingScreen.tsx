import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import i18n from 'i18next';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchOnboardingStatus } from '@/api/onboardingApi';
import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { LANGUAGE_LABELS, LANGUAGE_LIST, useLanguageStore } from '@/stores/language-store';
import { useMeStore } from '@/stores/me-store';
import { OnboardingStatus, OnboardingStep } from '@/types/api';

import BasicProfileStep from './steps/BasicProfileStep';
import CompletionStep from './steps/CompletionStep';
import LocationStep from './steps/LocationStep';
import PhotoStep from './steps/PhotoStep';
import PreferencesStep from './steps/PreferencesStep';

// ─── Constants ───────────────────────────────────────────────────────────────

const ORDERED_STEPS: OnboardingStep[] = [
  'BASIC_PROFILE',
  'ADD_LOCATION',
  'ADD_PHOTO',
  'SET_PREFERENCES',
  'COMPLETE',
];

const PROGRESS_STEPS: OnboardingStep[] = [
  'BASIC_PROFILE',
  'ADD_LOCATION',
  'ADD_PHOTO',
  'SET_PREFERENCES',
];

const STEP_LABEL_KEYS = ['onboarding.steps.profile', 'onboarding.steps.location', 'onboarding.steps.photos', 'onboarding.steps.preferences'] as const;

const STEP_ICONS: Partial<Record<OnboardingStep, string>> = {
  BASIC_PROFILE: 'person-outline',
  ADD_LOCATION: 'location-outline',
  ADD_PHOTO: 'camera-outline',
  SET_PREFERENCES: 'heart-outline',
};

function orderedIndex(step: OnboardingStep): number {
  return ORDERED_STEPS.indexOf(step);
}

function progressBarIndex(step: OnboardingStep): number {
  return PROGRESS_STEPS.indexOf(step);
}

function isStepCompleted(step: OnboardingStep, status: OnboardingStatus | null): boolean {
  if (!status) return false;
  const map: Partial<Record<OnboardingStep, boolean>> = {
    BASIC_PROFILE: status.steps.basic_profile,
    ADD_LOCATION: status.steps.location,
    ADD_PHOTO: status.steps.photo,
    SET_PREFERENCES: status.steps.preferences,
  };
  return map[step] ?? false;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors: th, mode } = useTheme();
  const markOnboarded = useMeStore((s) => s.markOnboarded);
  const clearMe = useMeStore((s) => s.clearMe);

  const { t } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const [langOpen, setLangOpen] = useState(false);

  const [displayStep, setDisplayStep] = useState<OnboardingStep | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Apply persisted language on mount
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Load & status refresh ─────────────────────────────────────────────────
  const loadStatus = useCallback(async (setDisplay = true) => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await fetchOnboardingStatus();
      setOnboardingStatus(status);
      if (status.next_step === 'DONE') {
        markOnboarded();
        router.replace('/(app)/(tabs)' as never);
        return;
      }
      if (setDisplay) setDisplayStep(status.next_step);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string } }; message?: string; code?: string };
      console.error('[Onboarding] fetchOnboardingStatus failed:', err?.response?.status, err?.response?.data, err?.message, err?.code);
      const msg =
        err?.response?.data?.message ??
        (err?.code === 'ERR_NETWORK' || !process.env.EXPO_PUBLIC_API_BASE_URL
          ? 'API base URL is not configured. Add EXPO_PUBLIC_API_BASE_URL to your .env file.'
          : `Error ${err?.response?.status ?? err?.message ?? 'Unknown error'}`);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [markOnboarded, router]);

  useEffect(() => { loadStatus(true); }, [loadStatus]);

  // ─── Navigation ────────────────────────────────────────────────────────────
  const handleStepDone = useCallback(async () => {
    if (!displayStep) return;
    const nextIdx = orderedIndex(displayStep) + 1;
    if (nextIdx < ORDERED_STEPS.length) setDisplayStep(ORDERED_STEPS[nextIdx]);
    fetchOnboardingStatus()
      .then((s) => {
        setOnboardingStatus(s);
        if (s.next_step === 'DONE') {
          markOnboarded();
          router.replace('/(app)/(tabs)' as never);
        }
      })
      .catch(() => {});
  }, [displayStep, markOnboarded, router]);

  const handleBack = useCallback(() => {
    if (!displayStep) return;
    const prevIdx = orderedIndex(displayStep) - 1;
    if (prevIdx >= 0) setDisplayStep(ORDERED_STEPS[prevIdx]);
  }, [displayStep]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    clearMe();
    router.replace('/auth' as never);
  }, [clearMe, router]);

  // ─── Derived ───────────────────────────────────────────────────────────────
  const isCompletionStep = displayStep === 'COMPLETE' || displayStep === 'DONE';
  const progressIdx = displayStep ? progressBarIndex(displayStep) : 0;
  const clampedProgressIdx = Math.max(0, progressIdx);
  const canGoBack = displayStep ? orderedIndex(displayStep) > 0 && !isCompletionStep : false;
  const stepIcon = (displayStep ? STEP_ICONS[displayStep] : null) ?? 'ellipse-outline';

  // ─── Render step ───────────────────────────────────────────────────────────
  function renderStep() {
    if (!displayStep) return null;
    const completed = isStepCompleted(displayStep, onboardingStatus);
    switch (displayStep) {
      case 'BASIC_PROFILE': return <BasicProfileStep onComplete={handleStepDone} isCompleted={completed} />;
      case 'ADD_LOCATION':  return <LocationStep     onComplete={handleStepDone} isCompleted={completed} />;
      case 'ADD_PHOTO':     return <PhotoStep        onComplete={handleStepDone} isCompleted={completed} />;
      case 'SET_PREFERENCES': return <PreferencesStep onComplete={handleStepDone} isCompleted={completed} />;
      case 'COMPLETE':      return <CompletionStep />;
      default:              return null;
    }
  }

  // ─── Colours derived from mode ─────────────────────────────────────────────
  const primaryAlpha = mode === 'dark' ? '12' : '0D'; // hex alpha: ~7% dark / ~5% light

  return (
    <View style={[styles.root, { backgroundColor: th.background }]}>

      {/* ── Decorative top glow ─────────────────────────────────────────── */}
      <View
        style={[
          styles.topGlow,
          { backgroundColor: `${colors.primary}${primaryAlpha}` },
        ]}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>

          {/* Left — back button or "Q" brand mark */}
          {canGoBack ? (
            <TouchableOpacity
              onPress={handleBack}
              style={[styles.headerBtn, { backgroundColor: th.surface, borderColor: th.border }]}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color={th.text} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.brandMark, { backgroundColor: `${colors.primary}1A` }]}>
              <Text style={[styles.brandLetter, { color: colors.primary }]}>Q</Text>
            </View>
          )}

          {/* Center — progress + step meta */}
          {!isCompletionStep ? (
            <View style={styles.progressCenter}>
              <View style={styles.stepMetaRow}>
                <Ionicons
                  name={stepIcon as 'person-outline'}
                  size={11}
                  color={colors.primary}
                />
                <Text style={[styles.stepName, { color: colors.primary }]}>
                  {t(STEP_LABEL_KEYS[clampedProgressIdx])}
                </Text>
                <Text style={[styles.stepSep, { color: th.border }]}>·</Text>
                <Text style={[styles.stepCounter, { color: th.textMuted }]}>
                  {clampedProgressIdx + 1} of {PROGRESS_STEPS.length}
                </Text>
              </View>

              <View style={styles.segmentRow}>
                {PROGRESS_STEPS.map((step, i) => {
                  const done = isStepCompleted(step, onboardingStatus);
                  const filled = done || i <= clampedProgressIdx;
                  const isCurrent = i === clampedProgressIdx && !done;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.segment,
                        {
                          backgroundColor: filled ? colors.primary : th.border,
                          opacity: filled ? 1 : 0.28,
                          height: isCurrent ? 5 : 4,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.progressCenter} />
          )}

          {/* Right — language switcher */}
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: th.surface, borderColor: th.border }]}
            onPress={() => setLangOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.langCode, { color: th.text }]}>
              {LANGUAGE_LABELS[language].code}
            </Text>
          </TouchableOpacity>

        </View>

        {/* ── Thin divider under header ────────────────────────────────── */}
        {!isCompletionStep && !isLoading && !error && (
          <View style={[styles.divider, { backgroundColor: th.border }]} />
        )}

        {/* ── Language picker modal ────────────────────────────────────── */}
        <Modal
          visible={langOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setLangOpen(false)}
        >
          <Pressable style={styles.langOverlay} onPress={() => setLangOpen(false)}>
            <View style={[styles.langDropdown, { backgroundColor: th.surface, borderColor: th.border }]}>
              <Text style={[styles.langDropdownTitle, { color: th.textMuted }]}>{t('onboarding.selectLanguage')}</Text>
              {LANGUAGE_LIST.map((code) => {
                const active = code === language;
                const { native, label } = LANGUAGE_LABELS[code];
                return (
                  <TouchableOpacity
                    key={code}
                    style={[
                      styles.langOption,
                      active && { backgroundColor: th.backgroundSelected },
                    ]}
                    onPress={async () => {
                      setLanguage(code);
                      await i18n.changeLanguage(code);
                      setLangOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.langOptionTextCol}>
                      <Text style={[styles.langOptionNative, { color: th.text }]}>{native}</Text>
                      <Text style={[styles.langOptionLabel, { color: th.textMuted }]}>{label}</Text>
                    </View>
                    {active && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Modal>

        {/* ── Screen content ──────────────────────────────────────────────── */}
        {isLoading ? (
          <View style={styles.centered}>
            <View style={[styles.stateCard, { backgroundColor: th.surface, borderColor: th.border }]}>
              <View style={[styles.stateIconCircle, { backgroundColor: `${colors.primary}12` }]}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
              <Text style={[styles.stateTitle, { color: th.text }]}>{t('onboarding.loadingTitle')}</Text>
              <Text style={[styles.stateSub, { color: th.textMuted }]}>{t('onboarding.loadingSubtitle')}</Text>
            </View>
          </View>

        ) : error ? (
          <View style={styles.centered}>
            <View style={[styles.stateCard, { backgroundColor: th.surface, borderColor: th.border }]}>
              <View style={[styles.stateIconCircle, { backgroundColor: 'rgba(239,68,68,0.09)' }]}>
                <Ionicons name="cloud-offline-outline" size={30} color="#EF4444" />
              </View>
              <Text style={[styles.stateTitle, { color: th.text }]}>{t('onboarding.errorTitle')}</Text>
              <Text style={[styles.stateSub, { color: th.textSecondary }]}>{error}</Text>
            </View>
            <TouchableOpacity
              onPress={() => loadStatus(true)}
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={16} color="#FFF" />
              <Text style={styles.retryText}>{t('onboarding.retry')}</Text>
            </TouchableOpacity>
          </View>

        ) : (
          <View style={styles.stepContent}>
            {renderStep()}
          </View>
        )}

        {/* ── Sign out ─────────────────────────────────────────────────────── */}
        {!isCompletionStep && (
          <TouchableOpacity
            onPress={handleSignOut}
            style={styles.signOutBtn}
            activeOpacity={0.65}
          >
            <Ionicons name="log-out-outline" size={14} color={th.textMuted} />
            <Text style={[styles.signOutText, { color: th.textMuted }]}>
              {t('onboarding.signOut')}
            </Text>
          </TouchableOpacity>
        )}

      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Decorative: ultra-subtle brand-tinted oval at the top of the screen
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 240,
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
  },

  safe: { flex: 1 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },

  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    // borderColor + backgroundColor provided inline
  },

  brandMark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brandLetter: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -1,
  },

  // ── Progress bar ────────────────────────────────────────────────────────────
  progressCenter: {
    flex: 1,
    gap: 6,
  },
  stepMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stepName: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  stepSep: {
    fontSize: 12,
  },
  stepCounter: {
    fontSize: 12,
    fontWeight: '500',
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  segment: {
    flex: 1,
    borderRadius: 3,
  },

  // ── Divider ─────────────────────────────────────────────────────────────────
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    opacity: 0.55,
  },

  // ── Centered state (loading / error) ────────────────────────────────────────
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  stateCard: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  stateIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  stateSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radius.full,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  retryText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  // ── Language switcher ───────────────────────────────────────────────────────
  langCode: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  langOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 70,
    paddingHorizontal: spacing.md,
  },
  langDropdown: {
    width: '100%',
    maxWidth: 280,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: 2,
  },
  langDropdownTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  langOptionTextCol: { gap: 2 },
  langOptionNative: { fontSize: 15, fontWeight: '600' },
  langOptionLabel: { fontSize: 12 },

  // ── Step content ─────────────────────────────────────────────────────────────
  stepContent: { flex: 1 },

  // ── Sign out ─────────────────────────────────────────────────────────────────
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
