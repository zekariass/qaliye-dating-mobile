import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
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
  { icon: 'heart' as const, labelKey: 'onboarding.completion.highlightMatches', emoji: '💫' },
  { icon: 'location' as const, labelKey: 'onboarding.completion.highlightNearby', emoji: '📍' },
  { icon: 'shield-checkmark' as const, labelKey: 'onboarding.completion.highlightVerified', emoji: '✅' },
];

export default function CompletionStep() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors: th, mode } = useTheme();
  const markOnboarded = useMeStore((s) => s.markOnboarded);

  const [isChecking, setIsChecking] = useState(true);
  const [canEnterDiscovery, setCanEnterDiscovery] = useState(false);
  const [blockingReasons, setBlockingReasons] = useState<string[]>([]);
  const [alreadyOnboarded, setAlreadyOnboarded] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 55, friction: 7 }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 1200, useNativeDriver: true }),
        ]),
      ).start();
    });
  }, [scaleAnim, fadeAnim, pulseAnim]);

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
        <Animated.View style={[styles.heroWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.ring3, { borderColor: `${colors.primary}10` }]} />
          <View style={[styles.ring2, { borderColor: `${colors.primary}20` }]} />
          <View style={[styles.ring1, { borderColor: `${colors.primary}35` }]} />
          <View style={[styles.heroCircle, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="time-outline" size={38} color={colors.primary} />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ALMOST THERE</Text>
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
        </Animated.View>
      </ScrollView>
    );
  }

  /* Ready to complete */
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* ── Animated hero ── */}
      <Animated.View style={[styles.heroWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.ring3, { borderColor: `${colors.primary}10` }]} />
        <View style={[styles.ring2, { borderColor: `${colors.primary}20` }]} />
        <View style={[styles.ring1, { borderColor: `${colors.primary}35` }]} />
        <Animated.View style={[styles.heroCircle, { backgroundColor: `${colors.primary}18`, transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="checkmark-circle" size={44} color={colors.primary} />
        </Animated.View>
      </Animated.View>

      {/* ── Text + features ── */}
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🎉  YOU'RE ALL SET</Text>
        </View>

        <Text style={[styles.title, { color: th.text }]}>{t('onboarding.completion.allSet')}</Text>
        <Text style={[styles.subtitle, { color: th.textSecondary }]}>
          {t('onboarding.completion.readySubtitle')}
        </Text>

        {/* Feature highlights */}
        <View style={styles.highlightList}>
          {HIGHLIGHT_KEYS.map((h) => (
            <View
              key={h.labelKey}
              style={[
                styles.highlightCard,
                {
                  backgroundColor: mode === 'dark' ? th.backgroundElement : th.surface,
                  borderColor: th.border,
                },
              ]}
            >
              <View style={[styles.highlightIconWrap, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name={h.icon} size={20} color={colors.primary} />
              </View>
              <Text style={[styles.highlightText, { color: th.text }]}>{t(h.labelKey)}</Text>
              <Text style={styles.highlightEmoji}>{h.emoji}</Text>
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
          style={[styles.btn, isCompleting && styles.btnDisabled]}
          onPress={alreadyOnboarded ? handleEnterApp : handleComplete}
          disabled={isCompleting}
          activeOpacity={0.85}
        >
          {isCompleting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.btnText}>
                {alreadyOnboarded ? t('onboarding.completion.enterQaliye') : t('onboarding.completion.startDiscovering')}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </Animated.View>
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    paddingTop: spacing.md,
    flexGrow: 1,
    justifyContent: 'center',
  },

  /* ── Hero ── */
  heroWrap: {
    width: 148,
    height: 148,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ring3: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1.5,
  },
  ring2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
  },
  ring1: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
  },
  heroCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Badge ── */
  badge: {
    backgroundColor: `${colors.primary}18`,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  /* ── Text ── */
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },

  /* ── Highlights ── */
  highlightList: {
    width: '100%',
    gap: 8,
    marginBottom: spacing.md,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  highlightIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  highlightText: { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },
  highlightEmoji: { fontSize: 18 },

  /* ── Pending ── */
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

  /* ── Error ── */
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

  /* ── CTA ── */
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
});
