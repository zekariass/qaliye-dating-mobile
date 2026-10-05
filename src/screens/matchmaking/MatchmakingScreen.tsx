/**
 * Screen 1 — Personal Matchmaking Introduction
 *
 * Simple, elegant entry point. Explains the service and has a single "Get Started" CTA.
 * If the user already has an active request, redirects to the request status screen.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MatchmakingTabBar from '@/components/matchmaking/MatchmakingTabBar';

import { colors, radius, spacing } from '@/constants/theme';
import { useMatchmakingPreferences } from '@/hooks/matchmaking/useMatchmakingPreferences';
import { useActiveMatchmakingRequest } from '@/hooks/matchmaking/useMatchmakingRequest';
import { useTheme } from '@/hooks/use-theme';
import { useMatchmakingWizardStore } from '@/stores/matchmaking-wizard-store';

const FEATURES = [
  {
    icon: 'checkmark-circle-outline' as const,
    title: 'Manually reviewed by our matchmakers',
  },
  {
    icon: 'checkmark-circle-outline' as const,
    title: 'Matches based on your preferences',
  },
  {
    icon: 'checkmark-circle-outline' as const,
    title: 'You decide who interests you',
  },
];

export default function MatchmakingScreen() {
  const router = useRouter();
  const { colors: th } = useTheme();
  const hydrateWizard = useMatchmakingWizardStore((s) => s.hydrateFromApi);
  const resetWizard = useMatchmakingWizardStore((s) => s.reset);

  const { data: activeRequest, isLoading: requestLoading } = useActiveMatchmakingRequest();
  const { data: prefs } = useMatchmakingPreferences();

  // If there's an active request, redirect to the status screen immediately
  useEffect(() => {
    if (!requestLoading && activeRequest) {
      router.replace('/(app)/shimgilina-request-status' as never);
    }
  }, [activeRequest, requestLoading, router]);

  const handleGetStarted = () => {
    // Hydrate the wizard with existing prefs if available, otherwise reset
    if (prefs) {
      hydrateWizard(prefs);
    } else {
      resetWizard();
    }
    router.push('/(app)/shimgilina-preferences' as never);
  };

  // Show nothing while loading to avoid flash before redirect
  if (requestLoading) return null;

  return (
    <View style={[styles.root, { backgroundColor: th.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: th.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={22} color={th.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero icon */}
          <View style={[styles.heroIconWrap, { backgroundColor: colors.primary + '14' }]}>
            <Ionicons name="heart" size={48} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: th.text }]}>Personal Matchmaking</Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: th.textSecondary }]}>
            Let our matchmakers find someone who is right for you based on your preferences and values.
          </Text>

          {/* Features */}
          <View style={[styles.featuresCard, { backgroundColor: th.surface, borderColor: th.border }]}>
            {FEATURES.map((f, i) => (
              <View
                key={i}
                style={[
                  styles.featureRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: th.border },
                ]}
              >
                <Ionicons name={f.icon} size={22} color={colors.primary} />
                <Text style={[styles.featureText, { color: th.text }]}>{f.title}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* CTA */}
        <View style={[styles.footer, { borderTopColor: th.border }]}>
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.primary }]}
            onPress={handleGetStarted}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <MatchmakingTabBar activeTab="requests" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  featuresCard: {
    width: '100%',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cta: {
    borderRadius: radius.xl,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
