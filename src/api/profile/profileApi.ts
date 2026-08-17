import type { GpsLocationPayload, ManualLocationPayload } from '@/types/api';
import type { IdentityVerificationResponse, ManualReviewStatus } from '@/types/billing';
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

// ─── Identity verification ─────────────────────────────────────────────────────

function normalizeIdentityVerificationResponse(
  raw: Record<string, unknown>,
): IdentityVerificationResponse {
  return {
    verification_status: (raw.verification_status ?? raw.verificationStatus ?? 'FAILED') as IdentityVerificationResponse['verification_status'],
    error_code: (raw.error_code ?? raw.errorCode ?? undefined) as string | undefined,
    message: (raw.message ?? '') as string,
  };
}

/**
 * Automated identity verification via selfie-to-profile-photo face comparison.
 * Sends a multipart/form-data request with the selfie image file.
 *
 * `selfieUri` should be a local file URI (e.g. from expo-image-picker).
 */
export async function submitIdentityVerification(
  selfieUri: string,
  fileName: string = 'selfie.jpg',
  mimeType: string = 'image/jpeg',
): Promise<IdentityVerificationResponse> {
  const formData = new FormData();
  formData.append('selfie', {
    uri: selfieUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const res = await apiClient.post<unknown>(
    '/api/v1/profile/identity-verification',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return normalizeIdentityVerificationResponse(res.data as Record<string, unknown>);
}

/**
 * Manual verification submission for admin review (alternative to automated selfie match).
 * The selfie must already be uploaded to Supabase storage; only the storage path is sent.
 */
export async function submitManualVerification(
  storagePath: string,
): Promise<{ verification_id: string; status: 'PENDING' }> {
  const res = await apiClient.post<unknown>('/api/v1/verification/submit', {
    storage_path: storagePath,
  });
  const raw = res.data as Record<string, unknown>;
  return {
    verification_id: (raw.verification_id ?? raw.verificationId ?? '') as string,
    status: 'PENDING',
  };
}

/**
 * Request manual review of a failed identity verification.
 * Sends the selfie image as multipart/form-data for admin review.
 * Returns MANUAL_REVIEW status on success.
 */
export async function requestManualReview(
  selfieUri: string,
  fileName: string = 'selfie.jpg',
  mimeType: string = 'image/jpeg',
): Promise<IdentityVerificationResponse> {
  const formData = new FormData();
  formData.append('selfie', {
    uri: selfieUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const res = await apiClient.post<unknown>(
    '/api/v1/profile/identity-verification/manual-review',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return normalizeIdentityVerificationResponse(res.data as Record<string, unknown>);
}

/**
 * Check the status of a manual identity verification review.
 * Returns the current review state (PENDING, APPROVED, REJECTED) or NOT_STARTED if no review was submitted.
 */
export async function getManualReviewStatus(): Promise<ManualReviewStatus> {
  const res = await apiClient.get<unknown>(
    '/api/v1/profile/identity-verification/manual-review/status',
  );
  return res.data as ManualReviewStatus;
}
