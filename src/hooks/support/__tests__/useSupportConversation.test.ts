import { computeUnreadCount } from '../useSupportConversation';
import type { SupportConversationDto } from '@/types/support';

// ---------------------------------------------------------------------------
// computeUnreadCount — unit tests (no React/hook infrastructure needed)
// ---------------------------------------------------------------------------

function makeDto(overrides: Partial<SupportConversationDto> = {}): SupportConversationDto {
  return {
    id: 'conv-1',
    status: 'ACTIVE',
    user_last_read_sequence: 0,
    next_public_sequence: 0,
    last_public_message_at: null,
    last_public_message_sender_type: null,
    closed_at: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('computeUnreadCount', () => {
  describe('when backend provides unread_count', () => {
    it('returns the backend value directly', () => {
      const dto = makeDto({ unread_count: 5, user_last_read_sequence: 2, next_public_sequence: 10 });
      expect(computeUnreadCount(dto)).toBe(5);
    });

    it('returns 0 when backend reports 0 even if sequence math would differ', () => {
      const dto = makeDto({ unread_count: 0, user_last_read_sequence: 3, next_public_sequence: 10 });
      expect(computeUnreadCount(dto)).toBe(0);
    });

    it('clamps negative backend value to 0', () => {
      const dto = makeDto({ unread_count: -1 });
      expect(computeUnreadCount(dto)).toBe(0);
    });
  });

  describe('TEMPORARY fallback — when backend omits unread_count', () => {
    it('computes count from sequence numbers', () => {
      const dto = makeDto({ user_last_read_sequence: 3, next_public_sequence: 7 });
      // next_public_sequence - 1 - user_last_read_sequence = 7 - 1 - 3 = 3
      expect(computeUnreadCount(dto)).toBe(3);
    });

    it('returns 0 when user is fully caught up', () => {
      const dto = makeDto({ user_last_read_sequence: 6, next_public_sequence: 7 });
      expect(computeUnreadCount(dto)).toBe(0);
    });

    it('clamps to 0 when sequences are equal (nothing to read)', () => {
      const dto = makeDto({ user_last_read_sequence: 0, next_public_sequence: 0 });
      expect(computeUnreadCount(dto)).toBe(0);
    });

    it('clamps to 0 if result would be negative', () => {
      // Shouldn't occur in practice but guarded against
      const dto = makeDto({ user_last_read_sequence: 10, next_public_sequence: 5 });
      expect(computeUnreadCount(dto)).toBe(0);
    });
  });

  describe('supportKeys', () => {
    // Static verification that query keys are isolated from chat keys
    const { supportKeys } = require('../useSupportConversation');

    it('all key contains "support"', () => {
      expect(supportKeys.all).toContain('support');
    });

    it('conversation key is namespaced under support', () => {
      expect(supportKeys.conversation()).toEqual(['support', 'conversation']);
    });

    it('messages key is namespaced under support', () => {
      expect(supportKeys.messages()).toEqual(['support', 'messages']);
    });

    it('support keys do not overlap with known chat keys', () => {
      const chatKeys = ['chat-inbox'];
      const allSupportKeys = [
        supportKeys.all,
        supportKeys.conversation(),
        supportKeys.messages(),
      ].flat();
      for (const chatKey of chatKeys) {
        expect(allSupportKeys).not.toContain(chatKey);
      }
    });
  });
});
