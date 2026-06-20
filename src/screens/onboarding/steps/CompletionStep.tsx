import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

import { completeOnboarding, fetchOnboardingStatus } from '@/api/onboardingApi';
import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useMeStore } from '@/stores/me-store';

const HIGHLIGHT_KEYS = [
  { icon: 'heart' as const, labelKey: 'onboarding.completion.highlightMatches' },
  { icon: 'location' as const, labelKey: 'onboarding.completion.highlightNearby' },
  { icon: 'shield-checkmark' as const, labelKey: 'onboarding.completion.highlightVerified' },
];

export default function CompletionStep() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors: th } = useTheme();
  const markOnboarded = useMeStore((s) => s.markOnboarded);

  const [isChecking, setIsChecking] = useState(true);
  const [canEnterDiscovery, setCanEnterDiscovery] = useState(false);
  const [blockingReasons, setBlockingReasons] = useState<string[]>([]);
  const [alreadyOnboarded, setAlreadyOnboarded] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    setError(null);
    try {
      const status = await fetchOnboardingStatus();
      setCanEnterDiscovery(status.can_enter_discovery);
      setBlockingReasons(status.blocking_reasons);
      setAlreadyOnboarded(status.is_onboarded);
    } catch {
      setError('Could not verify your profile. Please try again.');
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const handleComplete = useCallback(async () => {
    setError(null);
    setIsCompleting(true);
    try {
      const result = await completeOnboarding();
      markOnboarded();
      if (result.can_enter_discovery) {
        router.replace('/(app)/(tabs)');
      } else {
        setAlreadyOnboarded(true);
        setCanEnterDiscovery(false);
        setBlockingReasons(result.blocking_reasons);
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message ?? 'Could not complete onboarding. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  }, [markOnboarded, router]);

  const handleEnterApp = useCallback(() => {
    router.replace('/(app)/(tabs)');
  }, [router]);

  if (isChecking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.checkingText, { color: th.textSecondary }]}>{t('onboarding.completion.verifying')}</Text>
      </View>
    );
  }

  /* Pending review state */
  if (alreadyOnboarded && !canEnterDiscovery) {
    return (
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.iconCircle, { backgroundColor: th.backgroundSelected }]}>
          <Ionicons name="time" size={44} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: th.text }]}>{t('onboarding.completion.almostThere')}</Text>
        <Text style={[styles.subtitle, { color: th.textSecondary }]}>
          {t('onboarding.completion.pendingSubtitle')}
        </Text>

        {blockingReasons.length > 0 && (
          <View style={[styles.pendingBox, { backgroundColor: th.surface, borderColor: th.border }]}>
            <View style={styles.pendingHeader}>
              <Ionicons name="information-circle-outline" size={15} color={th.textMuted} />
              <Text style={[styles.pendingLabel, { color: th.textMuted }]}>{t('onboarding.completion.currentlyPending')}</Text>
            </View>
            {blockingReasons.map((r) => (
              <View key={r} style={styles.pendingRow}>
                <Ionicons name="ellipse" size={6} color={th.textSecondary} />
                <Text style={[styles.pendingReason, { color: th.text }]}>
                  {r.replace(/_/g, ' ').toLowerCase()}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={handleEnterApp}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{t('onboarding.completion.continueToApp')}</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  /* Ready to complete */
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={[styles.iconCircle, { backgroundColor: th.backgroundSelected }]}>
        <Ionicons name="checkmark-circle" size={56} color={colors.primary} />
      </View>

      <Text style={[styles.title, { color: th.text }]}>{t('onboarding.completion.allSet')}</Text>
      <Text style={[styles.subtitle, { color: th.textSecondary }]}>
        {t('onboarding.completion.readySubtitle')}
      </Text>

      {/* Feature highlights */}
      <View style={[styles.highlightCard, { backgroundColor: th.surface, borderColor: th.border }]}>
        {HIGHLIGHT_KEYS.map((h, i) => (
          <View
            key={h.labelKey}
            style={[
              styles.highlightRow,
              i < HIGHLIGHT_KEYS.length - 1 && [styles.highlightBorder, { borderBottomColor: th.border }],
            ]}
          >
            <View style={[styles.highlightIconWrap, { backgroundColor: th.backgroundSelected }]}>
              <Ionicons name={h.icon} size={16} color={colors.primary} />
            </View>
            <Text style={[styles.highlightText, { color: th.text }]}>{t(h.labelKey)}</Text>
          </View>
        ))}
      </View>

      {error != null && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: colors.primary }, isCompleting && styles.btnDisabled]}
        onPress={alreadyOnboarded ? handleEnterApp : handleComplete}
        disabled={isCompleting}
        activeOpacity={0.85}
      >
        {isCompleting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.btnText}>{alreadyOnboarded ? t('onboarding.completion.enterQaliye') : t('onboarding.completion.startDiscovering')}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  checkingText: { fontSize: 15 },

  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
    paddingTop: spacing.lg,
  },

  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },

  highlightCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: spacing.md,
  },
  highlightBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  highlightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightText: { fontSize: 14, fontWeight: '500', flex: 1 },

  pendingBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.xl,
    width: '100%',
    gap: 8,
  },
  pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pendingLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: 2 },
  pendingReason: { fontSize: 14, lineHeight: 20 },

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
    marginBottom: spacing.md,
    alignSelf: 'stretch',
  },
  errorText: { color: '#FF6B6B', fontSize: 13, flex: 1 },

  btn: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
