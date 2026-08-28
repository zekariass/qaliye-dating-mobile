/**
 * Safe wrapper for expo-audio.
 *
 * expo-audio requires a native development build and is NOT available in
 * Expo Go. When the native module is absent this module exports no-op stubs
 * so the app loads without crashing. Voice recording/playback will silently
 * do nothing until the user runs a dev build.
 *
 * All audio-related files should import from here instead of 'expo-audio'.
 */

 
import type * as ExpoAudio from 'expo-audio';

export type { PermissionResponse } from 'expo-audio';

let _m: typeof ExpoAudio | null = null;
try {
  _m = require('expo-audio') as typeof ExpoAudio;
} catch {
  // 'ExpoAudio' native module not registered — running in Expo Go / no dev build
}

export const isAudioAvailable: boolean = _m !== null;

const noop = () => {};
const noopAsync = async () => {};

const _noopPlayer = {
  play: noop,
  pause: noop,
  seekTo: (_s: number) => {},
  replace: (_src: any) => {},
  remove: noop,
};

const _noopStatus = {
  playing: false,
  isBuffering: false,
  currentTime: 0,
  duration: 0,
  didJustFinish: false,
  isLoaded: false,
  error: null,
};

const _noopRecorder = {
  record: noop,
  stop: async () => ({ uri: null as string | null }),
  prepareToRecordAsync: noopAsync,
  uri: null as string | null,
};

const _noopRecorderState = {
  isRecording: false,
  durationMs: 0,
  currentTime: 0,
};

export const useAudioPlayer: typeof ExpoAudio.useAudioPlayer =
  (_m?.useAudioPlayer ?? ((_src: any) => _noopPlayer as any)) as any;

export const useAudioPlayerStatus: typeof ExpoAudio.useAudioPlayerStatus =
  (_m?.useAudioPlayerStatus ?? ((_p: any) => _noopStatus as any)) as any;

export const useAudioRecorder: typeof ExpoAudio.useAudioRecorder =
  (_m?.useAudioRecorder ?? ((_opts?: any) => _noopRecorder as any)) as any;

export const useAudioRecorderState: typeof ExpoAudio.useAudioRecorderState =
  (_m?.useAudioRecorderState ?? ((_r: any) => _noopRecorderState as any)) as any;

const _noopAudioModule = {
  requestRecordingPermissionsAsync: async () => ({
    granted: false,
    canAskAgain: false,
    status: 'denied' as const,
    expires: 'never' as const,
  }),
  getRecordingPermissionsAsync: async () => ({
    granted: false,
    canAskAgain: false,
    status: 'denied' as const,
    expires: 'never' as const,
  }),
  setAudioModeAsync: noopAsync,
  setIsAudioActiveAsync: noopAsync,
};

export const AudioModule: typeof ExpoAudio.AudioModule =
  (_m?.AudioModule ?? _noopAudioModule) as any;

export const RecordingPresets: typeof ExpoAudio.RecordingPresets =
  (_m?.RecordingPresets ?? {}) as any;

export const setAudioModeAsync: typeof ExpoAudio.setAudioModeAsync =
  (_m?.setAudioModeAsync ?? noopAsync) as any;
