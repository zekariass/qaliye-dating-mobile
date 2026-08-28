import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';

import type { OtherUserProfileDto, ProfileMeDto, ProfilePhotosResponse } from '@/types/profile';
import { isSignedUrlNearExpiry } from '@/utils/signedUrlUtils';

import { PROFILE_ME_QUERY_KEY } from './useCurrentProfile';
import { PROFILE_PHOTOS_QUERY_KEY } from './useProfilePhotos';

// ---------------------------------------------------------------------------
// Hook — invalidates profile queries whose signed photo URLs have expired or
// are near expiry whenever the app returns to the foreground.
//
// This is the safety net for sessions that stay backgrounded longer than the
// Supabase signed URL TTL (e.g. 2 hours). Dynamic staleTime in the query hooks
// handles the steady-state case; this hook handles cold returns from background.
// ---------------------------------------------------------------------------

export function useSignedUrlRefresh() {
  const queryClient = useQueryClient();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prev = appState.current;
      appState.current = nextState;

      if (!prev.match(/inactive|background/) || nextState !== 'active') return;

      // ── Own profile photos ────────────────────────────────────────────────
      const me = queryClient.getQueryData<ProfileMeDto>(PROFILE_ME_QUERY_KEY);
      if (me?.photos?.some((p) => isSignedUrlNearExpiry(p.expires_at))) {
        queryClient.invalidateQueries({ queryKey: PROFILE_ME_QUERY_KEY });
      }

      const ownPhotos =
        queryClient.getQueryData<ProfilePhotosResponse>(PROFILE_PHOTOS_QUERY_KEY);
      if (ownPhotos?.photos?.some((p) => isSignedUrlNearExpiry(p.expires_at))) {
        queryClient.invalidateQueries({ queryKey: PROFILE_PHOTOS_QUERY_KEY });
      }

      // ── Other users' profile photos ───────────────────────────────────────
      queryClient.invalidateQueries({
        predicate: (query) => {
          if (query.queryKey[0] !== 'profile' || query.queryKey[1] !== 'user') return false;
          const data = query.state.data as OtherUserProfileDto | undefined;
          return data?.photos?.some((p) => isSignedUrlNearExpiry(p.expires_at)) ?? false;
        },
      });

      // ── Discovery profiles ────────────────────────────────────────────────
      // Invalidate discovery queue when any photo in the first cached page is
      // near expiry. Users returning from a long background session need fresh URLs.
      queryClient.invalidateQueries({
        predicate: (query) => {
          if (query.queryKey[0] !== 'discovery' || query.queryKey[1] !== 'profiles') {
            return false;
          }
          const data = query.state.data as
            | { pages: { profiles: { photos: { expiresAt?: string; expires_at?: string }[] }[] }[] }
            | undefined;
          const firstPage = data?.pages?.[0];
          if (!firstPage?.profiles?.length) return false;
          return firstPage.profiles.some((profile) =>
            profile.photos?.some((ph) => {
              const expiry = ph.expiresAt ?? ph.expires_at;
              return expiry ? isSignedUrlNearExpiry(expiry) : false;
            }),
          );
        },
      });
    });

    return () => subscription.remove();
  }, [queryClient]);
}
