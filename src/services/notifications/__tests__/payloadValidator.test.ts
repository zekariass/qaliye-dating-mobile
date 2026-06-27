import { buildNavIntent, validatePayload } from '../payloadValidator';

describe('validatePayload', () => {
  it('returns null for non-object input', () => {
    expect(validatePayload(null)).toBeNull();
    expect(validatePayload('string')).toBeNull();
    expect(validatePayload(42)).toBeNull();
  });

  it('returns null for unknown notification types', () => {
    expect(validatePayload({ notification_type: 'UNKNOWN_TYPE' })).toBeNull();
    expect(validatePayload({ notification_type: '' })).toBeNull();
    expect(validatePayload({})).toBeNull();
  });

  it('accepts all supported notification types', () => {
    const types = ['CHAT_MESSAGE', 'MATCH_CREATED', 'LIKE_RECEIVED', 'ACCOUNT_ALERT', 'MARKETING'];
    for (const type of types) {
      expect(validatePayload({ notification_type: type })).not.toBeNull();
    }
  });

  it('validates UUID-shaped match_id', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    const result = validatePayload({
      notification_type: 'CHAT_MESSAGE',
      match_id: validUuid,
    });
    expect(result?.match_id).toBe(validUuid);
  });

  it('rejects non-UUID match_id', () => {
    const result = validatePayload({
      notification_type: 'CHAT_MESSAGE',
      match_id: 'not-a-uuid',
    });
    expect(result?.match_id).toBeUndefined();
  });

  it('validates UUID-shaped message_id', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440001';
    const result = validatePayload({
      notification_type: 'CHAT_MESSAGE',
      match_id: '550e8400-e29b-41d4-a716-446655440000',
      message_id: validUuid,
    });
    expect(result?.message_id).toBe(validUuid);
  });

  it('validates UUID-shaped discovery_action_id for LIKE_RECEIVED', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440002';
    const result = validatePayload({
      notification_type: 'LIKE_RECEIVED',
      discovery_action_id: validUuid,
    });
    expect(result?.discovery_action_id).toBe(validUuid);
  });

  it('validates UUID-shaped campaign_id for MARKETING', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440003';
    const result = validatePayload({
      notification_type: 'MARKETING',
      campaign_id: validUuid,
    });
    expect(result?.campaign_id).toBe(validUuid);
  });

  it('ignores legacy camelCase and navigation fields', () => {
    const result = validatePayload({
      notification_type: 'CHAT_MESSAGE',
      type: 'MATCH_CREATED',
      matchId: '550e8400-e29b-41d4-a716-446655440000',
      navigation: { screen: 'chat' },
    });
    expect(result?.type).toBe('CHAT_MESSAGE');
    expect(result?.match_id).toBeUndefined();
    expect(result?.navigation).toBeUndefined();
  });
});

describe('buildNavIntent', () => {
  it('routes CHAT_MESSAGE with match_id to chat screen', () => {
    const payload = validatePayload({
      notification_type: 'CHAT_MESSAGE',
      match_id: '550e8400-e29b-41d4-a716-446655440000',
    })!;
    const intent = buildNavIntent(payload);
    expect(intent?.screen).toBe('chat');
    expect(intent?.match_id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('returns null for CHAT_MESSAGE without match_id', () => {
    const payload = validatePayload({ notification_type: 'CHAT_MESSAGE' })!;
    const intent = buildNavIntent(payload);
    expect(intent).toBeNull();
  });

  it('routes MATCH_CREATED to matches screen', () => {
    const payload = validatePayload({ notification_type: 'MATCH_CREATED' })!;
    const intent = buildNavIntent(payload);
    expect(intent?.screen).toBe('matches');
  });

  it('routes LIKE_RECEIVED to likes screen', () => {
    const payload = validatePayload({ notification_type: 'LIKE_RECEIVED' })!;
    const intent = buildNavIntent(payload);
    expect(intent?.screen).toBe('likes');
  });

  it('routes ACCOUNT_ALERT to settings screen', () => {
    const payload = validatePayload({ notification_type: 'ACCOUNT_ALERT' })!;
    const intent = buildNavIntent(payload);
    expect(intent?.screen).toBe('settings');
  });

  it('routes MARKETING to index screen', () => {
    const payload = validatePayload({ notification_type: 'MARKETING' })!;
    const intent = buildNavIntent(payload);
    expect(intent?.screen).toBe('index');
  });
});
