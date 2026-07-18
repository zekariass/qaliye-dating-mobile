import { apiClient } from '@/api/apiClient';

import {
  closeSupportConversation,
  getSupportAttachmentDownloadUrl,
  getSupportConversation,
  getSupportMessages,
  markSupportConversationRead,
  sendSupportMessage,
} from '../supportApi';

jest.mock('@/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;

describe('supportApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getSupportConversation ───────────────────────────────────────────────

  describe('getSupportConversation', () => {
    it('calls GET /api/v1/support/conversation', async () => {
      const fixture = { id: 'conv-1', status: 'IDLE', next_public_sequence: 0 };
      mockedGet.mockResolvedValue({ data: fixture });

      const result = await getSupportConversation();

      expect(mockedGet).toHaveBeenCalledWith('/api/v1/support/conversation');
      expect(result).toEqual(fixture);
    });
  });

  // ── getSupportMessages ───────────────────────────────────────────────────

  describe('getSupportMessages', () => {
    it('calls GET /api/v1/support/conversation/messages with no params when omitted', async () => {
      mockedGet.mockResolvedValue({ data: { messages: [], next_before_sequence: null } });

      await getSupportMessages();

      expect(mockedGet).toHaveBeenCalledWith(
        '/api/v1/support/conversation/messages',
        { params: {} },
      );
    });

    it('passes before_sequence and limit as string query params', async () => {
      mockedGet.mockResolvedValue({ data: { messages: [], next_before_sequence: null } });

      await getSupportMessages({ before_sequence: 42, limit: 10 });

      expect(mockedGet).toHaveBeenCalledWith(
        '/api/v1/support/conversation/messages',
        { params: { before_sequence: '42', limit: '10' } },
      );
    });

    it('omits before_sequence when not provided', async () => {
      mockedGet.mockResolvedValue({ data: { messages: [], next_before_sequence: null } });

      await getSupportMessages({ limit: 25 });

      const call = mockedGet.mock.calls[0];
      expect(call[1].params).not.toHaveProperty('before_sequence');
      expect(call[1].params).toMatchObject({ limit: '25' });
    });
  });

  // ── sendSupportMessage ───────────────────────────────────────────────────

  describe('sendSupportMessage', () => {
    it('POSTs with multipart/form-data header', async () => {
      const fixture = { id: 'msg-1', sender_type: 'USER', body: 'hi', attachments: [] };
      mockedPost.mockResolvedValue({ data: fixture });

      const fd = new FormData();
      fd.append('clientMessageId', 'uuid-1');
      fd.append('body', 'hi');

      const result = await sendSupportMessage(fd);

      expect(mockedPost).toHaveBeenCalledWith(
        '/api/v1/support/conversation/messages',
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      expect(result).toEqual(fixture);
    });
  });

  // ── markSupportConversationRead ──────────────────────────────────────────

  describe('markSupportConversationRead', () => {
    it('POSTs last_read_sequence to /api/v1/support/conversation/read', async () => {
      mockedPost.mockResolvedValue({ data: undefined });

      await markSupportConversationRead(15);

      expect(mockedPost).toHaveBeenCalledWith(
        '/api/v1/support/conversation/read',
        { last_read_sequence: 15 },
      );
    });

    it('uses snake_case field name (not camelCase)', async () => {
      mockedPost.mockResolvedValue({ data: undefined });
      await markSupportConversationRead(7);
      const [, body] = mockedPost.mock.calls[0];
      expect(body).toHaveProperty('last_read_sequence', 7);
      expect(body).not.toHaveProperty('lastReadSequence');
    });
  });

  // ── closeSupportConversation ─────────────────────────────────────────────

  describe('closeSupportConversation', () => {
    it('POSTs to /api/v1/support/conversation/close with no body', async () => {
      mockedPost.mockResolvedValue({ data: undefined });

      await closeSupportConversation();

      expect(mockedPost).toHaveBeenCalledWith('/api/v1/support/conversation/close');
    });
  });

  // ── getSupportAttachmentDownloadUrl ──────────────────────────────────────

  describe('getSupportAttachmentDownloadUrl', () => {
    it('calls GET /api/v1/support/attachments/{id}/download-url', async () => {
      mockedGet.mockResolvedValue({ data: { download_url: 'https://example.com/file' } });

      const result = await getSupportAttachmentDownloadUrl('att-123');

      expect(mockedGet).toHaveBeenCalledWith(
        '/api/v1/support/attachments/att-123/download-url',
      );
      expect(result.download_url).toBe('https://example.com/file');
    });
  });
});
