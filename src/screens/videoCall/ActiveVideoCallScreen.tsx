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
 *
 * Duration cap: the call deadline is anchored server-side on the first join
 * (`call_deadline_at` on the request; `expires_at` on join creds is the same
 * instant). The countdown runs against it and the call ends at 0 — Agora
 * drops both participants when the token privilege expires anyway, so this
 * is the graceful UX layer on top.
 */
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  PanResponder,
  PermissionsAndroid,
  Platform,
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
  IRtcEngineEventHandler,
  LastmileProbeResultState,
  OrientationMode,
  QualityType,
  RemoteAudioState,
  RemoteAudioStateReason,
  RemoteVideoState,
  RemoteVideoStateReason,
  RenderModeType,
  RtcSurfaceView,
  RtcTextureView,
  StreamFallbackOptions,
  UserOfflineReasonType,
  VideoEncoderConfiguration,
  VideoSourceType
} from 'react-native-agora';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { joinVideoCall } from '@/api/videoCall/videoCallApi';
import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useEndVideoCall, useJoinVideoCall, useVideoCallRequests, vcRequestsKey } from '@/hooks/videoCall/useVideoCallRequests';
import type { JoinCallCredentials } from '@/types/videoCall';
import * as Sentry from '@sentry/react-native';

const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID ?? '';

type CallPhase = 'joining' | 'connecting' | 'active' | 'ended' | 'error';

const PREVIEW_W = 96;
const PREVIEW_H = 140;
const EDGE = 8;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// AgoraRtcTextureView is Android-only — iOS registers AgoraRtcSurfaceView.
// Rendering the wrong one throws "Unimplemented Component".
const RtcVideoView = Platform.OS === 'ios' ? RtcSurfaceView : RtcTextureView;

// Encoder tiers picked once at join time from the last-mile probe:
// 360p@15 suits congested mobile links (~400 kbps); 480p@24 is reserved for
// measured-good links (~800 kbps+). bitrate 0 = Agora's recommended value;
// MaintainBalanced sheds resolution AND frame rate under congestion —
// MaintainQuality would hold resolution, drop to slideshow fps, and still
// saturate the link.
const videoEncoderConfig = (highQuality: boolean): VideoEncoderConfiguration => ({
  dimensions: highQuality ? { width: 640, height: 480 } : { width: 640, height: 360 },
  frameRate: highQuality ? 24 : 15,
  bitrate: 0,
  orientationMode: OrientationMode.OrientationModeAdaptive,
  degradationPreference: DegradationPreference.MaintainBalanced,
});

export default function ActiveVideoCallScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
  // 5s while the call screen is mounted — the deadline/status updates need
  // to be fresher here than on waiting screens (default 15s).
  const { data: vcRequests } = useVideoCallRequests(matchId ?? '', 5_000);

  const liveRequest = vcRequests?.find((r) => r.id === requestId);

  // call_type is fixed at creation — param is the fast path, query is the
  // authoritative source. Defaults to VIDEO.
  const resolvedCallType = liveRequest?.call_type ?? callType ?? 'VIDEO';
  const isAudio = resolvedCallType === 'AUDIO';

  const engineRef = useRef<IRtcEngine | null>(null);
  const credentialsRef = useRef<JoinCallCredentials | null>(null);
  // Async races: joinVideoCall/token-refresh callbacks can resolve after
  // the screen unmounts or the engine is torn down — touching the native
  // engine then crashes. These guards make teardown and late callbacks safe.
  const mountedRef = useRef(true);
  const agoraHandlerRef = useRef<IRtcEngineEventHandler | null>(null);

  const [phase, setPhase] = useState<CallPhase>('joining');
  const [errorMsg, setErrorMsg] = useState('');
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(!isAudio);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isRemoteVideoOff, setIsRemoteVideoOff] = useState(false);
  const [isRemoteAudioMuted, setIsRemoteAudioMuted] = useState(false);
  const [weakNetwork, setWeakNetwork] = useState(false);
  const [isLocalLarge, setIsLocalLarge] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  // Call deadline — null until known (join creds' expires_at first, then the
  // request's call_deadline_at which is authoritative). `remaining` is the
  // countdown in seconds; `capSeconds` is the total for the progress bar.
  const deadlineMsRef = useRef<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [capSeconds, setCapSeconds] = useState(0);
  // On Android permissions must be granted before Agora can access hardware.
  // iOS uses Info.plist declarations — no runtime check needed here.
  const [permissionsGranted, setPermissionsGranted] = useState(Platform.OS !== 'android');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setDeadline = useCallback((ms: number | null) => {
    if (ms == null || !Number.isFinite(ms) || deadlineMsRef.current === ms) return;
    deadlineMsRef.current = ms;
    const rem = Math.max(0, Math.ceil((ms - Date.now()) / 1000));
    // Renewals return expires_at = min(deadline, now+ttl) which can precede
    // the deadline — only grow the cap estimate, never shrink it.
    setCapSeconds((c) => Math.max(c, rem));
    setRemaining(rem);
  }, []);

  // The request row's call_deadline_at is authoritative — overwrite the
  // estimate taken from join creds as soon as the poll delivers it.
  useEffect(() => {
    const iso = liveRequest?.call_deadline_at;
    if (iso) setDeadline(Date.parse(iso));
  }, [liveRequest?.call_deadline_at, setDeadline]);

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
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const engine = engineRef.current;
    if (engine) {
      // Null the ref FIRST — any in-flight async callback (token refresh,
      // join success) that reads engineRef will bail instead of calling
      // into a released native engine.
      engineRef.current = null;
      try {
        // Unregister before release so no event callback can fire mid-
        // teardown; stopPreview detaches the local TextureView; sync
        // release blocks until the native engine is actually destroyed —
        // async release races view unmount on slower devices.
        if (agoraHandlerRef.current) engine.unregisterEventHandler(agoraHandlerRef.current);
        engine.stopPreview();
        engine.leaveChannel();
        engine.release(true);
      } catch {
        // Engine may already be partially released — teardown must never
        // throw or the user is stranded on a dead call screen.
      }
    }
  }, []);

  useEffect(() => () => {
    mountedRef.current = false;
    teardown();
  }, [teardown]);

  // End the call and leave this screen — shared by the local "End" button and
  // the remote participant leaving the channel. Idempotent.
  const hasEnded = useRef(false);
  const finishAndExit = useCallback((endReason?: 'time_limit') => {
    if (hasEnded.current) return;
    hasEnded.current = true;
    teardown();
    endMutation.mutate(requestId ?? '');
    router.replace({
      pathname: '/(app)/video-call-ended' as never,
      params: { matchId, requestId, displayName, avatarUrl: avatarUrl ?? '', callType: resolvedCallType, endReason },
    });
  }, [teardown, endMutation, requestId, matchId, displayName, avatarUrl, resolvedCallType, router]);

  // ── Android permission check ─────────────────────────────────────────────
  // Request camera + microphone on Android and block the call if the user
  // denies them — without permissions Agora silently produces no video/audio
  // which is very confusing. iOS relies on Info.plist, no runtime check here.

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // Audio-only calls don't need camera permission.
    const permsNeeded = isAudio
      ? [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]
      : [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, PermissionsAndroid.PERMISSIONS.CAMERA];

    PermissionsAndroid.requestMultiple(permsNeeded).then((results) => {
      const audioOk =
        results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
      const cameraOk =
        isAudio ||
        results[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;

      if (!audioOk || !cameraOk) {
        setPhase('error');
        setErrorMsg('permissions_denied');
      } else {
        setPermissionsGranted(true);
      }
    }).catch(() => {
      // If the permission API itself errors, try to proceed — Agora will show
      // its own error if hardware access fails.
      setPermissionsGranted(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Join flow ────────────────────────────────────────────────────────────
  // Gated behind permissionsGranted — on iOS this is true immediately;
  // on Android it becomes true once the user grants camera + microphone.

  useEffect(() => {
    if (!permissionsGranted) return;

    joinMutation.mutate(requestId ?? '', {
      onSuccess: (creds) => {
        // Screen unmounted or call already ended while the join request was
        // in flight — creating an engine now would leak it and bind video
        // surfaces to dead views.
        if (!mountedRef.current || hasEnded.current) return;
        credentialsRef.current = creds;
        // expires_at on the first join is the token privilege expiry, which
        // the backend clamps to the call deadline — use it as the countdown
        // target until the request row's call_deadline_at arrives on poll.
        setDeadline(Date.parse(creds.expires_at));
        initAgora(creds);
        // Fetch the freshly-anchored call_deadline_at immediately rather than
        // waiting out the 15 s poll — the countdown starts at once.
        queryClient.invalidateQueries({ queryKey: vcRequestsKey(matchId ?? '') });
      },
      onError: (err: any) => {
        if (!mountedRef.current) return;
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
  }, [permissionsGranted]);

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
      // Default scenario — Chatroom enables in-ear monitoring (local voice
      // loopback) on Android, which makes callers hear themselves instead of
      // the remote side. Video calls default to speakerphone; audio calls
      // start on the earpiece like a normal phone call.
      engine.setAudioProfile(
        AudioProfileType.AudioProfileDefault,
        AudioScenarioType.AudioScenarioDefault,
      );
      engine.setDefaultAudioRouteToSpeakerphone(!isAudio);

      engine.enableAudio();
      if (!isAudio) {
        engine.enableVideo();
        // Start low — the last-mile probe below upgrades to 480p before
        // joinChannel if the measured link can sustain it.
        engine.setVideoEncoderConfiguration(videoEncoderConfig(false));
        // Graceful collapse: when either direction can't sustain video the
        // SDK falls back to audio-only instead of freezing, and restores
        // video automatically when the network recovers. Must be set
        // before joinChannel.
        engine.setLocalPublishFallbackOption(StreamFallbackOptions.StreamFallbackOptionAudioOnly);
        engine.setRemoteSubscribeFallbackOption(StreamFallbackOptions.StreamFallbackOptionAudioOnly);
        engine.startPreview();
      }

      // One-shot quality pick — whichever probe signal arrives first (or the
      // 4s timeout) decides the encoder tier, then joins once. No mid-call
      // switching: the decision is made once, before joinChannel.
      let joined = false;
      let probeTimer: ReturnType<typeof setTimeout> | null = null;
      const joinNow = (goodLink: boolean) => {
        if (joined || !mountedRef.current || hasEnded.current || engineRef.current !== engine) return;
        joined = true;
        if (probeTimer) {
          clearTimeout(probeTimer);
          probeTimer = null;
        }
        if (!isAudio) {
          try { engine.stopLastmileProbeTest(); } catch { /* probe may not be running */ }
          if (goodLink) engine.setVideoEncoderConfiguration(videoEncoderConfig(true));
        }
        engine.joinChannel(creds.token, creds.channel_name, creds.uid, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          publishCameraTrack: !isAudio,
          autoSubscribeAudio: true,
          autoSubscribeVideo: !isAudio,
        });
      };

      const eventHandler: IRtcEngineEventHandler = {
        onLastmileQuality: (quality) => {
          // Fires ~2s into the probe — the SDK's own rating of the link.
          joinNow(quality <= QualityType.QualityGood);
        },
        onLastmileProbeResult: (result) => {
          // Full stats — fallback if the quality rating never arrived.
          // Missing/unavailable measurements count as a weak link.
          const up = result.uplinkReport?.availableBandwidth ?? 0;
          const down = result.downlinkReport?.availableBandwidth ?? 0;
          const loss = Math.max(
            result.uplinkReport?.packetLossRate ?? 0,
            result.downlinkReport?.packetLossRate ?? 0,
          );
          joinNow(
            result.state === LastmileProbeResultState.LastmileProbeResultComplete &&
            up >= 700_000 && down >= 700_000 && loss < 5,
          );
        },
        onJoinChannelSuccess: () => {
          setPhase('active');
          timerRef.current = setInterval(() => {
            setElapsed((s) => s + 1);
            const dl = deadlineMsRef.current;
            if (dl != null) {
              const rem = Math.max(0, Math.ceil((dl - Date.now()) / 1000));
              setRemaining(rem);
              // Deadline reached — exit gracefully. Agora would drop us at
              // token expiry anyway; ending here keeps the UX clean.
              if (rem <= 0) finishAndExit('time_limit');
            }
          }, 1000);
          // setDefaultAudioRouteToSpeakerphone (called at init) only sets the
          // *default* route. On iOS the system may override it when the channel
          // is established. Calling setEnableSpeakerphone here forces the
          // current route to match what was intended for this call type.
          engine.setEnableSpeakerphone(!isAudio);
        },
        onUserJoined: (_conn, uid) => {
          setRemoteUid(uid);
          setIsRemoteVideoOff(false);
          setIsRemoteAudioMuted(false);
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
        onRemoteAudioStateChanged: (_conn, _uid, state, reason) => {
          if (reason === RemoteAudioStateReason.RemoteAudioReasonRemoteMuted ||
              state === RemoteAudioState.RemoteAudioStateStopped) {
            setIsRemoteAudioMuted(true);
          } else if (reason === RemoteAudioStateReason.RemoteAudioReasonRemoteUnmuted ||
                     state === RemoteAudioState.RemoteAudioStateDecoding) {
            setIsRemoteAudioMuted(false);
          }
        },
        onNetworkQuality: (_conn, uid, txQuality, rxQuality) => {
          // uid 0 is the local user's link report — remote reports are
          // skipped since rxQuality on our side already reflects them.
          if (uid !== 0) return;
          const weak =
            rxQuality >= QualityType.QualityPoor || txQuality >= QualityType.QualityBad;
          setWeakNetwork(weak);
        },
        onRemoteSubscribeFallbackToAudioOnly: (_uid, isFallbackOrRecover) => {
          // Downlink couldn't sustain remote video — SDK switched this
          // subscription to audio-only. The overlay already covers the
          // missing video; the weak-network pill explains why.
          setIsRemoteVideoOff(isFallbackOrRecover);
          if (isFallbackOrRecover) setWeakNetwork(true);
        },
        onLocalPublishFallbackToAudioOnly: (isFallbackOrRecover) => {
          // Our uplink collapsed — remote is receiving audio only.
          if (isFallbackOrRecover) setWeakNetwork(true);
        },
        onUserOffline: (_conn, _uid, reason) => {
          setRemoteUid(null);
          // Only end the call when the remote user deliberately quit.
          // UserOfflineDropped = temporary network loss — wait for them to
          // rejoin via onUserJoined instead of tearing down immediately.
          if (reason === UserOfflineReasonType.UserOfflineDropped) return;
          const pastDeadline =
            deadlineMsRef.current != null && Date.now() >= deadlineMsRef.current;
          finishAndExit(pastDeadline ? 'time_limit' : undefined);
        },
        onTokenPrivilegeWillExpire: async () => {
          // Refresh token before it expires — non-fatal if it fails, EXCEPT a
          // 409 CALL_DURATION_EXCEEDED which IS the end-of-call signal: the
          // deadline passed and the backend refuses to mint further tokens.
          if (!requestId) return;
          try {
            const newCreds = await joinVideoCall(requestId);
            // The call may have ended during the await — renewToken on a
            // released engine is a native call into dead memory.
            if (engineRef.current === engine && !hasEnded.current) {
              engine.renewToken(newCreds.token);
            }
          } catch (e: any) {
            const raw = e?.response?.data?.error;
            const code = typeof raw === 'string' ? raw : raw?.code;
            if (e?.response?.status === 409 && String(code).toUpperCase().includes('DURATION')) {
              finishAndExit('time_limit');
            }
          }
        },
        onError: (err) => {
          if (__DEV__) console.warn('[Agora] error', err);
          Sentry.captureException(new Error(`Agora RTC error: ${err}`));
        },
      };
      agoraHandlerRef.current = eventHandler;
      engine.registerEventHandler(eventHandler);

      if (isAudio) {
        joinNow(false);
      } else {
        // Probe the real Agora path (~2s). The timeout keeps the call from
        // stalling if the probe never reports (blocked UDP, captive portal…).
        engine.startLastmileProbeTest({
          probeUplink: true,
          probeDownlink: true,
          expectedUplinkBitrate: 800_000,
          expectedDownlinkBitrate: 800_000,
        });
        probeTimer = setTimeout(() => joinNow(false), 4000);
      }
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

  // ── Permissions denied (Android) ────────────────────────────────────────

  if (phase === 'error' && errorMsg === 'permissions_denied') {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.errorState}>
          <View style={[styles.errorIcon, { backgroundColor: colors.danger + '25' }]}>
            <Ionicons name="mic-off-outline" size={40} color={colors.danger} />
          </View>
          <Text style={styles.errorTitle}>Permissions Required</Text>
          <Text style={styles.errorSub}>
            {isAudio ? 'Microphone access denied' : 'Camera & microphone access denied'}
          </Text>
          <Text style={styles.errorBody}>
            {isAudio
              ? 'To join an audio call, please allow microphone access in your device settings.'
              : 'To join a video call, please allow camera and microphone access in your device settings.'}
          </Text>
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
            onPress={() => Linking.openSettings()}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaBtnText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelLink} onPress={() => router.back()}>
            <Text style={styles.cancelLinkText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
            {remoteConnected && isRemoteAudioMuted && (
              <View style={styles.remoteMuteChip}>
                <Ionicons name="mic-off" size={12} color="#fff" />
                <Text style={styles.remoteMuteChipText}>Muted</Text>
              </View>
            )}
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
            <RtcVideoView
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
            {!isRemoteVideoOff && isRemoteAudioMuted && (
              <View style={styles.remoteMuteOverlay}>
                <Ionicons name="mic-off" size={13} color="#fff" />
                <Text style={styles.remoteMuteChipText}>Muted</Text>
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
          <RtcVideoView
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
        {/* Timer — counts down to the call deadline once it's known
            (green → amber under a minute → red under ten seconds); falls
            back to elapsed time until the deadline arrives. */}
        {(() => {
          const countdown = remaining != null;
          const timerColor = countdown
            ? remaining! <= 10 ? colors.danger : remaining! <= 60 ? colors.warning : colors.success
            : remoteConnected ? colors.success : colors.warning;
          const pct = countdown && capSeconds > 0
            ? Math.min(100, Math.max(0, (remaining! / capSeconds) * 100))
            : null;
          return (
            <View style={styles.timerWrap}>
              <View style={[styles.timerPill, countdown && { borderWidth: 1, borderColor: timerColor + '66' }]}>
                <Ionicons
                  name={countdown ? 'time-outline' : 'ellipse'}
                  size={countdown ? 13 : 8}
                  color={timerColor}
                />
                <Text style={[styles.timerText, countdown && { color: timerColor }]}>
                  {fmtElapsed(remaining ?? elapsed)}
                </Text>
                {countdown && (
                  <Text style={[styles.timerUnit, { color: timerColor }]}>left</Text>
                )}
              </View>
              {pct != null && (
                <View style={styles.countdownTrack}>
                  <View style={[styles.countdownFill, { width: `${pct}%`, backgroundColor: timerColor }]} />
                </View>
              )}
            </View>
          );
        })()}

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

      {/* Weak-network banner — Agora reports poor link quality or the
          stream fell back to audio-only. Shared across call modes. */}
      {weakNetwork && (
        <View style={[styles.weakNetPill, { top: insets.top + 56 }]} pointerEvents="none">
          <Ionicons name="cellular-outline" size={12} color={colors.warning} />
          <Text style={styles.weakNetText}>Weak connection</Text>
        </View>
      )}

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
  weakNetPill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 30,
  },
  weakNetText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

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
  // Small mute badge shown in video feed corner when remote is audio-muted
  remoteMuteOverlay: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  // Used in both audio call status row and video feed mute badge
  remoteMuteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  remoteMuteChipText: { color: '#fff', fontSize: 11, fontWeight: '600' },

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
  timerWrap: { alignItems: 'center', gap: 7 },
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
  timerUnit: { fontSize: 11, fontWeight: '600', opacity: 0.9 },
  countdownTrack: {
    width: 150,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  countdownFill: { height: 3, borderRadius: 2 },
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
