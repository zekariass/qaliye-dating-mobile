import { useCallback, useState } from 'react';

import { updateActivityVisibility } from '@/api/activity/activityApi';
import { useActivityStore } from '@/stores/activity-store';

export function useActivityVisibility() {
  const showActivityStatus = useActivityStore((s) => s.showActivityStatus);
  const setShowActivityStatus = useActivityStore((s) => s.setShowActivityStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasError, setHasError] = useState(false);

  const update = useCallback(
    async (newValue: boolean) => {
      const prev = showActivityStatus;
      setShowActivityStatus(newValue); // optimistic
      setIsUpdating(true);
      setHasError(false);
      try {
        const res = await updateActivityVisibility(newValue);
        setShowActivityStatus(res.show_activity_status);
      } catch {
        setShowActivityStatus(prev); // revert on failure
        setHasError(true);
      } finally {
        setIsUpdating(false);
      }
    },
    [showActivityStatus, setShowActivityStatus],
  );

  return { showActivityStatus, update, isUpdating, hasError };
}
