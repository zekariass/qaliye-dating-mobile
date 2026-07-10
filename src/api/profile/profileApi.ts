import type { GpsLocationPayload, ManualLocationPayload } from '@/types/api';
import type {
    BatchPhotoRegistrationRequest,
    CulturalDetailsUpdateRequest,
    OtherUserProfileDto,
    PhotoRegistrationRequest,
    PhotoReorderRequest,
    ProfileDiscoveryPreferencesDto,
    ProfileLocationDto,
    ProfileMeDto,
    ProfilePhotoDto,
    ProfilePhotosResponse,
    ProfilePreferencesUpdateRequest,
    ProfileUpdateRequest,
} from '@/types/profile';

import { apiClient } from '../apiClient';

// ─── Profile ───────────────────────────────────────────────────────────────────

export async function fetchProfileMe(): Promise<ProfileMeDto> {
  const res = await apiClient.get<ProfileMeDto>('/api/v1/profile/me');
  return res.data;
}

export async function updateProfileMe(payload: ProfileUpdateRequest): Promise<ProfileMeDto> {
  const res = await apiClient.put<ProfileMeDto>('/api/v1/profile/me', payload);
  return res.data;
}

export async function updateProfileCulturalDetails(
  payload: CulturalDetailsUpdateRequest,
): Promise<ProfileMeDto> {
  const res = await apiClient.put<ProfileMeDto>('/api/v1/profile/me/cultural-details', payload);
  return res.data;
}

export async function fetchOtherUserProfile(userId: string): Promise<OtherUserProfileDto> {
  const res = await apiClient.get<OtherUserProfileDto>(`/api/v1/profile/${userId}`);
  return res.data;
}

// ─── Photos ────────────────────────────────────────────────────────────────────

export async function fetchProfilePhotos(): Promise<ProfilePhotosResponse> {
  const res = await apiClient.get<ProfilePhotosResponse>('/api/v1/profile/me/photos');
  return res.data;
}

export async function registerProfilePhoto(
  payload: PhotoRegistrationRequest,
): Promise<ProfilePhotoDto> {
  const res = await apiClient.post<ProfilePhotoDto>('/api/v1/profile/me/photos', payload);
  return res.data;
}

export async function batchRegisterProfilePhotos(
  payload: BatchPhotoRegistrationRequest,
): Promise<ProfilePhotosResponse> {
  const res = await apiClient.post<ProfilePhotosResponse>('/api/v1/profile/me/photos/batch', payload);
  return res.data;
}

export async function reorderProfilePhotos(
  payload: PhotoReorderRequest,
): Promise<ProfilePhotosResponse> {
  const res = await apiClient.put<ProfilePhotosResponse>('/api/v1/profile/me/photos', payload);
  return res.data;
}

export async function deleteProfilePhoto(photoId: string): Promise<ProfilePhotosResponse> {
  const res = await apiClient.delete<ProfilePhotosResponse>(
    `/api/v1/profile/me/photos/${photoId}`,
  );
  return res.data;
}

// ─── Preferences ───────────────────────────────────────────────────────────────

export async function fetchProfilePreferences(): Promise<ProfileDiscoveryPreferencesDto> {
  const res = await apiClient.get<ProfileDiscoveryPreferencesDto>(
    '/api/v1/profile/me/preferences',
  );
  return res.data;
}

export async function updateProfilePreferences(
  payload: ProfilePreferencesUpdateRequest,
): Promise<ProfileDiscoveryPreferencesDto> {
  const res = await apiClient.put<ProfileDiscoveryPreferencesDto>(
    '/api/v1/profile/me/preferences',
    payload,
  );
  return res.data;
}

// ─── Location ──────────────────────────────────────────────────────────────────

export async function fetchProfileLocation(): Promise<ProfileLocationDto> {
  const res = await apiClient.get<ProfileLocationDto>('/api/v1/profile/location');
  return res.data;
}

export async function updateProfileLocation(
  payload: GpsLocationPayload | ManualLocationPayload,
): Promise<ProfileLocationDto> {
  const res = await apiClient.put<ProfileLocationDto>('/api/v1/profile/location', payload);
  return res.data;
}
