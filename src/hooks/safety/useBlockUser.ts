import { useMutation } from '@tanstack/react-query';

import { blockUser } from '@/api/safety/safetyApi';

export function useBlockUser() {
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      blockUser(userId, reason),
  });
}
