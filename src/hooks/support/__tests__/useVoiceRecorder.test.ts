import {
  SUPPORT_VOICE_MAX_DURATION_SECONDS,
  SUPPORT_VOICE_MAX_FILE_SIZE_BYTES,
  SUPPORT_VOICE_MIME_TYPES,
} from '@/types/support';

describe('useVoiceRecorder constants', () => {
  it('SUPPORT_VOICE_MAX_DURATION_SECONDS defaults to 300', () => {
    expect(SUPPORT_VOICE_MAX_DURATION_SECONDS).toBe(300);
  });

  it('SUPPORT_VOICE_MAX_FILE_SIZE_BYTES defaults to 25 MiB', () => {
    expect(SUPPORT_VOICE_MAX_FILE_SIZE_BYTES).toBe(26_214_400);
  });

  it('SUPPORT_VOICE_MIME_TYPES includes audio/m4a', () => {
    expect(SUPPORT_VOICE_MIME_TYPES).toContain('audio/m4a');
  });

  it('SUPPORT_VOICE_MIME_TYPES includes audio/mp4', () => {
    expect(SUPPORT_VOICE_MIME_TYPES).toContain('audio/mp4');
  });

  it('SUPPORT_VOICE_MIME_TYPES includes audio/wav', () => {
    expect(SUPPORT_VOICE_MIME_TYPES).toContain('audio/wav');
  });

  it('SUPPORT_VOICE_MIME_TYPES includes audio/webm', () => {
    expect(SUPPORT_VOICE_MIME_TYPES).toContain('audio/webm');
  });
});
