jest.mock('expo-audio', () => ({
  useAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
    replace: jest.fn(),
  })),
  useAudioPlayerStatus: jest.fn(() => ({
    currentTime: 0,
    duration: 0,
    playing: false,
    isBuffering: false,
  })),
}));

jest.mock('@/api/support/supportApi', () => ({
  getSupportAttachmentDownloadUrl: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({
    colors: {
      text: '#111827',
      surface: '#FFFFFF',
      border: '#E9DDF8',
      textMuted: '#9CA3AF',
    },
    mode: 'light',
  }),
}));

import { isVoiceAttachment } from '@/components/messages/SupportVoiceMessage';
import type { SupportAttachment } from '@/types/support';

function makeAttachment(overrides: Partial<SupportAttachment> = {}): SupportAttachment {
  return {
    id: 'att-1',
    message_id: 'msg-1',
    file_name: 'test.m4a',
    content_type: 'audio/m4a',
    file_size_bytes: 1000,
    attachment_kind: 'VOICE',
    duration_ms: 5000,
    download_url: null,
    download_url_expires_at: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('isVoiceAttachment', () => {
  it('returns true when attachment_kind is VOICE', () => {
    const att = makeAttachment({ attachment_kind: 'VOICE', content_type: 'application/octet-stream' });
    expect(isVoiceAttachment(att)).toBe(true);
  });

  it('returns true when content_type starts with audio/ even without attachment_kind', () => {
    const att = makeAttachment({ attachment_kind: null, content_type: 'audio/mp4' });
    expect(isVoiceAttachment(att)).toBe(true);
  });

  it('returns true for audio/aac fallback', () => {
    const att = makeAttachment({ attachment_kind: null, content_type: 'audio/aac' });
    expect(isVoiceAttachment(att)).toBe(true);
  });

  it('returns true for audio/x-m4a fallback', () => {
    const att = makeAttachment({ attachment_kind: null, content_type: 'audio/x-m4a' });
    expect(isVoiceAttachment(att)).toBe(true);
  });

  it('returns false for image attachments', () => {
    const att = makeAttachment({ attachment_kind: 'IMAGE', content_type: 'image/jpeg' });
    expect(isVoiceAttachment(att)).toBe(false);
  });

  it('returns false for document attachments', () => {
    const att = makeAttachment({ attachment_kind: 'DOCUMENT', content_type: 'application/pdf' });
    expect(isVoiceAttachment(att)).toBe(false);
  });

  it('returns false for text attachments', () => {
    const att = makeAttachment({ attachment_kind: 'TEXT', content_type: 'text/plain' });
    expect(isVoiceAttachment(att)).toBe(false);
  });

  it('returns false for other attachments with non-audio content type', () => {
    const att = makeAttachment({ attachment_kind: 'OTHER', content_type: 'application/octet-stream' });
    expect(isVoiceAttachment(att)).toBe(false);
  });

  it('returns false when attachment_kind is null and content_type is not audio', () => {
    const att = makeAttachment({ attachment_kind: null, content_type: 'image/png' });
    expect(isVoiceAttachment(att)).toBe(false);
  });
});
