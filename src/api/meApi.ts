import { MeResponse } from '@/types/api';

import { apiClient } from './apiClient';

export async function fetchMe(): Promise<MeResponse> {
  const response = await apiClient.get<MeResponse>('/api/v1/me');
  return response.data;
}
