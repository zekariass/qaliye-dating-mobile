/**
 * Screen 5 — Submit Matchmaking Request
 *
 * Explains what will happen. "Submit Request" calls POST /api/v1/matchmaking/requests.
 * Uses an idempotency key generated once per mount — retries won't double-charge.
 * Handles 402 insufficient_credits with a "Get Credits" CTA.
 */
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MatchmakingTabBar from '@/components/matchmaking/MatchmakingTabBar';

import { themedAlert } from '@/components/common/ThemedAlert';
import { colors, radius, spacing } from '@/constants/theme';
import { useCreateMatchmakingRequest } from '@/hooks/matchmaking/useMatchmakingRequest';
import { useTheme } from '@/hooks/use-theme';
import { extractApiError, getApiErrorMessage, getApiErrorTitle } from '@/utils/apiError';

export default function MatchmakingRequestSubmitScreen() {
  const router = useRouter();
  const { colors: th } = useTheme();
  const idempotencyKey = useRef(Crypto.randomUUID());
  const [submitted, setSubmitted] = useState(false);
  const { mutate: createRequest, isPending } = useCreateMatchmakingRequest();

  const handleSubmit = () => {
    if (submitted || isPending) return;
    setSubmitted(true);

    createRequest(
      { charge_idempotency_key: idempotencyKey.current },
      {
        onSuccess: (req) => {
          router.replace({
            pathname: '/(app)/shimgilina-submitted' as never,
            params: { requestId: req.id },
          });
        },
        onError: (err) => {
          setSubmitted(false);
          const detail = extractApiError(err);

          if (detail.code === 'insufficient_credits') {
            themedAlert({
              title: 'Not enough credits',
              message: "You don't have enough credits to submit this matchmaking request.",
              icon: 'alert-circle',
              iconColor: colors.warning,
              buttons: [
                {
                  text: 'Get Credits',
                  onPress: () => router.push('/(app)/credits-shop' as never),
                },
                { text: 'Cancel', style: 'cancel' },
              ],
            });
          } else if (detail.code === 'CONFLICT') {
            themedAlert({
              title: 'Already active',
              message: 'You already have an active matchmaking request.',
              icon: 'information-circle',
              iconColor: colors.primary,
              buttons: [
                {
                  text: 'View Request',
                  onPress: () => router.replace('/(app)/shimgilina-request-status' as never),
                },
                { text: 'OK', style: 'cancel' },
              ],
            });
          } else if (detail.code === 'UNPROCESSABLE' || detail.status === 422) {
            themedAlert({
              title: 'Preferences required',
              message: 'Please save your preferences before submitting a matchmaking request.',
              icon: 'alert-circle',
              iconColor: colors.danger,
              buttons: [
                {
                  text: 'Set Preferences',
                  onPress: () => router.replace('/(app)/shimgilina-preferences' as never),
                },
                { text: 'Cancel', style: 'cancel' },
              ],
            });
          } else {
            themedAlert({
              title: getApiErrorTitle(detail.code),
              message: getApiErrorMessage(detail),
              icon: 'alert-circle',
              iconColor: colors.danger,
            });
          }
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
        <Text style={[styles.headerTitle, { color: th.text }]}>Matchmaking Request</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero icon */}
        <View style={[styles.heroIconWrap, { backgroundColor: colors.primary + '14' }]}>
          <Ionicons name="heart" size={48} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: th.text }]}>Ready to begin?</Text>

        <Text style={[styles.subtitle, { color: th.textSecondary }]}>
          Your saved preferences will be given to our matchmakers.
        </Text>

        <Text style={[styles.body, { color: th.textSecondary }]}>
          They will carefully review compatible people and choose an introduction for you.
        </Text>

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: th.surface, borderColor: th.border }]}>
          <View style={styles.infoRow}>
            <Ionicons name="diamond-outline" size={20} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={[styles.infoTitle, { color: th.text }]}>Matchmaking request</Text>
              <Text style={[styles.infoSub, { color: th.textSecondary }]}>One-time matchmaking charge</Text>
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <Text style={[styles.disclaimer, { color: th.textMuted }]}>
          Your request does not guarantee a match.
        </Text>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: th.border }]}>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.primary, opacity: isPending ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={isPending}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          {isPending
            ? <ActivityIndicator color="#FFF" size="small" />
            : <Text style={styles.ctaText}>Submit Request</Text>}
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
  content: {
    paddingHorizontal: spacing.xl,
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
  },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  infoCard: {
    width: '100%',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: '600' },
  infoSub: { fontSize: 13, marginTop: 2 },
  disclaimer: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
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
  ctaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
