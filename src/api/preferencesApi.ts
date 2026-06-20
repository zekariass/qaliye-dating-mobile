import { DiscoveryPreferencesPayload, DiscoveryPreferencesResponse } from '@/types/api';

import { apiClient } from './apiClient';

export async function fetchDiscoveryPreferences(): Promise<DiscoveryPreferencesResponse> {
  const res = await apiClient.get<DiscoveryPreferencesResponse>('/api/v1/discovery/preferences');
  return res.data;
}

export async function updateDiscoveryPreferences(
  payload: DiscoveryPreferencesPayload,
): Promise<void> {
  await apiClient.put('/api/v1/discovery/preferences', payload);
}
