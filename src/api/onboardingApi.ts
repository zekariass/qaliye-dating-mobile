import { CompleteOnboardingResponse, OnboardingStatus } from '@/types/api';

import { apiClient } from './apiClient';

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const response = await apiClient.get<OnboardingStatus>('/api/v1/onboarding/status');
  return response.data;
}

export async function completeOnboarding(): Promise<CompleteOnboardingResponse> {
  const response = await apiClient.post<CompleteOnboardingResponse>(
    '/api/v1/onboarding/complete',
  );
  return response.data;
}
