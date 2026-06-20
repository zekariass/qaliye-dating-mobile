import {
    BasicProfilePayload,
    GpsLocationPayload,
    ManualLocationPayload,
    ProfileLocationResponse,
    ProfileMeResponse,
} from '@/types/api';

import { apiClient } from './apiClient';

export async function fetchProfileMe(): Promise<ProfileMeResponse> {
  const res = await apiClient.get<ProfileMeResponse>('/api/v1/profile/me');
  return res.data;
}

export async function updateBasicProfile(payload: BasicProfilePayload): Promise<void> {
  await apiClient.put('/api/v1/profile/me', payload);
}

export async function fetchProfileLocation(): Promise<ProfileLocationResponse> {
  const res = await apiClient.get<ProfileLocationResponse>('/api/v1/profile/location');
  return res.data;
}

export async function updateLocation(
  payload: GpsLocationPayload | ManualLocationPayload,
): Promise<void> {
  await apiClient.put('/api/v1/profile/location', payload);
}
