import { useAudioPlayer, useAudioPlayerStatus } from '@/utils/expoAudio';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getSupportAttachmentDownloadUrl } from '@/api/support/supportApi';
import type { SupportAttachment } from '@/types/support';
import { isSignedUrlNearExpiry } from '@/utils/signedUrlUtils';

export type VoicePlayerDownloadUrlFetcher = (attachmentId: string) => Promise<{ download_url: string }>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VoicePlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface VoicePlayerError {
  code:
    | 'SIGNED_URL_MISSING'
    | 'SIGNED_URL_EXPIRED'
    | 'SIGNED_URL_REFRESH_FAILED'
    | 'PLAYBACK_FAILED';
  message: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVoicePlayer(
  attachment: SupportAttachment,
  isActive: boolean,
  onStopAllOthers?: (currentAttachmentId: string) => void,
  downloadUrlFetcher?: VoicePlayerDownloadUrlFetcher,
) {
  const [state, setState] = useState<VoicePlayerState>('idle');
  const [error, setError] = useState<VoicePlayerError | null>(null);

  const currentUrlRef = useRef<string | null>(null);
  const urlRefreshAttemptedRef = useRef(false);

  const initialUrl =
    attachment.signed_url
      ? attachment.signed_url
      : attachment.download_url &&
          attachment.download_url_expires_at &&
          !isSignedUrlNearExpiry(attachment.download_url_expires_at)
        ? attachment.download_url
        : null;

  const player = useAudioPlayer(initialUrl);
  const playerStatus = useAudioPlayerStatus(player);

  const refreshSignedUrl = useCallback(
    async (): Promise<string | null> => {
      try {
        const fetcher = downloadUrlFetcher ?? getSupportAttachmentDownloadUrl;
        const dto = await fetcher(attachment.id);
        if (!dto.download_url) {
          setError({
            code: 'SIGNED_URL_MISSING',
            message: 'Audio URL is not available.',
          });
          return null;
        }
        currentUrlRef.current = dto.download_url;
        return dto.download_url;
      } catch {
        setError({
          code: 'SIGNED_URL_REFRESH_FAILED',
          message: 'Could not load audio. Please try again.',
        });
        return null;
      }
    },
    [attachment.id, downloadUrlFetcher],
  );

  const play = useCallback(async () => {
    if (state === 'playing') return;

    onStopAllOthers?.(attachment.id);

    setError(null);
    setState('loading');

    let url = currentUrlRef.current;

    const needsRefresh =
      !url ||
      (attachment.download_url_expires_at &&
        isSignedUrlNearExpiry(attachment.download_url_expires_at));

    if (needsRefresh && !urlRefreshAttemptedRef.current) {
      urlRefreshAttemptedRef.current = true;
      url = await refreshSignedUrl();
      if (!url) {
        setState('error');
        return;
      }
      player.replace(url);
    }

    if (!url) {
      if (!urlRefreshAttemptedRef.current) {
        urlRefreshAttemptedRef.current = true;
        url = await refreshSignedUrl();
      }
      if (!url) {
        setState('error');
        return;
      }
      player.replace(url);
    }

    try {
      player.play();
      setState('playing');
    } catch {
      if (!urlRefreshAttemptedRef.current) {
        urlRefreshAttemptedRef.current = true;
        const freshUrl = await refreshSignedUrl();
        if (freshUrl) {
          player.replace(freshUrl);
          try {
            player.play();
            setState('playing');
            return;
          } catch {
            // Fall through to error
          }
        }
      }
      setError({
        code: 'PLAYBACK_FAILED',
        message: 'Could not play this voice message.',
      });
      setState('error');
    }
  }, [state, attachment.id, attachment.download_url_expires_at, player, refreshSignedUrl, onStopAllOthers]);

  const pause = useCallback(() => {
    try {
      player.pause();
      setState('paused');
    } catch {
      // Swallow
    }
  }, [player]);

  const resume = useCallback(() => {
    if (state !== 'paused') return;
    onStopAllOthers?.(attachment.id);
    try {
      player.play();
      setState('playing');
    } catch {
      setError({
        code: 'PLAYBACK_FAILED',
        message: 'Could not resume playback.',
      });
      setState('error');
    }
  }, [state, player, onStopAllOthers]);

  const seekTo = useCallback(
    (seconds: number) => {
      try {
        player.seekTo(seconds);
      } catch {
        // Swallow
      }
    },
    [player],
  );

  const stop = useCallback(() => {
    try {
      player.pause();
      player.seekTo(0);
    } catch {
      // Swallow
    }
    setState('idle');
  }, [player]);

  useEffect(() => {
    currentUrlRef.current = initialUrl;
    urlRefreshAttemptedRef.current = false;
    setState('idle');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment.id]);

  useEffect(() => {
    if (
      state === 'playing' &&
      !playerStatus.playing &&
      !playerStatus.isBuffering &&
      playerStatus.currentTime >= playerStatus.duration &&
      playerStatus.duration > 0
    ) {
      stop();
    }
  }, [playerStatus.playing, playerStatus.isBuffering, playerStatus.currentTime, playerStatus.duration, state, stop]);

  useEffect(() => {
    if (!isActive) {
      try {
        player.pause();
      } catch {
        // Swallow
      }
      setState('idle');
    }
  }, [isActive, player]);

  return {
    state,
    error,
    isPlaying: state === 'playing',
    isPaused: state === 'paused',
    isLoading: state === 'loading',
    currentTime: playerStatus.currentTime || 0,
    duration: playerStatus.duration || (attachment.duration_ms ? attachment.duration_ms / 1000 : 0),
    play,
    pause,
    resume,
    seekTo,
    stop,
  };
}
