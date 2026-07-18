import { useAudioPlayer, useAudioPlayerStatus } from '@/utils/expoAudio';
import { useCallback, useEffect, useRef, useState } from 'react';

import { refreshAttachmentSignedUrl } from '@/api/chat/chatApi';
import type { ChatAttachment } from '@/types/chat';

export type ChatVoicePlayerDownloadUrlFetcher = (
  attachmentId: string,
) => Promise<{ download_url: string | null }>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatVoicePlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface ChatVoicePlayerError {
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

export function useChatVoicePlayer(
  attachment: ChatAttachment,
  isActive: boolean,
  onStopAllOthers?: (currentAttachmentId: string) => void,
  downloadUrlFetcher?: ChatVoicePlayerDownloadUrlFetcher,
) {
  const [state, setState] = useState<ChatVoicePlayerState>('idle');
  const [error, setError] = useState<ChatVoicePlayerError | null>(null);

  const currentUrlRef = useRef<string | null>(null);
  const urlRefreshAttemptedRef = useRef(false);
  const hasFinishedRef = useRef(false);

  const initialUrl = attachment.downloadUrl ?? null;

  const player = useAudioPlayer(initialUrl);
  const playerStatus = useAudioPlayerStatus(player);

  const refreshSignedUrl = useCallback(
    async (): Promise<string | null> => {
      try {
        if (downloadUrlFetcher) {
          const dto = await downloadUrlFetcher(attachment.id);
          if (!dto.download_url) {
            setError({
              code: 'SIGNED_URL_MISSING',
              message: 'Audio URL is not available.',
            });
            return null;
          }
          currentUrlRef.current = dto.download_url;
          return dto.download_url;
        }

        const dto = await refreshAttachmentSignedUrl(attachment.id);
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

    // Rewind if previously finished
    if (hasFinishedRef.current) {
      try {
        player.seekTo(0);
      } catch {
        // Swallow
      }
      hasFinishedRef.current = false;
    }

    let url = currentUrlRef.current;

    const needsRefresh = !url;

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
  }, [state, attachment.id, player, refreshSignedUrl, onStopAllOthers]);

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
    } catch {
      // Swallow
    }
    setState('idle');
  }, [player]);

  // Reset state when attachment changes
  useEffect(() => {
    currentUrlRef.current = initialUrl;
    urlRefreshAttemptedRef.current = false;
    hasFinishedRef.current = false;
    setState('idle');
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment.id]);

  // Detect playback finished — stop, do NOT auto-rewind
  useEffect(() => {
    if (
      state === 'playing' &&
      !playerStatus.playing &&
      !playerStatus.isBuffering &&
      playerStatus.currentTime >= playerStatus.duration &&
      playerStatus.duration > 0
    ) {
      hasFinishedRef.current = true;
      stop();
    }
  }, [playerStatus.playing, playerStatus.isBuffering, playerStatus.currentTime, playerStatus.duration, state, stop]);

  // Pause when not active
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
    duration: playerStatus.duration || (attachment.durationMs ? attachment.durationMs / 1000 : 0),
    play,
    pause,
    resume,
    seekTo,
    stop,
  };
}
