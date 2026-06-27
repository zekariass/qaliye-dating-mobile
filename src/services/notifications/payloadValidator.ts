import type {
    NotificationPayloadData,
    NotificationType,
    ValidatedNavIntent,
} from '@/types/notifications';

const SUPPORTED_TYPES: NotificationType[] = [
  'CHAT_MESSAGE',
  'MATCH_CREATED',
  'LIKE_RECEIVED',
  'ACCOUNT_ALERT',
  'MARKETING',
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function validatePayload(raw: unknown): NotificationPayloadData | null {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Record<string, unknown>;
  const type = data.notification_type as NotificationType;

  if (!SUPPORTED_TYPES.includes(type)) return null;

  return {
    type,
    match_id: isValidUuid(data.match_id) ? data.match_id : undefined,
    message_id: isValidUuid(data.message_id) ? data.message_id : undefined,
    discovery_action_id: isValidUuid(data.discovery_action_id)
      ? data.discovery_action_id
      : undefined,
    campaign_id: isValidUuid(data.campaign_id) ? data.campaign_id : undefined,
  };
}

export function buildNavIntent(
  payload: NotificationPayloadData,
): ValidatedNavIntent | null {
  const { type, match_id, message_id, discovery_action_id, campaign_id } = payload;

  switch (type) {
    case 'CHAT_MESSAGE':
      if (match_id) {
        return {
          type,
          match_id,
          message_id,
          screen: 'chat',
          params: { match_id },
        };
      }
      return null;
    case 'MATCH_CREATED':
      return { type, match_id, screen: 'matches' };
    case 'LIKE_RECEIVED':
      return { type, discovery_action_id, screen: 'likes' };
    case 'ACCOUNT_ALERT':
      return { type, screen: 'settings' };
    case 'MARKETING':
      return { type, campaign_id, screen: 'index' };
  }
}
