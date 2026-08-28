import type { ApiErrorDetail } from '@/utils/apiError';
import { getModerationMessage, isModerationRejection } from '@/utils/photoModeration';

describe('photoModeration', () => {
  describe('isModerationRejection', () => {
    it('returns true for PHOTO_REJECTED error code', () => {
      const detail: ApiErrorDetail = { code: 'PHOTO_REJECTED', message: 'Photo rejected' };
      expect(isModerationRejection(detail)).toBe(true);
    });

    it('returns true for PHOTO_MODERATION_REJECTED error code', () => {
      const detail: ApiErrorDetail = { code: 'PHOTO_MODERATION_REJECTED', message: 'Rejected' };
      expect(isModerationRejection(detail)).toBe(true);
    });

    it('returns true for CONTENT_MODERATION_REJECTED error code', () => {
      const detail: ApiErrorDetail = { code: 'CONTENT_MODERATION_REJECTED', message: 'Rejected' };
      expect(isModerationRejection(detail)).toBe(true);
    });

    it('returns true when message contains "nudity"', () => {
      const detail: ApiErrorDetail = { code: 'UNKNOWN', message: 'Detected nudity in photo' };
      expect(isModerationRejection(detail)).toBe(true);
    });

    it('returns true when message contains "sexual content"', () => {
      const detail: ApiErrorDetail = { code: 'UNKNOWN', message: 'Sexual content detected' };
      expect(isModerationRejection(detail)).toBe(true);
    });

    it('returns true when message contains "explicit"', () => {
      const detail: ApiErrorDetail = { code: 'UNKNOWN', message: 'Explicit image detected' };
      expect(isModerationRejection(detail)).toBe(true);
    });

    it('returns true when message contains "pornographic"', () => {
      const detail: ApiErrorDetail = { code: 'UNKNOWN', message: 'Pornographic content' };
      expect(isModerationRejection(detail)).toBe(true);
    });

    it('returns true when message contains "suggestive"', () => {
      const detail: ApiErrorDetail = { code: 'UNKNOWN', message: 'Suggestive photo' };
      expect(isModerationRejection(detail)).toBe(true);
    });

    it('is case-insensitive when matching keywords', () => {
      const detail: ApiErrorDetail = { code: 'UNKNOWN', message: 'NUDITY detected' };
      expect(isModerationRejection(detail)).toBe(true);
    });

    it('returns false for network errors', () => {
      const detail: ApiErrorDetail = { code: 'UNKNOWN', message: 'Network request failed' };
      expect(isModerationRejection(detail)).toBe(false);
    });

    it('returns false for server errors', () => {
      const detail: ApiErrorDetail = { code: 'INTERNAL_ERROR', message: 'A server error occurred', status: 500 };
      expect(isModerationRejection(detail)).toBe(false);
    });

    it('returns false for timeout errors', () => {
      const detail: ApiErrorDetail = { code: 'UNKNOWN', message: 'Request timeout' };
      expect(isModerationRejection(detail)).toBe(false);
    });

    it('returns false for rate limit errors', () => {
      const detail: ApiErrorDetail = { code: 'RATE_LIMITED', message: 'Too many requests', status: 429 };
      expect(isModerationRejection(detail)).toBe(false);
    });

    it('returns false for photo limit exceeded', () => {
      const detail: ApiErrorDetail = { code: 'PHOTO_LIMIT_EXCEEDED', message: 'Max 6 photos' };
      expect(isModerationRejection(detail)).toBe(false);
    });

    it('returns false for validation errors', () => {
      const detail: ApiErrorDetail = { code: 'VALIDATION_ERROR', message: 'Invalid file' };
      expect(isModerationRejection(detail)).toBe(false);
    });

    it('returns false for generic unknown errors', () => {
      const detail: ApiErrorDetail = { code: 'UNKNOWN', message: 'Something went wrong' };
      expect(isModerationRejection(detail)).toBe(false);
    });

    it('returns false when message is empty', () => {
      const detail: ApiErrorDetail = { code: 'UNKNOWN', message: '' };
      expect(isModerationRejection(detail)).toBe(false);
    });
  });

  describe('getModerationMessage', () => {
    it('returns a non-judgmental message', () => {
      const msg = getModerationMessage();
      expect(msg).toContain('could not be approved');
      expect(msg).toContain('choose a different photo');
    });

    it('does not use accusatory or shaming language', () => {
      const msg = getModerationMessage().toLowerCase();
      expect(msg).not.toContain('you uploaded');
      expect(msg).not.toContain('inappropriate');
      expect(msg).not.toContain('banned');
      expect(msg).not.toContain('violation');
      expect(msg).not.toContain('warning');
    });

    it('references community guidelines', () => {
      const msg = getModerationMessage();
      expect(msg).toContain('community guidelines');
    });
  });
});
