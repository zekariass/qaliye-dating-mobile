import type {
    SupportAttachment,
    SupportAttachmentKind,
    SupportPendingMessage,
} from '@/types/support';

describe('SupportAttachment voice types', () => {
  it('SupportAttachmentKind includes VOICE', () => {
    const kinds: SupportAttachmentKind[] = ['IMAGE', 'DOCUMENT', 'TEXT', 'VOICE', 'OTHER'];
    expect(kinds).toContain('VOICE');
  });

  it('SupportAttachment has duration_ms field', () => {
    const att: SupportAttachment = {
      id: 'att-1',
      message_id: 'msg-1',
      file_name: 'voice.m4a',
      content_type: 'audio/m4a',
      file_size_bytes: 5000,
      attachment_kind: 'VOICE',
      duration_ms: 5000,
      download_url: 'https://example.com/voice',
      download_url_expires_at: '2025-01-01T12:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
    };
    expect(att.duration_ms).toBe(5000);
    expect(att.attachment_kind).toBe('VOICE');
    expect(att.download_url).toBe('https://example.com/voice');
    expect(att.download_url_expires_at).toBe('2025-01-01T12:00:00Z');
  });

  it('SupportAttachment allows null for optional voice fields', () => {
    const att: SupportAttachment = {
      id: 'att-2',
      message_id: 'msg-2',
      file_name: 'doc.pdf',
      content_type: 'application/pdf',
      file_size_bytes: 10000,
      attachment_kind: null,
      duration_ms: null,
      download_url: null,
      download_url_expires_at: null,
      created_at: '2025-01-01T00:00:00Z',
    };
    expect(att.attachment_kind).toBeNull();
    expect(att.duration_ms).toBeNull();
    expect(att.download_url).toBeNull();
  });

  it('SupportAttachment has signed_url field', () => {
    const att: SupportAttachment = {
      id: 'att-3',
      message_id: 'msg-3',
      file_name: 'voice.m4a',
      content_type: 'audio/m4a',
      file_size_bytes: 15360,
      attachment_kind: 'VOICE',
      duration_ms: 18450,
      signed_url: 'https://storage.example.com/voice?signature=abc',
      download_url: null,
      download_url_expires_at: null,
      created_at: '2025-01-01T00:00:00Z',
    };
    expect(att.signed_url).toBe('https://storage.example.com/voice?signature=abc');
  });

  it('SupportAttachment allows null for signed_url', () => {
    const att: SupportAttachment = {
      id: 'att-4',
      message_id: 'msg-4',
      file_name: 'doc.pdf',
      content_type: 'application/pdf',
      file_size_bytes: 10000,
      attachment_kind: 'DOCUMENT',
      duration_ms: null,
      signed_url: null,
      download_url: null,
      download_url_expires_at: null,
      created_at: '2025-01-01T00:00:00Z',
    };
    expect(att.signed_url).toBeNull();
  });

  it('SupportPendingMessage has voiceDurationsMs field', () => {
    const pm: SupportPendingMessage = {
      clientMessageId: 'uuid-1',
      body: null,
      files: [],
      voiceDurationsMs: [5000],
      localSendStatus: 'SENDING',
      createdAt: '2025-01-01T00:00:00Z',
    };
    expect(pm.voiceDurationsMs).toEqual([5000]);
  });

  it('SupportPendingMessage voiceDurationsMs is optional', () => {
    const pm: SupportPendingMessage = {
      clientMessageId: 'uuid-2',
      body: 'hello',
      files: [],
      localSendStatus: 'SENDING',
      createdAt: '2025-01-01T00:00:00Z',
    };
    expect(pm.voiceDurationsMs).toBeUndefined();
  });

  it('SupportPendingMessage has errorMessage field for failed sends', () => {
    const pm: SupportPendingMessage = {
      clientMessageId: 'uuid-3',
      body: null,
      files: [],
      voiceDurationsMs: [18450],
      localSendStatus: 'FAILED',
      errorMessage: 'Voice file duration exceeds 300000 ms',
      createdAt: '2025-01-01T00:00:00Z',
    };
    expect(pm.errorMessage).toBe('Voice file duration exceeds 300000 ms');
  });

  it('SupportPendingMessage voiceDurationsMs supports null for non-audio files', () => {
    const pm: SupportPendingMessage = {
      clientMessageId: 'uuid-4',
      body: 'Here is a photo and voice note',
      files: [],
      voiceDurationsMs: [null, 18450],
      localSendStatus: 'SENDING',
      createdAt: '2025-01-01T00:00:00Z',
    };
    expect(pm.voiceDurationsMs).toEqual([null, 18450]);
  });
});
