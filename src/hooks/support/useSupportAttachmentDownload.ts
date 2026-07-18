import { useMutation } from '@tanstack/react-query';
import { Linking } from 'react-native';

import { getSupportAttachmentDownloadUrl } from '@/api/support/supportApi';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Requests a short-lived signed download URL for a support attachment, then
 * opens it with the device's default handler.
 *
 * Signed URLs expire in ~300s. They must NOT be cached permanently or logged.
 */
export function useSupportAttachmentDownload() {
  const mutation = useMutation({
    mutationFn: getSupportAttachmentDownloadUrl,
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
