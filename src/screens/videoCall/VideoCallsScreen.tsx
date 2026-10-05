/**
 * VideoCallsScreen — Main hub for the video call feature.
 *
 * Opened from the chat header video button. Shows:
 *  • Partner info
 *  • CURRENT section — driven by live request state (no request / PENDING / ACCEPTED)
 *  • HISTORY section — last 3 items + "View all →"
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { themedAlert, themedError, themedSuccess } from '@/components/common/ThemedAlert';
import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
    useCancelVideoCallRequest,
    useDeclineVideoCallRequest,
    useLiveVideoCallRequest,
    useRemindCooldown,
    useRemindVideoCallRequest
} from '@/hooks/videoCall/useVideoCallRequests';
import type { VideoCallRequest, VideoCallRequestStatus } from '@/types/videoCall';
import { extractRetryAfterSeconds } from '@/utils/retryAfter';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fmtExpiry(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  const rh = h % 24;
  if (d > 0) return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
  return `${h}h`;
}

type StatusMeta = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  sub: (r: VideoCallRequest, isRequester: boolean) => string;
};

const STATUS_META: Record<VideoCallRequestStatus, StatusMeta> = {
  PENDING:   { icon: 'hourglass-outline',    color: colors.warning,   label: 'Pending',   sub: (r, ir) => ir ? `You requested ${r.call_type === 'AUDIO' ? 'an audio' : 'a video'} call` : `They requested ${r.call_type === 'AUDIO' ? 'an audio' : 'a video'} call` },
  ACCEPTED:  { icon: 'checkmark-circle',     color: colors.success,   label: 'Accepted',  sub: (r) => r.call_type === 'AUDIO' ? 'Audio call accepted' : 'Call accepted' },
  COMPLETED: { icon: 'checkmark-circle',     color: colors.success,   label: 'Completed', sub: (_, ir) => ir ? 'You requested' : 'They requested' },
  DECLINED:  { icon: 'close-circle',         color: colors.danger,    label: 'Declined',  sub: (_, ir) => ir ? 'They declined your request' : 'You declined the request' },
  CANCELLED: { icon: 'ban',                  color: colors.textMuted,  label: 'Cancelled', sub: (_, ir) => ir ? 'You cancelled the request' : 'They cancelled the request' },
  EXPIRED:   { icon: 'time-outline',         color: colors.textMuted,  label: 'Expired',   sub: () => 'No response' },
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function VideoCallsScreen() {
  const router = useRouter();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const params = useLocalSearchParams<{
    matchId: string;
    displayName?: string;
    avatarUrl?: string;
    requestId?: string;
  }>();
  const { matchId, avatarUrl } = params;
  const displayName = params.displayName || 'Your match';

  const {
    liveRequest,
    history,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useLiveVideoCallRequest(matchId ?? '');

  const cancelMutation = useCancelVideoCallRequest(matchId ?? '');
  const declineMutation = useDeclineVideoCallRequest(matchId ?? '');
  const remindMutation = useRemindVideoCallRequest(matchId ?? '');
  const { cooldownSeconds: remindCooldown, startCooldown: startRemindCooldown } =
    useRemindCooldown(liveRequest?.next_remind_in_seconds);

  // Re-pings the responder's push while our request is pending.
  // Backend cooldown → 429 "Reminder sent too recently" (+ Retry-After).
  const handleRemind = () => {
    if (!liveRequest || remindCooldown > 0) return;
    remindMutation.mutate(liveRequest.id, {
      onSuccess: (updated) => {
        startRemindCooldown(updated.next_remind_in_seconds ?? 0);
        themedSuccess('Reminder sent', `${displayName} was notified again.`);
      },
      onError: (err: any) => {
        const status = err?.response?.status;
        if (status === 429) {
          const seconds = extractRetryAfterSeconds(err);
          if (seconds != null && seconds > 0) {
            startRemindCooldown(seconds);
            if (remindCooldown <= 0) {
              themedAlert({
                title: 'Too soon',
                message: 'You can send another reminder in {seconds} seconds.',
                cooldownDoneMessage: 'You can send another reminder now.',
                icon: 'time-outline',
                iconColor: colors.warning,
                buttonCooldownSeconds: seconds,
              });
            }
          } else {
            themedAlert({
              title: 'Too soon',
              message: `You already reminded ${displayName} recently — try again later.`,
              icon: 'time-outline',
              iconColor: colors.warning,
            });
          }
        } else if (status === 409) {
          refetch();
        } else {
          themedError('Could Not Remind', 'Something went wrong. Please try again.');
        }
      },
    });
  };

  const handleRequestCall = (callType: 'VIDEO' | 'AUDIO' = 'VIDEO') => {
    router.push({
      pathname: '/(app)/video-call-new-request' as never,
      params: { matchId, displayName, avatarUrl: avatarUrl ?? '', callType },
    });
  };

  const handleViewRequest = () => {
    if (!liveRequest) return;
    router.push({
      pathname: '/(app)/video-call-detail' as never,
      params: {
        matchId,
        requestId: liveRequest.id,
        displayName,
        avatarUrl: avatarUrl ?? '',
        callType: liveRequest.call_type,
      },
    });
  };

  const handleJoinCall = () => {
    if (!liveRequest) return;
    router.push({
      pathname: '/(app)/video-call-active' as never,
      params: {
        matchId,
        requestId: liveRequest.id,
        displayName,
        avatarUrl: avatarUrl ?? '',
        callType: liveRequest.call_type,
      },
    });
  };

  const handleCancel = () => {
    if (!liveRequest?.can_cancel) return;
    themedAlert({
      title: 'Cancel Request?',
      message: 'This will cancel your video call request.',
      icon: 'ban-outline',
      iconColor: colors.danger,
      buttons: [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(liveRequest.id),
        },
      ],
    });
  };

  const handleDecline = () => {
    if (!liveRequest?.can_accept) return;
    themedAlert({
      title: 'Decline Request?',
      message: `Are you sure you want to decline this video call request?`,
      icon: 'close-circle-outline',
      iconColor: colors.danger,
      buttons: [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => declineMutation.mutate(liveRequest.id),
        },
      ],
    });
  };

  const handleAccept = () => {
    if (!liveRequest?.can_accept) return;
    router.push({
      pathname: '/(app)/video-call-detail' as never,
      params: {
        matchId,
        requestId: liveRequest.id,
        displayName,
        avatarUrl: avatarUrl ?? '',
        autoAccept: '1',
        callType: liveRequest.call_type,
      },
    });
  };

  // ── Shared card pieces ──────────────────────────────────────────────────

  const statusPill = (icon: React.ComponentProps<typeof Ionicons>['name'], tint: string, label: string) => (
    <View style={[styles.statusPill, { backgroundColor: tint + '18' }]}>
      <Ionicons name={icon} size={13} color={tint} />
      <Text style={[styles.statusPillText, { color: tint }]}>{label}</Text>
    </View>
  );

  const expiryRow = (iso: string | null | undefined) => (
    <View style={styles.expiryRow}>
      <View style={[styles.expiryIcon, { backgroundColor: th.textMuted + '15' }]}>
        <Ionicons name="time-outline" size={14} color={th.textMuted} />
      </View>
      <Text style={[styles.expiryText, { color: th.textMuted }]}>
        Expires in {fmtExpiry(iso)}
      </Text>
    </View>
  );

  const gradientBtn = (
    gradient: [string, string],
    icon: React.ComponentProps<typeof Ionicons>['name'],
    label: string,
    onPress: () => void,
    pending = false,
    iconColor = '#FFF',
  ) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} disabled={pending} accessibilityRole="button" style={{ width: '100%' }}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.primaryBtn, pending && { opacity: 0.7 }]}
      >
        {pending
          ? <ActivityIndicator color="#FFF" />
          : (
            <>
              <Ionicons name={icon} size={21} color={iconColor} />
              <Text style={styles.primaryBtnText}>{label}</Text>
            </>
          )}
      </LinearGradient>
    </TouchableOpacity>
  );

  // ── Render current request card ──────────────────────────────────────────

  const renderCurrentCard = () => {
    // No live request
    if (!liveRequest) {
      return (
        <View style={[styles.currentCard, { backgroundColor: isDark ? th.surface : '#FAF7FF', borderColor: th.border }]}>
          <View style={styles.emptyState}>
            <View style={styles.emptyTitleRow}>
              <Ionicons name="videocam" size={26} color={colors.success} />
              <Ionicons name="call" size={26} color={colors.verifiedBlue} />
              <Text style={[styles.emptyTitle, { color: th.text }]}>No active request</Text>
            </View>
            <Text style={[styles.emptySub, { color: th.textSecondary }]}>
              Request a video or audio call to connect with {displayName}.
            </Text>
          </View>
          {gradientBtn(
            [colors.primary, colors.primaryDark],
            'videocam',
            'Request Video Call',
            () => handleRequestCall('VIDEO'),
            false,
            colors.success,
          )}
          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: colors.primary }]}
            onPress={() => handleRequestCall('AUDIO')}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={20} color={colors.verifiedBlue} />
            <Text style={[styles.outlineBtnText, { color: colors.primary }]}>Request Audio Call</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const isAudio = liveRequest.call_type === 'AUDIO';
    const callNoun = isAudio ? 'audio call' : 'video call';

    // PENDING — requester (outgoing)
    if (liveRequest.status === 'PENDING' && liveRequest.is_requester) {
      return (
        <View style={[styles.currentCard, { backgroundColor: isDark ? th.surface : '#FAF7FF', borderColor: th.border }]}>
          {statusPill('hourglass-outline', colors.warning, 'WAITING FOR RESPONSE')}
          <View>
            <Text style={[styles.statusTitle, { color: th.text }]}>
              {`${isAudio ? 'Audio' : 'Video'} call request sent`}
            </Text>
            <Text style={[styles.statusSub, { color: th.textSecondary }]}>
              {displayName} has been notified and can accept or decline your request.
            </Text>
          </View>
          {liveRequest.request_expires_at && expiryRow(liveRequest.request_expires_at)}
          <View style={styles.cardActions}>
            {gradientBtn([colors.primary, colors.primaryDark], 'eye-outline', 'View Request', handleViewRequest)}
            {liveRequest.next_remind_in_seconds !== null && (
            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: colors.primary }, remindCooldown > 0 && { opacity: 0.5 }]}
              onPress={handleRemind}
              activeOpacity={0.8}
              disabled={remindMutation.isPending || remindCooldown > 0}
            >
              {remindMutation.isPending
                ? <ActivityIndicator size="small" color={colors.primary} />
                : (
                  <>
                    <Ionicons name="notifications-outline" size={18} color={colors.primary} />
                    <Text style={[styles.outlineBtnText, { color: colors.primary }]}>
                      {remindCooldown > 0 ? `Remind in ${remindCooldown}s` : `Remind ${displayName}`}
                    </Text>
                  </>
                )}
            </TouchableOpacity>
            )}
            {liveRequest.can_cancel && (
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: colors.danger }]}
                onPress={handleCancel}
                activeOpacity={0.8}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending
                  ? <ActivityIndicator size="small" color={colors.danger} />
                  : <Text style={[styles.outlineBtnText, { color: colors.danger }]}>Cancel Request</Text>}
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    // PENDING — responder (incoming)
    if (liveRequest.status === 'PENDING' && !liveRequest.is_requester) {
      return (
        <View style={[styles.currentCard, { backgroundColor: isDark ? th.surface : '#FAF7FF', borderColor: th.border }]}>
          {statusPill(isAudio ? 'call' : 'videocam', colors.primary, 'INCOMING REQUEST')}
          <View>
            <Text style={[styles.statusTitle, { color: th.text }]}>
              {`Incoming ${callNoun}`}
            </Text>
            <Text style={[styles.statusSub, { color: th.textSecondary }]}>
              {displayName} wants to {callNoun} with you.
            </Text>
          </View>
          {liveRequest.request_expires_at && expiryRow(liveRequest.request_expires_at)}
          <View style={styles.cardActions}>
            {liveRequest.can_accept && gradientBtn(
              [colors.success, '#16A34A'],
              'checkmark',
              'Accept',
              handleAccept,
              declineMutation.isPending,
            )}
            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: colors.danger }]}
              onPress={handleDecline}
              activeOpacity={0.8}
              disabled={declineMutation.isPending}
            >
              {declineMutation.isPending
                ? <ActivityIndicator size="small" color={colors.danger} />
                : <Text style={[styles.outlineBtnText, { color: colors.danger }]}>Decline</Text>}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ACCEPTED
    if (liveRequest.status === 'ACCEPTED') {
      const otherJoined = liveRequest.is_requester
        ? liveRequest.responder_joined
        : liveRequest.requester_joined;
      return (
        <View style={[styles.currentCard, { backgroundColor: isDark ? th.surface : '#FAF7FF', borderColor: th.border }]}>
          {statusPill('checkmark-circle', colors.success, 'CALL READY')}
          <View>
            <Text style={[styles.statusTitle, { color: th.text }]}>
              {`${isAudio ? 'Audio' : 'Video'} call ready`}
            </Text>
            <Text style={[styles.statusSub, { color: th.textSecondary }]}>
              {otherJoined
                ? `${displayName} is already waiting for you.`
                : `Both of you can now join the ${callNoun}.`}
            </Text>
          </View>
          {liveRequest.can_join && gradientBtn(
            [colors.primary, colors.primaryDark],
            isAudio ? 'call' : 'videocam',
            'Join Call',
            handleJoinCall,
          )}
        </View>
      );
    }

    return null;
  };

  // ── History items ─────────────────────────────────────────────────────────

  const renderHistoryItem = (req: VideoCallRequest, index: number) => {
    const meta = STATUS_META[req.status];
    return (
      <TouchableOpacity
        key={req.id}
        style={[
          styles.historyItem,
          { borderColor: th.border, backgroundColor: isDark ? th.surface : '#FFF' },
          index > 0 && { marginTop: spacing.sm },
        ]}
        onPress={() =>
          router.push({
            pathname: '/(app)/video-call-history-detail' as never,
            params: { requestId: req.id, matchId, displayName, callType: req.call_type },
          })
        }
        activeOpacity={0.7}
      >
        <View style={[styles.historyIcon, { backgroundColor: meta.color + '15' }]}>
          <Ionicons name={req.call_type === 'AUDIO' ? 'call' : 'videocam'} size={18} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.historyLabel, { color: th.text }]}>
            {req.call_type === 'AUDIO' ? 'Audio call' : 'Video call'} · {meta.label}
          </Text>
          <Text style={[styles.historySub, { color: th.textSecondary }]}>
            {meta.sub(req, req.is_requester)}
          </Text>
          <Text style={[styles.historyDate, { color: th.textMuted }]}>
            {fmtDate(req.created_at)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={th.textMuted} />
      </TouchableOpacity>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────

  const recentHistory = history.slice(0, 3);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: th.background }]} edges={['top', 'bottom']}>
      {/* Header — back + partner identity */}
      <View style={[styles.header, { borderBottomColor: th.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={th.text} />
        </TouchableOpacity>

        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.headerAvatar} contentFit="cover" />
        ) : (
          <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder, { backgroundColor: isDark ? '#3A2A5C' : colors.backgroundLavender }]}>
            <Ionicons name="person" size={20} color={colors.primary} />
          </View>
        )}

        <View style={styles.headerText}>
          <Text style={[styles.headerName, { color: th.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.headerSubRow}>
            <Ionicons name="videocam" size={13} color={colors.success} />
            <Ionicons name="call" size={13} color={colors.verifiedBlue} />
            <Text style={[styles.headerSub, { color: th.textMuted }]}>Calls</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {/* CURRENT */}
        <Text style={[styles.sectionLabel, { color: th.textMuted }]}>CURRENT</Text>
        {isLoading
          ? <View style={[styles.currentCard, { borderColor: th.border }]}><ActivityIndicator color={colors.primary} /></View>
          : error
            ? (
              <View style={[styles.currentCard, { borderColor: th.border }]}>
                <Text style={[styles.emptySub, { color: th.textSecondary, textAlign: 'center' }]}>
                  Could not load requests. Pull to refresh.
                </Text>
              </View>
            )
            : renderCurrentCard()
        }

        {/* HISTORY */}
        {recentHistory.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: th.textMuted, marginTop: spacing.xl }]}>HISTORY</Text>
            {recentHistory.map((req, i) => renderHistoryItem(req, i))}
            {history.length > 3 && (
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/video-call-history' as never,
                    params: { matchId, displayName },
                  })
                }
                activeOpacity={0.7}
              >
                <Text style={[styles.viewAllText, { color: colors.primary }]}>View all →</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerAvatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, marginLeft: spacing.sm + 2, overflow: 'hidden' },
  headerName: { fontSize: 16, fontWeight: '700' },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  headerSub: { fontSize: 12 },
  content: { paddingHorizontal: spacing.sm, paddingTop: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  currentCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  emptyState: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  emptyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  statusTitle: { fontSize: 19, fontWeight: '800' },
  statusSub: { fontSize: 15, lineHeight: 22, marginTop: 4 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expiryIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiryText: { fontSize: 14, fontWeight: '500' },
  cardActions: { gap: spacing.sm },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.xl,
    paddingVertical: 15,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.xl,
    paddingVertical: 13,
    borderWidth: 1.5,
    minHeight: 46,
  },
  outlineBtnText: { fontSize: 15, fontWeight: '600' },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  historyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyLabel: { fontSize: 14, fontWeight: '600' },
  historySub: { fontSize: 12, marginTop: 1 },
  historyDate: { fontSize: 11, marginTop: 2 },
  viewAllBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  viewAllText: { fontSize: 14, fontWeight: '600' },
});
