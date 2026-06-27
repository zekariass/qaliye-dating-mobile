import { useMutation } from '@tanstack/react-query';
import { useRef } from 'react';

import { registerDevice } from '@/api/notifications/notificationsApi';
import type { DeviceRegistrationRequest } from '@/types/notifications';

type RegistrationKey = string;

function makeKey(req: DeviceRegistrationRequest): RegistrationKey {
  return `${req.installationId}::${req.expoPushToken}::${req.platform}`;
}

export function useRegisterDevice() {
  const lastRegisteredKey = useRef<RegistrationKey | null>(null);

  const mutation = useMutation({
    mutationFn: async (req: DeviceRegistrationRequest) => {
      if (!req.expoPushToken || !req.installationId || !req.platform) {
        throw new Error('Invalid device registration request');
      }

      const key = makeKey(req);
      if (lastRegisteredKey.current === key) {
        return null;
      }
      const result = await registerDevice(req);
      lastRegisteredKey.current = key;
      return result;
    },
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 400 || error?.response?.status === 401) {
        return false;
      }
      return failureCount < 2;
    },
  });

  return mutation;
}
