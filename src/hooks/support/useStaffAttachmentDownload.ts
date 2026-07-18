import { useMutation } from '@tanstack/react-query';
import { Linking } from 'react-native';

import { getStaffAttachmentDownloadUrl } from '@/api/support/staffSupportApi';

export function useStaffAttachmentDownload(conversationId: string) {
  const mutation = useMutation({
    mutationFn: (attachmentId: string) => getStaffAttachmentDownloadUrl(conversationId, attachmentId),
    onSuccess: async (data) => {
      if (data.download_url) {
        try {
          const canOpen = await Linking.canOpenURL(data.download_url);
          if (canOpen) {
            await Linking.openURL(data.download_url);
          }
        } catch {
          // Swallow — caller can check isError
        }
      }
    },
  });

  return {
    openAttachment: (attachmentId: string) => mutation.mutate(attachmentId),
    isOpening: mutation.isPending,
    openingAttachmentId: mutation.isPending ? mutation.variables : null,
    isError: mutation.isError,
    reset: mutation.reset,
  };
}
