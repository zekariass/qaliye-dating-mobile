import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/api/notifications/notificationsApi';
import type { NotificationPreferences, NotificationPreferencesPatch } from '@/types/notifications';

export const NOTIFICATION_PREFS_KEY = ['notifications', 'preferences'] as const;

export function useNotificationPreferences() {
  return useQuery({
    queryKey: NOTIFICATION_PREFS_KEY,
    queryFn: getNotificationPreferences,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: NotificationPreferencesPatch) =>
      updateNotificationPreferences(patch),

    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATION_PREFS_KEY });
      const previous = queryClient.getQueryData<NotificationPreferences>(NOTIFICATION_PREFS_KEY);
      if (previous) {
        queryClient.setQueryData<NotificationPreferences>(NOTIFICATION_PREFS_KEY, {
          ...previous,
          ...patch,
        });
      }
      return { previous };
    },

    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(NOTIFICATION_PREFS_KEY, context.previous);
      }
    },

    onSuccess: (data) => {
      queryClient.setQueryData(NOTIFICATION_PREFS_KEY, data);
    },
  });
}
