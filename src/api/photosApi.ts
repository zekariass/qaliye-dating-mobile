import { apiClient } from './apiClient';

export interface ProfilePhoto {
  id: string;
  photo_order: number;
  is_primary: boolean;
  moderation_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason: string | null;
  signed_url: string | null;
}

export async function uploadPhoto(
  uri: string,
  fileName: string,
  mimeType: string,
  photoOrder: number,
  isPrimary: boolean,
): Promise<ProfilePhoto> {
  const formData = new FormData();
  formData.append('file', { uri, name: fileName, type: mimeType } as unknown as Blob);
  formData.append('photo_order', String(photoOrder));
  formData.append('is_primary', String(isPrimary));
  const res = await apiClient.post<ProfilePhoto>('/api/v1/profile/photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export function uploadPrimaryPhoto(
  uri: string,
  fileName: string,
  mimeType: string,
): Promise<ProfilePhoto> {
  return uploadPhoto(uri, fileName, mimeType, 0, true);
}

export async function fetchMyPhotos(): Promise<ProfilePhoto[]> {
  const res = await apiClient.get<{ items: ProfilePhoto[] }>('/api/v1/profile/photos/me');
  return res.data.items;
}

export async function deletePhoto(photoId: string): Promise<void> {
  await apiClient.delete(`/api/v1/profile/photos/${photoId}`);
}
