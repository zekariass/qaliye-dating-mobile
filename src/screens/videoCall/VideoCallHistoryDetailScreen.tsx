/**
 * VideoCallHistoryDetailScreen — single request detail (completed / declined / cancelled / expired).
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

import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVideoCallRequests } from '@/hooks/videoCall/useVideoCallRequests';
import type { VideoCallRequestStatus } from '@/types/videoCall';

// ── Meta ───────────────────────────────────────────────────────────────────────

type Meta = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  bodyFn: (displayName: string, isRequester: boolean) => string;
};

const META: Partial<Record<VideoCallRequestStatus, Meta>> = {
  COMPLETED: {
    icon: 'checkmark-circle',
    color: colors.success,
    label: 'Completed',
    bodyFn: () => '',
  },
  DECLINED: {
    icon: 'close-circle',
    color: colors.danger,
    label: 'Declined',
    bodyFn: (name, ir) =>
      ir
        ? 'Your call request was declined.'
        : `You declined ${name}'s call request.`,
  },
  CANCELLED: {
    icon: 'ban',
    color: colors.textMuted,
    label: 'Cancelled',
    bodyFn: (_, ir) =>
      ir ? 'You cancelled this request.' : 'They cancelled this request.',
  },
  EXPIRED: {
    icon: 'time-outline',
    color: colors.textMuted,
    label: 'Expired',
    bodyFn: () => 'The request expired without a response.',
  },
};

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function VideoCallHistoryDetailScreen() {
  const router = useRouter();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const { matchId, requestId, displayName, callType } = useLocalSearchParams<{
    matchId: string;
    requestId: string;
    displayName: string;
    callType?: string;
  }>();

  const { data: requests, isLoading } = useVideoCallRequests(matchId ?? '');
  const request = requests?.find((r) => r.id === requestId);

  const meta = request ? META[request.status] : undefined;
  const isAudio = (request?.call_type ?? callType) === 'AUDIO';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: th.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: th.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={th.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Ionicons name={isAudio ? 'call' : 'videocam'} size={18} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: th.text }]}>{isAudio ? 'Audio Call' : 'Video Call'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !request || !meta ? (
        <View style={styles.centered}>
          <Text style={[styles.notFound, { color: th.textSecondary }]}>Request not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status icon */}
          <View style={[styles.iconCircle, { backgroundColor: meta.color + '20' }]}>
            <Ionicons name={meta.icon} size={44} color={meta.color} />
          </View>

          <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>

          {/* Body text */}
          {meta.bodyFn(displayName ?? '', request.is_requester) !== '' && (
            <Text style={[styles.bodyText, { color: th.textSecondary }]}>
              {meta.bodyFn(displayName ?? '', request.is_requester)}
            </Text>
          )}

          {/* Detail card */}
          <View style={[styles.card, { backgroundColor: isDark ? th.surface : '#FAF7FF', borderColor: th.border }]}>
            <View style={styles.cardRow}>
              <View style={styles.typeRow}>
                <Ionicons
                  name={request.call_type === 'AUDIO' ? 'call-outline' : 'videocam-outline'}
                  size={15}
                  color={th.textMuted}
                />
                <Text style={[styles.cardKey, { color: th.textMuted }]}>Call type</Text>
              </View>
              <Text style={[styles.cardVal, { color: th.text }]}>
                {request.call_type === 'AUDIO' ? 'Audio call' : 'Video call'}
              </Text>
            </View>
            {request.status === 'COMPLETED' && (
              <View style={[styles.cardRow, { borderTopColor: th.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[styles.cardKey, { color: th.textMuted }]}>
                  Requested by {request.is_requester ? 'you' : displayName}
                </Text>
                <Text style={[styles.cardVal, { color: th.text }]}>
                  {fmtDateTime(request.created_at)}
                </Text>
              </View>
            )}
            {request.status === 'COMPLETED' && request.ended_at && (
              <View style={[styles.cardRow, { borderTopColor: th.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[styles.cardKey, { color: th.textMuted }]}>Completed at</Text>
                <Text style={[styles.cardVal, { color: th.text }]}>
                  {fmtDateTime(request.ended_at)}
                </Text>
              </View>
            )}
            {request.status !== 'COMPLETED' && (
              <View style={[styles.cardRow, { borderTopColor: th.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[styles.cardVal, { color: th.text }]}>
                  {fmtDateTime(request.created_at)}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 15 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl * 1.5,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: { fontSize: 22, fontWeight: '800' },
  bodyText: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  card: {
    width: '100%',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  cardRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 4,
  },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardKey: { fontSize: 13, fontWeight: '500' },
  cardVal: { fontSize: 14, fontWeight: '600' },
});
