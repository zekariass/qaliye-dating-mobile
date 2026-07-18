import type { PermissionResponse } from '@/utils/expoAudio';
import {
    AudioModule,
    RecordingPresets,
    isAudioAvailable,
    setAudioModeAsync,
    useAudioRecorder,
    useAudioRecorderState,
} from '@/utils/expoAudio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, Linking, Platform } from 'react-native';

import {
    SUPPORT_VOICE_MAX_DURATION_SECONDS,
    SUPPORT_VOICE_MAX_FILE_SIZE_BYTES,
} from '@/types/support';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VoiceRecorderStatus =
  | 'idle'
  | 'requesting-permission'
  | 'recording'
  | 'stopped'
  | 'error';

export interface VoiceRecordingResult {
  uri: string;
  durationMs: number;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
}

export interface VoiceRecorderError {
  code:
    | 'PERMISSION_DENIED'
    | 'PERMISSION_PERMANENTLY_DENIED'
    | 'RECORDING_UNAVAILABLE'
    | 'RECORDING_FAILED'
    | 'EMPTY_RECORDING'
    | 'RECORDING_TOO_LONG'
    | 'FILE_TOO_LARGE'
    | 'UNSUPPORTED_FORMAT';
  message: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const VOICE_FILE_NAME = 'support-voice.m4a';
const VOICE_MIME_TYPE = 'audio/m4a';

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const [status, setStatus] = useState<VoiceRecorderStatus>('idle');
  const [error, setError] = useState<VoiceRecorderError | null>(null);
  const [recording, setRecording] = useState<VoiceRecordingResult | null>(null);
  const [permissionResponse, setPermissionResponse] =
    useState<PermissionResponse | null>(null);

  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateSubscriptionRef = useRef<{ remove: () => void } | null>(null);

  // ── Permission ──────────────────────────────────────────────────────────

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isAudioAvailable) {
      const message =
        Platform.OS === 'web'
          ? 'Voice recording is not supported on the web.'
          : 'Voice recording requires the Qaliye development build (expo run) or the production app. Please install the latest build and try again.';

      const unavailableError: VoiceRecorderError = {
        code: 'RECORDING_UNAVAILABLE',
        message,
      };

      setError(unavailableError);
      setStatus('error');
      Alert.alert('Voice recording unavailable', message);
      return false;
    }

    setStatus('requesting-permission');
    setError(null);

    try {
      const response = await AudioModule.requestRecordingPermissionsAsync();
      setPermissionResponse(response);

      if (!response.granted) {
        const canAskAgain =
          (response as any).canAskAgain !== false;

        setStatus('idle');

        Alert.alert(
          'Microphone Permission',
          canAskAgain
            ? 'This app needs microphone access to record voice messages. Please allow microphone permission.'
            : 'Microphone access was denied. Please enable it in Settings to record voice messages.',
          [
            ...(canAskAgain
              ? [
                  {
                    text: 'Allow',
                    onPress: () => {
                      requestPermission().catch(() => {});
                    },
                  },
                ]
              : []),
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings().catch(() => {});
              },
            },
            { text: 'Cancel', style: 'cancel' as const },
          ],
        );
        return false;
      }

      setStatus('idle');
      return true;
    } catch {
      setError({
        code: 'RECORDING_UNAVAILABLE',
        message: 'Recording is not available on this device.',
      });
      setStatus('error');
      return false;
    }
  }, []);

  // ── Cleanup helpers ─────────────────────────────────────────────────────

  const clearMaxDurationTimer = useCallback(() => {
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
  }, []);

  const cleanupRecorder = useCallback(async () => {
    clearMaxDurationTimer();
    try {
      if (recorderState.isRecording) {
        await recorder.stop();
      }
    } catch {
      // Swallow — already stopped or error
    }
  }, [recorder, recorderState.isRecording, clearMaxDurationTimer]);

  // ── Start recording ─────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setError(null);
    setRecording(null);

    const granted = await requestPermission();
    if (!granted) return;

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus('recording');

      // Auto-stop at max duration
      clearMaxDurationTimer();
      maxDurationTimerRef.current = setTimeout(() => {
        stopRecording().catch(() => {
          setError({
            code: 'RECORDING_TOO_LONG',
            message: `Recording limit is ${SUPPORT_VOICE_MAX_DURATION_SECONDS} seconds.`,
          });
        });
      }, SUPPORT_VOICE_MAX_DURATION_SECONDS * 1000);
    } catch {
      setError({
        code: 'RECORDING_FAILED',
        message: 'Could not start recording. Please try again.',
      });
      setStatus('error');
      await cleanupRecorder();
    }
  }, [requestPermission, recorder, clearMaxDurationTimer, cleanupRecorder]);

  // ── Stop recording ──────────────────────────────────────────────────────

  const stopRecording = useCallback(async (): Promise<VoiceRecordingResult | null> => {
    clearMaxDurationTimer();

    try {
      if (!recorderState.isRecording) {
        setStatus('idle');
        return null;
      }

      await recorder.stop();
      const uri = recorder.uri;

      if (!uri) {
        setError({
          code: 'EMPTY_RECORDING',
          message: 'Recording produced no audio data.',
        });
        setStatus('error');
        return null;
      }

      const durationMs = Math.round(
        recorderState.durationMillis > 0 ? recorderState.durationMillis : 0,
      );

      if (durationMs < 100) {
        setError({
          code: 'EMPTY_RECORDING',
          message: 'Recording is too short.',
        });
        setStatus('error');
        return null;
      }

      const result: VoiceRecordingResult = {
        uri,
        durationMs,
        fileName: VOICE_FILE_NAME,
        mimeType: VOICE_MIME_TYPE,
        fileSizeBytes: 0,
      };

      setRecording(result);
      setStatus('stopped');
      return result;
    } catch {
      setError({
        code: 'RECORDING_FAILED',
        message: 'Could not stop recording.',
      });
      setStatus('error');
      return null;
    }
  }, [recorder, recorderState.isRecording, recorderState.durationMillis, clearMaxDurationTimer]);

  // ── Cancel recording ────────────────────────────────────────────────────

  const cancelRecording = useCallback(async () => {
    clearMaxDurationTimer();
    try {
      if (recorderState.isRecording) {
        await recorder.stop();
      }
    } catch {
      // Swallow
    }
    setRecording(null);
    setError(null);
    setStatus('idle');
  }, [recorder, recorderState.isRecording, clearMaxDurationTimer]);

  // ── Delete recording (after stop, before send) ──────────────────────────

  const deleteRecording = useCallback(() => {
    setRecording(null);
    setError(null);
    setStatus('idle');
  }, []);

  // ── Validate file size ──────────────────────────────────────────────────

  const validateRecording = useCallback(
    (fileSizeBytes: number): boolean => {
      if (fileSizeBytes > SUPPORT_VOICE_MAX_FILE_SIZE_BYTES) {
        setError({
          code: 'FILE_TOO_LARGE',
          message: `Voice file is too large. Maximum size is ${Math.round(SUPPORT_VOICE_MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB.`,
        });
        setStatus('error');
        return false;
      }
      return true;
    },
    [],
  );

  // ── App lifecycle: stop recording when app goes background ──────────────

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState !== 'active' && recorderState.isRecording) {
        stopRecording().catch(() => {
          // Swallow
        });
      }
    };

    appStateSubscriptionRef.current = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      appStateSubscriptionRef.current?.remove();
      appStateSubscriptionRef.current = null;
    };
  }, [recorderState.isRecording, stopRecording]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearMaxDurationTimer();
      if (recorderState.isRecording) {
        recorder.stop().catch(() => {
          // Swallow
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    error,
    recording,
    permissionResponse,
    isRecording: status === 'recording',
    durationMs: Math.round(recorderState.durationMillis || 0),
    startRecording,
    stopRecording,
    cancelRecording,
    deleteRecording,
    validateRecording,
    cleanupRecorder,
  };
}
