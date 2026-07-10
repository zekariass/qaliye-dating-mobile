import { useMutation } from '@tanstack/react-query';

import { reportUser, ReportUserRequest } from '@/api/safety/safetyApi';

export function useReportUser() {
  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: ReportUserRequest }) =>
      reportUser(userId, body),
  });
}
