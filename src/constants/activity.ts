/**
 * Activity status polling intervals (in milliseconds).
 *
 * These values are part of the frontend contract with the backend API
 * and should match the refresh contracts specified in the backend documentation.
 *
 * Per spec:
 * - Heartbeat: send every 90s while app is active
 * - Status refresh: poll every 90s while screen is focused and app is foregrounded
 * - Chat metadata: poll every 90s while chat is focused and app is foregrounded
 */

export const ACTIVITY_HEARTBEAT_INTERVAL_MS = 90_000;
export const ACTIVITY_STATUS_REFRESH_INTERVAL_MS = 90_000;
export const ACTIVITY_CHAT_METADATA_POLL_INTERVAL_MS = 90_000;
