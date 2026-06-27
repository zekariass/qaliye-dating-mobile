import { useMutation } from '@tanstack/react-query';

import { deactivateDevice } from '@/api/notifications/notificationsApi';

export function useDeactivateDevice() {
  return useMutation({
    mutationFn: (installationId: string) => deactivateDevice(installationId),
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      if (error?.response?.status === 401) return false;
      return failureCount < 1;
    },
  });
}
