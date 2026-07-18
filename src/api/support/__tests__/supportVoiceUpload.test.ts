import { apiClient } from '@/api/apiClient';
import { sendSupportMessage } from '@/api/support/supportApi';

jest.mock('@/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedPost = apiClient.post as jest.Mock;

describe('sendSupportMessage with voice durations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('posts voice file with URI, name, and MIME type', async () => {
    mockedPost.mockResolvedValue({
      data: { id: 'msg-1', sender_type: 'USER', body: null, attachments: [] },
    });

    const fd = new FormData();
    fd.append('clientMessageId', 'uuid-voice-1');
    fd.append('files', {
      uri: 'file:///cache/voice.m4a',
      name: 'support-voice.m4a',
      type: 'audio/m4a',
    } as unknown as Blob);
    fd.append('durations', '[5000]');

    await sendSupportMessage(fd);

    expect(mockedPost).toHaveBeenCalledWith(
      '/api/v1/support/conversation/messages',
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  });

  it('includes clientMessageId for idempotency', async () => {
    mockedPost.mockResolvedValue({
      data: { id: 'msg-2', sender_type: 'USER', body: null, attachments: [] },
    });

    const fd = new FormData();
    fd.append('clientMessageId', 'stable-uuid-123');
    fd.append('files', {
      uri: 'file:///cache/voice.m4a',
      name: 'support-voice.m4a',
      type: 'audio/m4a',
    } as unknown as Blob);
    fd.append('durations', '[3200]');

    await sendSupportMessage(fd);

    const [, sentData] = mockedPost.mock.calls[0];
    expect(sentData).toBe(fd);
  });

  it('body is optional when sending voice-only', async () => {
    mockedPost.mockResolvedValue({
      data: { id: 'msg-3', sender_type: 'USER', body: null, attachments: [] },
    });

    const fd = new FormData();
    fd.append('clientMessageId', 'uuid-voice-only');
    fd.append('files', {
      uri: 'file:///cache/voice.m4a',
      name: 'support-voice.m4a',
      type: 'audio/m4a',
    } as unknown as Blob);
    fd.append('durations', '[10000]');

    await sendSupportMessage(fd);

    expect(mockedPost).toHaveBeenCalled();
    const [, sentData] = mockedPost.mock.calls[0];
    expect(sentData).toBe(fd);
  });

  it('supports voice plus text message', async () => {
    mockedPost.mockResolvedValue({
      data: { id: 'msg-4', sender_type: 'USER', body: 'Hello', attachments: [] },
    });

    const fd = new FormData();
    fd.append('clientMessageId', 'uuid-voice-text');
    fd.append('body', 'Hello');
    fd.append('files', {
      uri: 'file:///cache/voice.m4a',
      name: 'support-voice.m4a',
      type: 'audio/m4a',
    } as unknown as Blob);
    fd.append('durations', '[3000]');

    await sendSupportMessage(fd);

    expect(mockedPost).toHaveBeenCalled();
  });

  it('uses JSON array durations for mixed photo + voice attachments', async () => {
    mockedPost.mockResolvedValue({
      data: { id: 'msg-5', sender_type: 'USER', body: null, attachments: [] },
    });

    const fd = new FormData();
    fd.append('clientMessageId', 'uuid-mixed');
    fd.append('files', {
      uri: 'file:///cache/screenshot.png',
      name: 'screenshot.png',
      type: 'image/png',
    } as unknown as Blob);
    fd.append('files', {
      uri: 'file:///cache/voice.m4a',
      name: 'support-voice.m4a',
      type: 'audio/m4a',
    } as unknown as Blob);
    fd.append('durations', '[null, 18450]');

    await sendSupportMessage(fd);

    expect(mockedPost).toHaveBeenCalled();
  });
});
