import { apiClient } from '@/api/apiClient';

export async function unmatch(matchId: string): Promise<void> {
  await apiClient.delete(`/api/v1/matches/${matchId}`);
}
