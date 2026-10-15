import { INTEREST_OPTIONS } from '@/screens/profile/mockEditProfile';
import {
    canSelectMore,
    DISCOVERY_CARD_INTEREST_PREVIEW,
    getDiscoveryInterests,
    INTERESTS_INITIAL_PREVIEW_COUNT,
    isValidInterest,
    MAX_INTERESTS,
    sanitizeInterests,
} from '@/utils/interests';

describe('interests utility', () => {
  const validInterest = INTEREST_OPTIONS[0];
  const anotherValid = INTEREST_OPTIONS[1];

  describe('isValidInterest', () => {
    it('returns true for a valid interest', () => {
      expect(isValidInterest(validInterest)).toBe(true);
    });

    it('returns false for an invalid interest', () => {
      expect(isValidInterest('Skydiving')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidInterest('')).toBe(false);
    });
  });

  describe('sanitizeInterests', () => {
    it('returns empty array for null/undefined', () => {
      expect(sanitizeInterests(null)).toEqual([]);
      expect(sanitizeInterests(undefined)).toEqual([]);
    });

    it('returns empty array for empty input', () => {
      expect(sanitizeInterests([])).toEqual([]);
    });

    it('filters out invalid values', () => {
      expect(sanitizeInterests([validInterest, 'Skydiving', anotherValid])).toEqual([
        validInterest,
        anotherValid,
      ]);
    });

    it('removes duplicates preserving order', () => {
      expect(sanitizeInterests([validInterest, validInterest, anotherValid])).toEqual([
        validInterest,
        anotherValid,
      ]);
    });

    it('removes empty strings', () => {
      expect(sanitizeInterests(['', validInterest, '  '])).toEqual([validInterest]);
    });

    it('trims whitespace before validating', () => {
      expect(sanitizeInterests([`  ${validInterest}  `])).toEqual([validInterest]);
    });

    it('enforces max selection limit', () => {
      const many = INTEREST_OPTIONS.slice(0, 12);
      const result = sanitizeInterests(many, 8);
      expect(result).toHaveLength(8);
      expect(result).toEqual(INTEREST_OPTIONS.slice(0, 8));
    });

    it('uses default max of 8', () => {
      const many = INTEREST_OPTIONS.slice(0, 15);
      expect(sanitizeInterests(many)).toHaveLength(8);
    });

    it('preserves selection order', () => {
      const reordered = [anotherValid, validInterest];
      expect(sanitizeInterests(reordered)).toEqual([anotherValid, validInterest]);
    });

    it('handles non-string values gracefully', () => {
      expect(sanitizeInterests([123 as any, validInterest, null as any])).toEqual([validInterest]);
    });
  });

  describe('canSelectMore', () => {
    it('returns true when under max', () => {
      expect(canSelectMore(['a', 'b'], 8)).toBe(true);
    });

    it('returns false when at max', () => {
      expect(canSelectMore(Array(8).fill('x'), 8)).toBe(false);
    });

    it('uses default max of 8', () => {
      expect(canSelectMore(Array(7).fill('x'))).toBe(true);
      expect(canSelectMore(Array(8).fill('x'))).toBe(false);
    });
  });

  describe('getDiscoveryInterests', () => {
    it('returns up to DISCOVERY_CARD_INTEREST_PREVIEW visible interests', () => {
      // DISCOVERY_CARD_INTEREST_PREVIEW === MAX_INTERESTS, so sanitizeInterests
      // caps the input before getDiscoveryInterests slices — remaining is
      // always 0 and visible contains all sanitized items (up to the limit).
      const interests = INTEREST_OPTIONS.slice(0, DISCOVERY_CARD_INTEREST_PREVIEW);
      const { visible, remaining } = getDiscoveryInterests(interests);
      expect(visible).toHaveLength(DISCOVERY_CARD_INTEREST_PREVIEW);
      expect(visible).toEqual(INTEREST_OPTIONS.slice(0, DISCOVERY_CARD_INTEREST_PREVIEW));
      expect(remaining).toBe(0);
    });

    it('returns all if fewer than preview limit, remaining 0', () => {
      const interests = [validInterest, anotherValid];
      const { visible, remaining } = getDiscoveryInterests(interests);
      expect(visible).toHaveLength(2);
      expect(remaining).toBe(0);
    });

    it('returns empty for null/undefined', () => {
      const { visible, remaining } = getDiscoveryInterests(null);
      expect(visible).toEqual([]);
      expect(remaining).toBe(0);
    });

    it('sanitizes before slicing — removes invalid entries', () => {
      // 3 valid + 2 invalid → 3 valid after sanitize, all visible, remaining 0.
      const { visible, remaining } = getDiscoveryInterests([
        validInterest,
        'Invalid',
        anotherValid,
        INTEREST_OPTIONS[2],
        'AlsoInvalid',
      ]);
      expect(visible).toEqual([validInterest, anotherValid, INTEREST_OPTIONS[2]]);
      expect(remaining).toBe(0);
    });
  });

  describe('constants', () => {
    it('MAX_INTERESTS is 8', () => {
      expect(MAX_INTERESTS).toBe(8);
    });

    it('INTERESTS_INITIAL_PREVIEW_COUNT is 20', () => {
      expect(INTERESTS_INITIAL_PREVIEW_COUNT).toBe(20);
    });

    it('DISCOVERY_CARD_INTEREST_PREVIEW equals MAX_INTERESTS', () => {
      expect(DISCOVERY_CARD_INTEREST_PREVIEW).toBe(MAX_INTERESTS);
    });

    it('INTEREST_OPTIONS has more than 12 options', () => {
      expect(INTEREST_OPTIONS.length).toBeGreaterThan(12);
    });
  });
});
