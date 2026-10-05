/**
 * ActiveVideoCallScreen — Live Agora RTC video call.
 *
 * Flow:
 *   1. Mount → POST /join → get { channel_name, token, uid }
 *   2. Initialize Agora engine → join channel
 *   3. Show live call UI with remote + local video
 *   4. End → POST /end → leaveChannel → navigate to CallEndedScreen
 *
 * The requester is charged on their first successful join.
 * The responder never pays.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Modal,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import {
    AudioProfileType,
    AudioScenarioType,
    ChannelProfileType,
    ClientRoleType,
    createAgoraRtcEngine,
    DegradationPreference,
    IRtcEngine,
    OrientationMode,
    RemoteVideoState,
    RemoteVideoStateReason,
    RenderModeType,
    RtcTextureView,
    VideoSourceType
} from 'react-native-agora';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useEndVideoCall, useJoinVideoCall, useVideoCallRequests } from '@/hooks/videoCall/useVideoCallRequests';
import type { JoinCallCredentials } from '@/types/videoCall';

const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID ?? '';

type CallPhase = 'joining' | 'connecting' | 'active' | 'ended' | 'error';

const PREVIEW_W = 96;
const PREVIEW_H = 140;
const EDGE = 8;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export default function ActiveVideoCallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const { colors: th } = useTheme();

  const { matchId, requestId, displayName, avatarUrl, callType } = useLocalSearchParams<{
    matchId: string;
    requestId: string;
    displayName: string;
    avatarUrl?: string;
    callType?: string;
  }>();

  const joinMutation = useJoinVideoCall();
  const endMutation = useEndVideoCall(matchId ?? '');
  const { data: vcRequests } = useVideoCallRequests(matchId ?? '');

  // call_type is fixed at creation — param is the fast path, query is the
  // authoritative source. Defaults to VIDEO.
  const resolvedCallType =
    vcRequests?.find((r) => r.id === requestId)?.call_type ?? callType ?? 'VIDEO';
  const isAudio = resolvedCallType === 'AUDIO';

  const engineRef = useRef<IRtcEngine | null>(null);
  const credentialsRef = useRef<JoinCallCredentials | null>(null);

  const [phase, setPhase] = useState<CallPhase>('joining');
  const [errorMsg, setErrorMsg] = useState('');
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(!isAudio);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isRemoteVideoOff, setIsRemoteVideoOff] = useState(false);
  const [isLocalLarge, setIsLocalLarge] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Draggable local preview ─────────────────────────────────────────────
  // Free-form drag; the view springs back inside bounds on release.
  const startX = Math.max(EDGE, winW - PREVIEW_W - spacing.lg);
  const startY = insets.top + 64;
  const drag = useRef(new Animated.ValueXY({ x: startX, y: startY })).current;
  const dragPos = useRef({ x: startX, y: startY });

  const minX = EDGE;
  const maxX = Math.max(minX, winW - PREVIEW_W - EDGE);
  const minY = insets.top + EDGE;
  const maxY = Math.max(minY, winH - PREVIEW_H - insets.bottom - EDGE);
  const bounds = useRef({ minX, maxX, minY, maxY });
  bounds.current = { minX, maxX, minY, maxY };

  // Track the true on-screen position (value + offset) continuously.
  useEffect(() => {
    const id = drag.addListener((v) => {
      dragPos.current = v;
    });
    return () => drag.removeListener(id);
  }, [drag]);

  // Keep the preview inside bounds if the window size/insets change.
  useEffect(() => {
    drag.setValue({
      x: clamp(dragPos.current.x, minX, maxX),
      y: clamp(dragPos.current.y, minY, maxY),
    });
  }, [drag, minX, maxX, minY, maxY]);

  const springInsideBounds = () => {
    const b = bounds.current;
    drag.flattenOffset();
    Animated.spring(drag, {
      toValue: {
        x: clamp(dragPos.current.x, b.minX, b.maxX),
        y: clamp(dragPos.current.y, b.minY, b.maxY),
      },
      useNativeDriver: false,
      bounciness: 6,
    }).start();
  };

  const grantAt = useRef(0);
  const lastTapAt = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      // Claim on touch-down so taps are seen too (move-only wouldn't fire for taps).
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        grantAt.current = Date.now();
        drag.stopAnimation();
        drag.setOffset(dragPos.current);
        drag.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: drag.x, dy: drag.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: (_e, g) => {
        const isTap =
          Math.abs(g.dx) < 6 &&
          Math.abs(g.dy) < 6 &&
          Date.now() - grantAt.current < 300;
        if (isTap) {
          const now = Date.now();
          if (now - lastTapAt.current < 300) {
            lastTapAt.current = 0;
            setIsLocalLarge((v) => !v);
          } else {
            lastTapAt.current = now;
          }
        }
        springInsideBounds();
      },
      onPanResponderTerminate: springInsideBounds,
    }),
  ).current;

  // ── Engine teardown ──────────────────────────────────────────────────────

  const teardown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const engine = engineRef.current;
    if (engine) {
      engine.leaveChannel();
      engine.release();
      engineRef.current = null;
    }
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  // End the call and leave this screen — shared by the local "End" button and
  // the remote participant leaving the channel. Idempotent.
  const hasEnded = useRef(false);
  const finishAndExit = useCallback(() => {
    if (hasEnded.current) return;
    hasEnded.current = true;
    teardown();
    endMutation.mutate(requestId ?? '');
    router.replace({
      pathname: '/(app)/video-call-ended' as never,
      params: { matchId, requestId, displayName, avatarUrl: avatarUrl ?? '', callType: resolvedCallType },
    });
  }, [teardown, endMutation, requestId, matchId, displayName, avatarUrl, resolvedCallType, router]);

  // ── Join flow ────────────────────────────────────────────────────────────

  useEffect(() => {
    joinMutation.mutate(requestId ?? '', {
      onSuccess: (creds) => {
        credentialsRef.current = creds;
        initAgora(creds);
      },
      onError: (err: any) => {
        const status = err?.response?.status;
        const raw = err?.response?.data?.error;
        const code = typeof raw === 'string' ? raw : raw?.code;
        if (status === 402 || String(code).toUpperCase().includes('CREDIT')) {
          setPhase('error');
          setErrorMsg('insufficient_credits');
        } else {
          setPhase('error');
          setErrorMsg('Could not connect to the call. Please try again.');
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initAgora = (creds: JoinCallCredentials) => {
    try {
      setPhase('connecting');

      const engine = createAgoraRtcEngine();
      engineRef.current = engine;

      engine.initialize({
        appId: AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      // Audio tuning for 1:1 calls:
      // Chatroom scenario keeps acoustic echo cancellation active at high
      // playback volumes. Video calls default to speakerphone; audio calls
      // start on the earpiece like a normal phone call.
      engine.setAudioProfile(
        AudioProfileType.AudioProfileDefault,
        AudioScenarioType.AudioScenarioChatroom,
      );
      engine.setDefaultAudioRouteToSpeakerphone(!isAudio);

      engine.enableAudio();
      if (!isAudio) {
        engine.enableVideo();
        // HD 720p — clear on phone screens without FHD's bandwidth cost.
        // bitrate 0 lets Agora pick the recommended value; MaintainQuality
        // degrades frame rate before resolution on weak connections.
        engine.setVideoEncoderConfiguration({
          dimensions: { width: 1280, height: 720 },
          frameRate: 24,
          bitrate: 0,
          orientationMode: OrientationMode.OrientationModeAdaptive,
          degradationPreference: DegradationPreference.MaintainQuality,
        });
        engine.startPreview();
      }

      engine.registerEventHandler({
        onJoinChannelSuccess: () => {
          setPhase('active');
          timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
        },
        onUserJoined: (_conn, uid) => {
          setRemoteUid(uid);
          setIsRemoteVideoOff(false);
        },
        onRemoteVideoStateChanged: (_conn, _uid, state, reason) => {
          if (reason === RemoteVideoStateReason.RemoteVideoStateReasonRemoteMuted ||
              state === RemoteVideoState.RemoteVideoStateStopped) {
            setIsRemoteVideoOff(true);
          } else if (reason === RemoteVideoStateReason.RemoteVideoStateReasonRemoteUnmuted ||
                     state === RemoteVideoState.RemoteVideoStateDecoding) {
            setIsRemoteVideoOff(false);
          }
        },
        onUserOffline: () => {
          setRemoteUid(null);
          // Remote ended/left the call — stop on this side immediately too.
          finishAndExit();
        },
        onTokenPrivilegeWillExpire: async () => {
          // Refresh token before it expires
          try {
            const newCreds = await import('@/api/videoCall/videoCallApi').then((m) =>
              m.joinVideoCall(requestId ?? ''),
            );
            engine.renewToken(newCreds.token);
          } catch { /* non-fatal */ }
        },
        onError: (err) => {
          if (__DEV__) console.warn('[Agora] error', err);
        },
      });

      engine.joinChannel(creds.token, creds.channel_name, creds.uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        publishCameraTrack: !isAudio,
        autoSubscribeAudio: true,
        autoSubscribeVideo: !isAudio,
      });
    } catch (e) {
      setPhase('error');
      setErrorMsg('Failed to initialise video. Please try again.');
    }
  };

  // ── Controls ─────────────────────────────────────────────────────────────

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    engineRef.current?.muteLocalAudioStream(next);
  };

  const handleToggleCamera = () => {
    const next = !isCameraOff;
    setIsCameraOff(next);
    engineRef.current?.muteLocalVideoStream(next);
  };

  const handleFlipCamera = () => {
    engineRef.current?.switchCamera();
  };

  const handleToggleSpeaker = () => {
    const next = !isSpeakerOn;
    setIsSpeakerOn(next);
    engineRef.current?.setEnableSpeakerphone(next);
  };

  const handleEndPress = () => setShowEndConfirm(true);
  const handleContinueCall = () => setShowEndConfirm(false);

  const handleConfirmEnd = () => {
    setShowEndConfirm(false);
    finishAndExit();
  };

  const fmtElapsed = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  };

  // ── Insufficient credits ─────────────────────────────────────────────────

  if (phase === 'error' && errorMsg === 'insufficient_credits') {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.errorState}>
          <View style={[styles.errorIcon, { backgroundColor: colors.warning + '25' }]}>
            <Ionicons name="wallet-outline" size={40} color={colors.warning} />
          </View>
          <Text style={styles.errorTitle}>Unable to start call</Text>
          <Text style={styles.errorSub}>Not enough credits</Text>
          <Text style={styles.errorBody}>
            You need more credits to join this video call.
          </Text>
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              router.back();
              router.push('/(app)/credits-shop' as never);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>Get Credits</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelLink} onPress={() => router.back()}>
            <Text style={styles.cancelLinkText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Generic error ────────────────────────────────────────────────────────

  if (phase === 'error') {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={styles.errorTitle}>Could Not Connect</Text>
          <Text style={styles.errorBody}>{errorMsg}</Text>
          <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: colors.danger }]} onPress={() => router.back()}>
            <Text style={styles.ctaBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Joining / Connecting loading ─────────────────────────────────────────

  if (phase === 'joining' || phase === 'connecting') {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingTitle}>Preparing your call</Text>
          <Text style={styles.loadingSub}>Connecting securely…</Text>
        </View>
      </View>
    );
  }

  // ── Active call ──────────────────────────────────────────────────────────

  const remoteConnected = remoteUid != null;

  return (
    <View style={styles.root}>
      {isAudio ? (
        /* ── Audio call — avatar-centric layout, no video surfaces ── */
        <View style={styles.audioCenter}>
          <View style={[styles.audioAvatarRing, { borderColor: colors.primaryLight + '55', shadowColor: colors.primary }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.audioAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.audioAvatar, styles.waitingAvatarPlaceholder]}>
                <Ionicons name="person" size={52} color={colors.primary} />
              </View>
            )}
          </View>
          <Text style={styles.audioName} numberOfLines={1}>{displayName}</Text>
          <View style={styles.audioStatusRow}>
            <Ionicons name="call" size={13} color="rgba(255,255,255,0.6)" />
            <View style={[styles.statusDot, { backgroundColor: remoteConnected ? colors.success : colors.warning }]} />
            <Text style={styles.audioStatus}>{remoteConnected ? 'Connected' : 'Ringing…'}</Text>
          </View>
        </View>
      ) : (
        <>
      {/* Remote feed — full-screen by default, floating card when swapped.
          The view stays mounted; only the wrapper's size/role changes, so the
          stream never pauses or re-binds. */}
      <Animated.View
        {...(isLocalLarge ? panResponder.panHandlers : {})}
        pointerEvents={isLocalLarge ? 'auto' : 'none'}
        style={
          isLocalLarge
            ? [styles.localPreview, { transform: drag.getTranslateTransform() }]
            : StyleSheet.absoluteFill
        }
      >
        {remoteConnected ? (
          <>
            <RtcTextureView
              canvas={{
                uid: remoteUid,
                sourceType: VideoSourceType.VideoSourceRemote,
                renderMode: RenderModeType.RenderModeHidden,
              }}
              style={StyleSheet.absoluteFill}
            />
            {isRemoteVideoOff && (
              <View style={styles.remoteOffOverlay}>
                <View>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.remoteOffAvatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.remoteOffAvatar, styles.waitingAvatarPlaceholder]}>
                      <Ionicons name="person" size={28} color={colors.primary} />
                    </View>
                  )}
                  <View style={styles.remoteOffChip}>
                    <Ionicons name="videocam-off" size={13} color="#fff" />
                  </View>
                </View>
              </View>
            )}
          </>
        ) : isLocalLarge ? (
          <View style={[styles.localVideo, styles.cameraOffPlaceholder]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.localVideo} contentFit="cover" />
            ) : (
              <Ionicons name="person" size={22} color="rgba(255,255,255,0.7)" />
            )}
          </View>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.waitingState]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.waitingAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.waitingAvatar, styles.waitingAvatarPlaceholder]}>
                <Ionicons name="person" size={44} color={colors.primary} />
              </View>
            )}
            <Text style={styles.waitingName}>{displayName}</Text>
            <View style={styles.waitingRow}>
              <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
              <Text style={styles.waitingText}>Calling…</Text>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Top scrim — partner identity */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent']}
        style={[styles.topScrim, { paddingTop: insets.top + spacing.md }]}
        pointerEvents="none"
      >
        <View style={styles.partnerPill}>
          <Ionicons name="videocam" size={14} color="rgba(255,255,255,0.85)" />
          <Text style={styles.partnerPillText} numberOfLines={1}>{displayName}</Text>
          <View style={[styles.statusDot, { backgroundColor: remoteConnected ? colors.success : colors.warning }]} />
          <Text style={[styles.partnerPillSub, { color: remoteConnected ? colors.success : 'rgba(255,255,255,0.75)' }]}>
            {remoteConnected ? 'Connected' : 'Ringing'}
          </Text>
        </View>
      </LinearGradient>

      {/* Local feed — floating card by default, full-screen when swapped.
          Double-tap whichever feed is floating to swap. */}
      <Animated.View
        {...(!isLocalLarge ? panResponder.panHandlers : {})}
        pointerEvents={!isLocalLarge ? 'auto' : 'none'}
        style={
          !isLocalLarge
            ? [styles.localPreview, { transform: drag.getTranslateTransform() }]
            : StyleSheet.absoluteFill
        }
      >
        {isCameraOff ? (
          isLocalLarge ? (
            <View style={[StyleSheet.absoluteFill, styles.waitingState]}>
              <Ionicons name="videocam-off" size={44} color="rgba(255,255,255,0.5)" />
              <Text style={styles.waitingText}>Camera off</Text>
            </View>
          ) : (
            <View style={[styles.localVideo, styles.cameraOffPlaceholder]}>
              <Ionicons name="videocam-off" size={18} color="rgba(255,255,255,0.7)" />
            </View>
          )
        ) : (
          <RtcTextureView
            canvas={{
              uid: 0,
              sourceType: VideoSourceType.VideoSourceCamera,
              renderMode: RenderModeType.RenderModeHidden,
            }}
            style={StyleSheet.absoluteFill}
          />
        )}
      </Animated.View>

        </>
      )}

      {/* Bottom scrim — timer + controls + end */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.72)']}
        style={[styles.bottomScrim, { paddingBottom: insets.bottom + spacing.lg }]}
        pointerEvents="box-none"
      >
        {/* Timer */}
        <View style={styles.timerPill}>
          <Ionicons name="ellipse" size={8} color={remoteConnected ? colors.success : colors.warning} />
          <Text style={styles.timerText}>{fmtElapsed(elapsed)}</Text>
        </View>

        {/* Controls row */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
            onPress={handleToggleMute}
            activeOpacity={0.8}
            accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
          >
            <Ionicons name={isMuted ? 'mic-off' : 'mic-outline'} size={24} color="#FFF" />
            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          {isAudio ? (
            <TouchableOpacity
              style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
              onPress={handleToggleSpeaker}
              activeOpacity={0.8}
              accessibilityLabel={isSpeakerOn ? 'Speaker off' : 'Speaker on'}
            >
              <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-low-outline'} size={24} color="#FFF" />
              <Text style={styles.controlLabel}>Speaker</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
                onPress={handleToggleCamera}
                activeOpacity={0.8}
                accessibilityLabel={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
              >
                <Ionicons name={isCameraOff ? 'videocam-off-outline' : 'videocam-outline'} size={24} color="#FFF" />
                <Text style={styles.controlLabel}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlBtn}
                onPress={handleFlipCamera}
                activeOpacity={0.8}
                accessibilityLabel="Flip camera"
              >
                <Ionicons name="camera-reverse-outline" size={24} color="#FFF" />
                <Text style={styles.controlLabel}>Flip</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* End call */}
        <TouchableOpacity
          style={styles.endBtn}
          onPress={handleEndPress}
          activeOpacity={0.85}
          accessibilityLabel="End call"
        >
          <Ionicons name="call" size={26} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
          <Text style={styles.endLabel}>End</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* End call confirmation modal */}
      <Modal
        visible={showEndConfirm}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleContinueCall}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: th.surface }]}>
            <Text style={[styles.modalTitle, { color: th.text }]}>
              {isAudio ? 'End audio call?' : 'End video call?'}
            </Text>
            <Text style={[styles.modalSub, { color: th.textSecondary }]}>
              Are you sure you want to leave this call?
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              onPress={handleContinueCall}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnText}>Continue Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.danger }]}
              onPress={handleConfirmEnd}
              activeOpacity={0.85}
              disabled={endMutation.isPending}
            >
              {endMutation.isPending
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.modalBtnText}>End Call</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0E0B1A' },

  // ── Waiting for remote ───────────────────────────────────────────────
  waitingState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141020',
    gap: spacing.md,
  },
  waitingAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  waitingAvatarPlaceholder: {
    backgroundColor: colors.backgroundLavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingName: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waitingText: { color: 'rgba(255,255,255,0.6)', fontSize: 15 },

  // ── Top overlay ──────────────────────────────────────────────────────
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
    zIndex: 5,
  },
  partnerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    maxWidth: '70%',
  },
  partnerPillText: { color: '#FFF', fontSize: 14, fontWeight: '700', flexShrink: 1 },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  partnerPillSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '500' },

  // ── Local preview ────────────────────────────────────────────────────
  localPreview: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: PREVIEW_W,
    height: PREVIEW_H,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: '#000',
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 10,
  },
  localVideo: { flex: 1 },
  // ── Audio call ─────────────────────────────────────────────────────────
  audioCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: 120,
  },
  audioAvatarRing: {
    padding: 6,
    borderRadius: 80,
    borderWidth: 1.5,
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    marginBottom: spacing.sm,
  },
  audioAvatar: { width: 130, height: 130, borderRadius: 65 },
  audioName: { color: '#FFF', fontSize: 24, fontWeight: '800', maxWidth: '80%' },
  audioStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  audioStatus: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '500' },
  cameraOffPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remoteOffOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#141020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remoteOffAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
  },
  remoteOffChip: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 12,
    padding: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  // ── Bottom overlay (one container — nothing overlaps) ────────────────
  bottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.lg,
    zIndex: 10,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  timerText: { color: '#FFF', fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    width: 68,
    paddingVertical: 12,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  controlBtnActive: { backgroundColor: 'rgba(255,255,255,0.38)' },
  controlLabel: { fontSize: 11, color: '#FFF', fontWeight: '500' },
  endBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  endLabel: { fontSize: 11, color: '#FFF', fontWeight: '600' },

  // ── Loading / error states ───────────────────────────────────────────
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  loadingTitle: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  loadingSub: { color: 'rgba(255,255,255,0.6)', fontSize: 15 },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  errorIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  errorTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  errorSub: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  errorBody: { color: 'rgba(255,255,255,0.55)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    borderRadius: radius.xl,
    paddingVertical: 16,
    marginTop: spacing.md,
  },
  ctaBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  cancelLink: { paddingVertical: spacing.sm },
  cancelLinkText: { color: 'rgba(255,255,255,0.55)', fontSize: 14 },

  // ── Confirmation modal ───────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalCard: {
    width: '100%',
    borderRadius: radius.xl * 1.5,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  modalSub: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  modalBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
    paddingVertical: 15,
    minHeight: 50,
  },
  modalBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
