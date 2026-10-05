/**
 * Screen 6 — Request Submitted
 *
 * Shown immediately after a successful POST /requests.
 * Displays the request status card and a "View My Request" CTA.
 */
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

import { colors, radius, spacing } from '@/constants/theme';
import { useMatchmakingRequest } from '@/hooks/matchmaking/useMatchmakingRequest';
import { useTheme } from '@/hooks/use-theme';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function MatchmakingSubmittedScreen() {
  const router = useRouter();
  const { colors: th } = useTheme();
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
  const { data: request, isLoading } = useMatchmakingRequest(requestId ?? null);

  return (
    <View style={[styles.root, { backgroundColor: th.background }]}>
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Check icon */}
        <View style={[styles.iconWrap, { backgroundColor: colors.success + '18' }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.success }]}>
            <Ionicons name="checkmark" size={32} color="#FFF" />
          </View>
        </View>

        <Text style={[styles.title, { color: th.text }]}>Request Submitted</Text>

        <Text style={[styles.subtitle, { color: th.textSecondary }]}>
          Your matchmaker is carefully reviewing your request.
        </Text>

        {/* Status card */}
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
        ) : request ? (
          <View style={[styles.statusCard, { backgroundColor: th.surface, borderColor: th.border }]}>
            <Text style={[styles.statusLabel, { color: colors.primary }]}>STATUS</Text>
            <View style={[styles.statusBadge, { backgroundColor: colors.primary + '14' }]}>
              <Text style={[styles.statusBadgeText, { color: colors.primary }]}>{request.status}</Text>
            </View>
            <View style={[styles.statusDivider, { backgroundColor: th.border }]} />
            <View style={styles.statusRow}>
              <Text style={[styles.statusRowLabel, { color: th.textSecondary }]}>Submitted</Text>
              <Text style={[styles.statusRowValue, { color: th.text }]}>{fmtDate(request.created_at)}</Text>
            </View>
            {request.expires_at && (
              <View style={styles.statusRow}>
                <Text style={[styles.statusRowLabel, { color: th.textSecondary }]}>Expires</Text>
                <Text style={[styles.statusRowValue, { color: th.text }]}>{fmtDate(request.expires_at)}</Text>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: th.border }]}>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.primary }]}
          onPress={() =>
            router.replace({
              pathname: '/(app)/shimgilina-request-status' as never,
              params: requestId ? { requestId } : {},
            })
          }
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>View My Request</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    <MatchmakingTabBar activeTab="requests" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  statusCard: {
    width: '100%',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusBadgeText: { fontSize: 13, fontWeight: '700' },
  statusDivider: { height: StyleSheet.hairlineWidth },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusRowLabel: { fontSize: 14 },
  statusRowValue: { fontSize: 14, fontWeight: '600' },
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
