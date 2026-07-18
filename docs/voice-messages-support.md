# Voice Messages in Staff Support Conversations

## Overview

Voice messages allow users to record, send, and play audio messages within the staff support conversation feature. This is strictly isolated to support conversations and does not affect user-to-user chat.

## Architecture

### Files

| File | Purpose |
|------|---------|
| `src/hooks/support/useVoiceRecorder.ts` | Recording lifecycle: permission, start/stop/cancel, max duration timer, app state handling |
| `src/hooks/support/useVoicePlayer.ts` | Playback: signed URL refresh, single active playback, play/pause/resume/seek/stop |
| `src/components/messages/SupportVoiceMessage.tsx` | Voice player UI: play/pause button, slider, duration display, error text |
| `src/hooks/support/useSendSupportMessage.ts` | Extended to accept `voiceDurationsMs` and append `durations` to FormData |
| `src/screens/messages/SupportConversationScreen.tsx` | Mic button in composer, recording bar, voice preview bar, voice message rendering in bubbles |
| `src/types/support.ts` | `SupportAttachmentKind` includes `VOICE`, voice fields on `SupportAttachment`, voice constants, `SupportPendingMessage.voiceDurationsMs` |

### Constants

- `SUPPORT_VOICE_MAX_DURATION_SECONDS`: 300 (5 minutes) — configurable via `EXPO_PUBLIC_SUPPORT_VOICE_MAX_DURATION_SECONDS`
- `SUPPORT_VOICE_MAX_FILE_SIZE_BYTES`: 26,214,400 (25 MiB) — configurable via `EXPO_PUBLIC_SUPPORT_VOICE_MAX_FILE_SIZE_BYTES`
- `SUPPORT_VOICE_MIME_TYPES`: `audio/m4a`, `audio/mp4`, `audio/aac`, `audio/mpeg`, `audio/wav`, `audio/webm`, `audio/x-m4a`

### API Integration

Voice messages use the existing multipart upload endpoint `POST /api/v1/support/conversation/messages`:

- **FormData fields**: `clientMessageId` (idempotency), `body` (optional text), `files` (repeated file fields), `durations` (JSON array string — e.g. `"[18450]"` or `"[null, 18450]"`)
- **`durations` format**: JSON array string. Each audio file gets its duration in ms; non-audio files get `null`. Omitted entirely when no audio files.
- **Idempotency**: `clientMessageId` UUID is reused on retry; 409 response reconciles by refreshing
- **Signed URL playback**: Attachments include `signed_url` (pre-signed, expires in 5 min). `useVoicePlayer` prefers `signed_url`, falls back to `download_url`. Refreshed via `GET /api/v1/support/attachments/{attachmentId}/download-url` when expired.
- **Response shape**: `SupportAttachmentDto` now includes `signed_url`, `attachment_kind`, `duration_ms`. `SupportMessageDto` includes `sender_display_name`.

### Recording Flow

1. User taps mic button in composer → `useVoiceRecorder.startRecording()`
2. Permission requested on demand via `expo-audio`
3. Recording bar shows live timer with stop (■) and cancel (✕) buttons
4. Max duration timer auto-stops at 300s
5. App backgrounding cancels recording
6. On stop → voice preview bar with duration, "Record again", "Delete" actions
7. User can add optional text and tap send → `useSendSupportMessage.send()` with `voiceDurationsMs`

### Playback Flow

1. Voice attachments rendered as `SupportVoiceMessage` in message bubbles
2. `isVoiceAttachment()` detects voice by `attachment_kind === 'VOICE'` or `content_type.startsWith('audio/')`
3. `useVoicePlayer` prefers `signed_url` from attachment, falls back to `download_url`; refreshes via API when expired
4. Single active playback: only one voice plays at a time, coordinated via `activeVoiceId` state
5. Controls: play/pause button, slider for seek, duration display
6. Error states: signed URL refresh failure, playback error
7. `sender_display_name` shown above staff messages (falls back to "Support")

### UI Components

- **VoiceRecordingBar**: Red dot + timer + stop/cancel buttons during recording
- **VoicePreviewBar**: Mic icon + duration + "Record again" / "Delete" after stop
- **SupportVoiceMessage**: Play/pause button + slider + duration in message bubbles

### Permissions

- Microphone permission requested only when user taps the mic button
- `app.json` includes `expo-audio` plugin with `NSMicrophoneUsageDescription` for iOS

### Localization

All voice-related strings are localized in 4 locales (en, am, ti, om) under `support.*`:
- `recordVoiceMessage`, `recording`, `stopRecording`, `cancelRecording`
- `deleteRecording`, `recordAgain`, `previewRecording`
- `playVoiceMessage`, `pauseVoiceMessage`, `playingVoice`, `seekVoice`
- `voiceMessage`, `voiceMessageDuration`, `sendVoiceMessage`
- `voiceUploadFailed`, `retryUpload`, `voicePlaybackFailed`
- `microphonePermissionRequired`, `openSettings`
- `recordingDurationLimitReached`, `voiceFileTooLarge`, `unsupportedAudioFormat`
- `signedUrlRefreshFailed`, `conversationClosed`

### Error Handling

Voice-specific 400 errors from backend are surfaced in the PendingBubble via `errorMessage`:
- `VOICE_DURATION_REQUIRED`: Missing or non-positive duration for audio file
- `VOICE_DURATION_EXCEEDED`: Duration > 300,000 ms
- `UNSUPPORTED_AUDIO_TYPE`: MIME type not in allowed list
- `VOICE_EXTENSION_DISALLOWED`: File extension not allowed
- `VOICE_FILE_TOO_LARGE`: File > 25 MiB

Error codes are registered in `src/utils/apiError.ts` (`API_ERROR_TITLES` + `SHOW_BACKEND_MESSAGE_CODES`).
Backend error messages are shown directly to the user for these codes.

### Tests

| Test File | Tests |
|-----------|-------|
| `src/hooks/support/__tests__/useVoiceRecorder.test.ts` | 6 (constants validation) |
| `src/components/messages/__tests__/SupportVoiceMessage.test.ts` | 9 (isVoiceAttachment helper) |
| `src/api/support/__tests__/supportVoiceUpload.test.ts` | 5 (multipart upload with JSON array durations) |
| `src/types/__tests__/supportVoiceTypes.test.ts` | 9 (type field validation incl. signed_url, errorMessage, null durations) |

### Isolation

- Voice messages are confined to support conversations only
- Query keys `['support', ...]` are separate from chat keys `['chat-inbox', ...]`
- No imports from user-to-user chat modules
- `useVoiceRecorder` and `useVoicePlayer` are in `src/hooks/support/` namespace
- `SupportVoiceMessage` is in `src/components/messages/` but only used by `SupportConversationScreen`
