/**
 * CallEndedScreen — Shown after a video call ends (POST /end succeeds).
 */
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
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

function fmtDateTime(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: '—', time: '' };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function CallEndedScreen() {
  const router = useRouter();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const { matchId, requestId, displayName, avatarUrl, callType } = useLocalSearchParams<{
    matchId: string;
    requestId: string;
    displayName: string;
    avatarUrl?: string;
    callType?: string;
  }>();

  const { data: requests } = useVideoCallRequests(matchId ?? '');
  const request = requests?.find((r) => r.id === requestId);

  // The request row is authoritative; the nav param is the fast path.
  const isAudio = (request?.call_type ?? callType) === 'AUDIO';

  const endedAt = fmtDateTime(request?.ended_at);

  const handleBackToChat = () => {
    // Pop back past the entire video call stack to the chat screen
    router.dismiss(10);
  };

  const handleRequestAgain = () => {
    router.replace({
      pathname: '/(app)/video-call-new-request' as never,
      params: {
        matchId,
        displayName,
        avatarUrl: avatarUrl ?? '',
        callType: request?.call_type ?? 'VIDEO',
      },
    });
  };

  const handleViewHistory = () => {
    router.push({
      pathname: '/(app)/video-call-history' as never,
      params: { matchId, displayName },
    });
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: th.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: th.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBackToChat} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={th.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Ionicons name={isAudio ? 'call' : 'videocam'} size={18} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: th.text }]}>{isAudio ? 'Audio Call' : 'Video Call'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: colors.success + '20' }]}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
        </View>

        <Text style={[styles.title, { color: th.text }]}>Call Ended</Text>
        <Text style={[styles.sub, { color: th.textSecondary }]}>Your {isAudio ? 'audio' : 'video'} call has ended.</Text>

        {/* Status card */}
        <View style={[styles.card, { backgroundColor: isDark ? th.surface : '#FAF7FF', borderColor: th.border }]}>
          <View style={styles.cardRow}>
            <Text style={[styles.cardKey, { color: th.textMuted }]}>Status</Text>
            <Text style={[styles.cardVal, { color: colors.success }]}>Completed</Text>
          </View>
          <View style={[styles.cardRow, { borderTopColor: th.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <Text style={[styles.cardKey, { color: th.textMuted }]}>Call type</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={isAudio ? 'call' : 'videocam'} size={14} color={th.text} />
              <Text style={[styles.cardVal, { color: th.text }]}>{isAudio ? 'Audio' : 'Video'}</Text>
            </View>
          </View>
          {request?.ended_at && (
            <View style={[styles.cardRow, { borderTopColor: th.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <Text style={[styles.cardKey, { color: th.textMuted }]}>Ended</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.cardVal, { color: th.text }]}>{endedAt.date}</Text>
                <Text style={[styles.cardSub, { color: th.textSecondary }]}>{endedAt.time}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Request another call */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={handleRequestAgain}
          activeOpacity={0.85}
        >
          <Ionicons name={isAudio ? 'call' : 'videocam'} size={18} color="#FFF" />
          <Text style={styles.primaryBtnText}>Request Again</Text>
        </TouchableOpacity>

        {/* Back to chat */}
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: th.border, backgroundColor: isDark ? th.surface : '#FAF7FF' }]}
          onPress={handleBackToChat}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={th.text} />
          <Text style={[styles.secondaryBtnText, { color: th.text }]}>Back to Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={handleViewHistory} activeOpacity={0.7}>
          <Text style={[styles.linkBtnText, { color: colors.primary }]}>View Call History →</Text>
        </TouchableOpacity>
      </ScrollView>
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
  title: { fontSize: 26, fontWeight: '800' },
  sub: { fontSize: 15, textAlign: 'center' },
  card: {
    width: '100%',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cardKey: { fontSize: 14, fontWeight: '600' },
  cardVal: { fontSize: 14, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 2 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    borderRadius: radius.xl,
    paddingVertical: 16,
    marginTop: spacing.md,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 15,
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '700' },
  linkBtn: { paddingVertical: spacing.sm },
  linkBtnText: { fontSize: 14, fontWeight: '600' },
});
