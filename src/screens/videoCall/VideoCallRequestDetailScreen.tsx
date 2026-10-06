/**
 * VideoCallRequestDetailScreen
 *
 * Adapts its content based on request status + is_requester:
 *   PENDING + is_requester  → Outgoing pending (Screen 4)
 *   PENDING + !is_requester → Incoming request (Screen 6)  [autoAccept param triggers accept]
 *   ACCEPTED                → Call ready (Screens 7 & 8)
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
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
    useAcceptVideoCallRequest,
    useCancelVideoCallRequest,
    useDeclineVideoCallRequest,
    useRemindCooldown,
    useRemindVideoCallRequest,
    useVideoCallRequests
} from '@/hooks/videoCall/useVideoCallRequests';
import { TERMINAL_STATUSES, type VideoCallRequestStatus } from '@/types/videoCall';
import { extractRetryAfterSeconds } from '@/utils/retryAfter';

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────────────────────

export default function VideoCallRequestDetailScreen() {
  const router = useRouter();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const params = useLocalSearchParams<{
    matchId: string;
    requestId: string;
    displayName?: string;
    avatarUrl?: string;
    autoAccept?: string;
    callType?: string;
  }>();
  const { matchId, requestId, avatarUrl, autoAccept, callType } = params;
  const displayName = params.displayName || 'Your match';

  const [avatarFailed, setAvatarFailed] = useState(false);

  // 5s while this screen is up — joined-state updates (requester_joined /
  // responder_joined) and accept/cancel transitions must feel live.
  const { data: requests, isLoading, isFetching, refetch } = useVideoCallRequests(matchId ?? '', 5_000);
  const request = requests?.find((r) => r.id === requestId);

  // The request may be absent from a stale cache while the mount refetch is
  // still in-flight — don't flash "Request not found" until a fetch settles.
  const fetchSettledRef = useRef(false);
  if (!isFetching) fetchSettledRef.current = true;

  // call_type is fixed at creation — the request row is authoritative once
  // loaded; the nav param is the fast path for loading/error states.
  const isAudio = (request?.call_type ?? callType) === 'AUDIO';
  const callTypeIcon: React.ComponentProps<typeof Ionicons>['name'] = isAudio ? 'call' : 'videocam';
  const callTypeLabel = isAudio ? 'Audio Call' : 'Video Call';

  const acceptMutation = useAcceptVideoCallRequest(matchId ?? '');
  const cancelMutation = useCancelVideoCallRequest(matchId ?? '');
  const declineMutation = useDeclineVideoCallRequest(matchId ?? '');
  const remindMutation = useRemindVideoCallRequest(matchId ?? '');
  const { cooldownSeconds: remindCooldown, startCooldown: startRemindCooldown } =
    useRemindCooldown(request?.next_remind_in_seconds);

  // Re-pings the responder's push while our request is pending.
  // Backend cooldown → 429 "Reminder sent too recently" (+ Retry-After).
  const handleRemind = () => {
    if (remindCooldown > 0) return;
    remindMutation.mutate(requestId ?? '', {
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
          // No longer pending — pull fresh state.
          refetch();
        } else {
          themedError('Could Not Remind', 'Something went wrong. Please try again.');
        }
      },
    });
  };

  // Auto-accept flow (triggered from incoming inline state → accept)
  useEffect(() => {
    if (autoAccept === '1' && request?.can_accept && !acceptMutation.isPending && !acceptMutation.isSuccess) {
      acceptMutation.mutate(requestId ?? '', {
        onError: () => themedError('Could Not Accept', 'Please try again.'),
      });
    }
  }, [autoAccept, request?.can_accept]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = () => {
    if (!request?.can_cancel) return;
    themedAlert({
      title: 'Cancel Request?',
      message: `This will cancel your ${isAudio ? 'audio' : 'video'} call request.`,
      icon: 'ban-outline',
      iconColor: colors.danger,
      buttons: [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: () =>
            cancelMutation.mutate(requestId ?? '', {
              onSuccess: () => router.back(),
              onError: () => themedError('Could Not Cancel', 'Please try again.'),
            }),
        },
      ],
    });
  };

  const handleDecline = () => {
    if (!request?.can_accept) return;
    themedAlert({
      title: 'Decline Request?',
      message: `Decline ${displayName}'s ${isAudio ? 'audio' : 'video'} call request?`,
      icon: 'close-circle-outline',
      iconColor: colors.danger,
      buttons: [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () =>
            declineMutation.mutate(requestId ?? '', {
              onSuccess: () => router.back(),
              onError: () => themedError('Could Not Decline', 'Please try again.'),
            }),
        },
      ],
    });
  };

  const handleJoinCall = () => {
    router.push({
      pathname: '/(app)/video-call-active' as never,
      params: {
        matchId,
        requestId,
        displayName,
        avatarUrl: avatarUrl ?? '',
        callType: request?.call_type ?? 'VIDEO',
      },
    });
  };

  // ── Shared pieces ──────────────────────────────────────────────────────

  const heroAvatar = (badgeIcon: keyof typeof Ionicons.glyphMap, badgeColor: string) => (
    <View style={[styles.avatarRing, { borderColor: colors.primaryLight + '55', shadowColor: colors.primary }]}>
      <View style={[styles.avatarRingInner, { borderColor: colors.primary + '30' }]}>
        {avatarUrl && !avatarFailed ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: isDark ? '#3A2A5C' : colors.backgroundLavender }]}>
            <Ionicons name="person" size={48} color={colors.primary} />
          </View>
        )}
      </View>
      <View style={[styles.camBadge, { borderColor: th.background, backgroundColor: badgeColor }]}>
        <Ionicons name={badgeIcon} size={16} color="#FFF" />
      </View>
    </View>
  );

  const infoRow = (icon: keyof typeof Ionicons.glyphMap, tint: string, label: string, trailing?: React.ReactNode) => (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: tint + '15' }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <Text style={[styles.infoText, { color: th.textSecondary }]}>{label}</Text>
      {trailing}
    </View>
  );

  const divider = <View style={[styles.infoDivider, { backgroundColor: th.border }]} />;

  const gradientBtn = (
    gradient: [string, string],
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    onPress: () => void,
    pending: boolean,
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
              <Ionicons name={icon} size={20} color="#FFF" />
              <Text style={styles.primaryBtnText}>{label}</Text>
            </>
          )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const outlineBtn = (
    icon: keyof typeof Ionicons.glyphMap | null,
    label: string,
    onPress: () => void,
    pending: boolean,
    tint: string,
    disabled = false,
  ) => (
    <TouchableOpacity
      style={[styles.dangerBtn, { borderColor: tint }, disabled && !pending && { opacity: 0.5 }]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={pending || disabled}
    >
      {pending
        ? <ActivityIndicator size="small" color={tint} />
        : (
          <>
            {icon && <Ionicons name={icon} size={18} color={tint} />}
            <Text style={[styles.dangerBtnText, { color: tint }]}>{label}</Text>
          </>
        )}
    </TouchableOpacity>
  );

  const dangerBtn = (label: string, onPress: () => void, pending: boolean) =>
    outlineBtn(null, label, onPress, pending, colors.danger);

  const header = (title: string, icon?: React.ComponentProps<typeof Ionicons>['name']) => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={22} color={th.text} />
      </TouchableOpacity>
      <View style={styles.headerTitleWrap}>
        {icon && <Ionicons name={icon} size={18} color={colors.primary} />}
        <Text style={[styles.headerTitle, { color: th.text }]}>{title}</Text>
      </View>
      <View style={{ width: 40 }} />
    </View>
  );

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading || (autoAccept === '1' && acceptMutation.isPending)) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: th.background }]} edges={['top', 'bottom']}>
        {header(callTypeLabel, callTypeIcon)}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          {autoAccept === '1' && (
            <Text style={[styles.loadingLabel, { color: th.textSecondary }]}>Accepting request…</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: th.background }]} edges={['top', 'bottom']}>
        {header(callTypeLabel, callTypeIcon)}
        <View style={styles.centered}>
          {fetchSettledRef.current ? (
            <Text style={[styles.loadingLabel, { color: th.textSecondary }]}>Request not found.</Text>
          ) : (
            <ActivityIndicator size="large" color={colors.primary} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const isPendingOutgoing = request.status === 'PENDING' && request.is_requester;
  const isPendingIncoming = request.status === 'PENDING' && !request.is_requester;
  const isAccepted = request.status === 'ACCEPTED';
  const isTerminal = TERMINAL_STATUSES.includes(request.status);

  // Terminal copy — without this branch the screen renders header + blank
  // body when a request gets cancelled/declined while open.
  const TERMINAL_META: Record<
    VideoCallRequestStatus,
    { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; title: string; body: string }
  > = {
    PENDING: { icon: 'time', color: colors.warning, title: '', body: '' },
    ACCEPTED: { icon: 'checkmark', color: colors.success, title: '', body: '' },
    CANCELLED: { icon: 'close-circle', color: colors.danger, title: 'Request Cancelled', body: `The ${isAudio ? 'audio' : 'video'} call request was cancelled.` },
    DECLINED: { icon: 'close-circle', color: colors.danger, title: 'Call Declined', body: `The ${isAudio ? 'audio' : 'video'} call request was declined.` },
    EXPIRED: { icon: 'time-outline', color: colors.warning, title: 'Request Expired', body: `The ${isAudio ? 'audio' : 'video'} call request expired.` },
    COMPLETED: { icon: 'checkmark-circle', color: colors.success, title: 'Call Completed', body: `The ${isAudio ? 'audio' : 'video'} call has ended.` },
  };
  const terminalMeta = TERMINAL_META[request.status];

  const myJoined = request.is_requester ? request.requester_joined : request.responder_joined;
  const otherJoined = request.is_requester ? request.responder_joined : request.requester_joined;

  const headerTitle = isAccepted
    ? isAudio ? 'Audio Call Ready' : 'Video Call Ready'
    : callTypeLabel;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: th.background }]} edges={['top', 'bottom']}>
      {header(headerTitle, callTypeIcon)}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── OUTGOING PENDING ──────────────────────────────────────────── */}
        {isPendingOutgoing && (
          <>
            <View style={styles.heroSection}>
              {heroAvatar('time', colors.warning)}
              <View style={styles.heroText}>
                <Text style={[styles.heroTitle, { color: th.text }]}>
                  {callTypeLabel} Request Sent
                </Text>
                <Text style={[styles.heroSub, { color: th.textSecondary }]}>
                  Waiting for {displayName} to respond
                </Text>
              </View>
            </View>

            {/* Status card */}
            <View style={[styles.statusCard, { backgroundColor: isDark ? th.surface : '#FAF7FF', borderColor: th.border }]}>
              {infoRow(callTypeIcon, colors.primary, 'Call type', (
                <Text style={[styles.infoValue, { color: th.text }]}>{isAudio ? 'Audio' : 'Video'}</Text>
              ))}
              {divider}
              {infoRow('checkmark', colors.success, `${callTypeLabel} request sent`)}
              {divider}
              {infoRow('hourglass-outline', colors.warning, `${displayName} has been notified`)}
              {request.request_expires_at && (
                <>
                  {divider}
                  {infoRow('time-outline', th.textMuted, 'Expires in', (
                    <Text style={[styles.infoValue, { color: th.text }]}>{fmtExpiry(request.request_expires_at)}</Text>
                  ))}
                </>
              )}
            </View>

            {request.next_remind_in_seconds !== null && outlineBtn(
              'notifications-outline',
              remindCooldown > 0 ? `Remind in ${remindCooldown}s` : `Remind ${displayName}`,
              handleRemind,
              remindMutation.isPending,
              colors.primary,
              remindCooldown > 0,
            )}

            {request.can_cancel && dangerBtn('Cancel Request', handleCancel, cancelMutation.isPending)}

            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => router.push({
                pathname: '/(app)/video-call-history' as never,
                params: { matchId, displayName },
              })}
              activeOpacity={0.7}
            >
              <Text style={[styles.linkBtnText, { color: colors.primary }]}>View History →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── INCOMING PENDING ──────────────────────────────────────────── */}
        {isPendingIncoming && (
          <>
            <View style={styles.heroSection}>
              {heroAvatar(isAudio ? 'call' : 'videocam', colors.primary)}
              <View style={styles.heroText}>
                <Text style={[styles.heroTitle, { color: th.text }]}>{displayName}</Text>
                <Text style={[styles.heroSub, { color: th.textSecondary }]}>
                  wants to {isAudio ? 'audio call' : 'video call'} with you
                </Text>
              </View>
            </View>

            <View style={[styles.statusCard, { backgroundColor: isDark ? th.surface : '#FAF7FF', borderColor: th.border }]}>
              {infoRow(isAudio ? 'call-outline' : 'videocam-outline', colors.primary, isAudio ? 'Audio call request' : 'Video call request')}
              {request.request_expires_at && (
                <>
                  {divider}
                  {infoRow('time-outline', th.textMuted, 'Expires in', (
                    <Text style={[styles.infoValue, { color: th.text }]}>{fmtExpiry(request.request_expires_at)}</Text>
                  ))}
                </>
              )}
            </View>

            {request.can_accept && gradientBtn(
              [colors.success, '#16A34A'],
              'checkmark',
              'Accept',
              () => acceptMutation.mutate(request.id, {
                onError: () => themedError('Could Not Accept', 'Please try again.'),
              }),
              acceptMutation.isPending,
            )}

            {dangerBtn('Decline', handleDecline, declineMutation.isPending)}
          </>
        )}

        {/* ── ACCEPTED ─────────────────────────────────────────────────── */}
        {isAccepted && (
          <>
            <View style={styles.heroSection}>
              {heroAvatar('checkmark', colors.success)}
              <View style={styles.heroText}>
                <Text style={[styles.heroTitle, { color: th.text }]}>{callTypeLabel} Ready</Text>
                <Text style={[styles.heroSub, { color: th.textSecondary }]}>
                  {otherJoined
                    ? `${displayName} is already waiting for you`
                    : `Your ${isAudio ? 'audio' : 'video'} call request was accepted`}
                </Text>
              </View>
            </View>

            {/* Join status card */}
            <View style={[styles.statusCard, { backgroundColor: isDark ? th.surface : '#FAF7FF', borderColor: th.border }]}>
              {infoRow('person', colors.primary, 'You', (
                <View style={styles.joinStatus}>
                  {myJoined
                    ? <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    : <View style={[styles.pendingDot, { borderColor: th.textMuted }]} />}
                  <Text style={[styles.joinStatusText, { color: myJoined ? colors.success : th.textMuted }]}>
                    {myJoined ? 'Joined' : 'Not joined'}
                  </Text>
                </View>
              ))}
              {divider}
              {infoRow('person', th.textMuted, displayName, (
                <View style={styles.joinStatus}>
                  {otherJoined
                    ? <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    : <View style={[styles.pendingDot, { borderColor: th.textMuted }]} />}
                  <Text style={[styles.joinStatusText, { color: otherJoined ? colors.success : th.textMuted }]}>
                    {otherJoined ? 'Joined' : 'Not joined'}
                  </Text>
                </View>
              ))}
            </View>

            {request.can_join && gradientBtn(
              [colors.primary, colors.primaryDark],
              isAudio ? 'call' : 'videocam',
              'Join Call',
              handleJoinCall,
              false,
            )}
          </>
        )}

        {/* ── TERMINAL — cancelled / declined / expired / completed ──────
            Without this branch a request ending while this screen is open
            renders the header over a blank body. */}
        {isTerminal && (
          <>
            <View style={styles.heroSection}>
              {heroAvatar(terminalMeta.icon, terminalMeta.color)}
              <View style={styles.heroText}>
                <Text style={[styles.heroTitle, { color: th.text }]}>{terminalMeta.title}</Text>
                <Text style={[styles.heroSub, { color: th.textSecondary }]}>
                  {terminalMeta.body}
                </Text>
              </View>
            </View>

            {outlineBtn('arrow-back-outline', 'Go Back', () => router.back(), false, colors.primary)}

            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => router.push({
                pathname: '/(app)/video-call-history' as never,
                params: { matchId, displayName },
              })}
              activeOpacity={0.7}
            >
              <Text style={[styles.linkBtnText, { color: colors.primary }]}>View History →</Text>
            </TouchableOpacity>
          </>
        )}
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
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingLabel: { fontSize: 15 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },

  // ── Hero avatar ─────────────────────────────────────────────────────────
  heroSection: { alignItems: 'center', gap: spacing.sm },
  heroText: { alignItems: 'center', gap: 4 },
  avatarRing: {
    padding: 6,
    borderRadius: 76,
    borderWidth: 1.5,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginBottom: spacing.sm,
  },
  avatarRingInner: {
    padding: 4,
    borderRadius: 66,
    borderWidth: 1,
  },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  camBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  heroSub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  // ── Status / info card ──────────────────────────────────────────────────
  statusCard: {
    width: '100%',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  infoValue: { fontSize: 13, fontWeight: '700' },
  infoDivider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
  pendingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  joinStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  joinStatusText: { fontSize: 12, fontWeight: '600' },

  // ── Buttons ─────────────────────────────────────────────────────────────
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.xl,
    paddingVertical: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  dangerBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.xl,
    paddingVertical: 14,
    borderWidth: 1.5,
    minHeight: 50,
  },
  dangerBtnText: { fontSize: 15, fontWeight: '600' },
  linkBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  linkBtnText: { fontSize: 14, fontWeight: '600' },
});
