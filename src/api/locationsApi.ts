import { LocationSearchResponse } from '@/types/api';

import { apiClient } from './apiClient';

export async function searchLocations(q: string): Promise<LocationSearchResponse> {
  const response = await apiClient.get<LocationSearchResponse>('/api/v1/locations/search', {
    params: { q },
  });
  return response.data;
}
