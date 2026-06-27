import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteProfilePhoto,
  fetchProfilePhotos,
  registerProfilePhoto,
  reorderProfilePhotos,
} from '@/api/profile/profileApi';
import type {
  PhotoRegistrationRequest,
  PhotoReorderRequest,
  ProfileMeDto,
  ProfilePhotosResponse,
} from '@/types/profile';

import { PROFILE_ME_QUERY_KEY } from './useCurrentProfile';

export const PROFILE_PHOTOS_QUERY_KEY = ['profile', 'photos'] as const;

export function useProfilePhotos() {
  return useQuery<ProfilePhotosResponse, Error>({
    queryKey: PROFILE_PHOTOS_QUERY_KEY,
    queryFn: fetchProfilePhotos,
    staleTime: 1000 * 60 * 5,
  });
}

function invalidateBoth(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: PROFILE_PHOTOS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: PROFILE_ME_QUERY_KEY });
}

export function useRegisterPhoto() {
  const queryClient = useQueryClient();
  return useMutation<ProfilePhotosResponse, Error, PhotoRegistrationRequest>({
    mutationFn: registerProfilePhoto,
    onSuccess: (data) => {
      queryClient.setQueryData<ProfilePhotosResponse>(PROFILE_PHOTOS_QUERY_KEY, data);
      queryClient.setQueryData<ProfileMeDto>(PROFILE_ME_QUERY_KEY, (prev) =>
        prev ? { ...prev, photos: data.photos } : prev,
      );
    },
    onError: () => invalidateBoth(queryClient),
  });
}

export function useReorderPhotos() {
  const queryClient = useQueryClient();
  return useMutation<ProfilePhotosResponse, Error, PhotoReorderRequest>({
    mutationFn: reorderProfilePhotos,
    onSuccess: (data) => {
      queryClient.setQueryData<ProfilePhotosResponse>(PROFILE_PHOTOS_QUERY_KEY, data);
      queryClient.setQueryData<ProfileMeDto>(PROFILE_ME_QUERY_KEY, (prev) =>
        prev ? { ...prev, photos: data.photos } : prev,
      );
    },
    onError: () => invalidateBoth(queryClient),
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();
  return useMutation<ProfilePhotosResponse, Error, string>({
    mutationFn: deleteProfilePhoto,
    onSuccess: (data) => {
      queryClient.setQueryData<ProfilePhotosResponse>(PROFILE_PHOTOS_QUERY_KEY, data);
      queryClient.setQueryData<ProfileMeDto>(PROFILE_ME_QUERY_KEY, (prev) =>
        prev ? { ...prev, photos: data.photos } : prev,
      );
    },
    onError: () => invalidateBoth(queryClient),
  });
}
