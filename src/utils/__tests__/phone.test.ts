import { formatEthiopianPhoneDisplay, normalizeEthiopianPhone } from '../phone';

describe('normalizeEthiopianPhone', () => {
  describe('valid Ethiopian phone formats', () => {
    it('normalizes local 0-prefixed number (09...)', () => {
      expect(normalizeEthiopianPhone('0912345678')).toBe('+251912345678');
    });

    it('normalizes local number without leading 0 (9...)', () => {
      expect(normalizeEthiopianPhone('912345678')).toBe('+251912345678');
    });

    it('normalizes number with +251 prefix', () => {
      expect(normalizeEthiopianPhone('+251912345678')).toBe('+251912345678');
    });

    it('normalizes number with 251 prefix (no plus)', () => {
      expect(normalizeEthiopianPhone('251912345678')).toBe('+251912345678');
    });

    it('normalizes a 7-prefix Ethiopian mobile number', () => {
      expect(normalizeEthiopianPhone('0712345678')).toBe('+251712345678');
    });

    it('normalizes 07... format to +2517...', () => {
      expect(normalizeEthiopianPhone('0791234567')).toBe('+251791234567');
    });

    it('strips spaces from input', () => {
      expect(normalizeEthiopianPhone('091 234 5678')).toBe('+251912345678');
    });

    it('strips dashes from input', () => {
      expect(normalizeEthiopianPhone('091-234-5678')).toBe('+251912345678');
    });

    it('strips spaces and dashes mixed', () => {
      expect(normalizeEthiopianPhone('+251 91 234-5678')).toBe('+251912345678');
    });
  });

  describe('invalid Ethiopian phone numbers', () => {
    it('rejects non-251 country code', () => {
      expect(normalizeEthiopianPhone('+441234567890')).toBeNull();
    });

    it('rejects US number', () => {
      expect(normalizeEthiopianPhone('+12025551234')).toBeNull();
    });

    it('rejects 254 (Kenya) country code', () => {
      expect(normalizeEthiopianPhone('+254712345678')).toBeNull();
    });

    it('rejects Ethiopian number with prefix 5 (invalid mobile prefix)', () => {
      expect(normalizeEthiopianPhone('0512345678')).toBeNull();
    });

    it('rejects local number that is too short (8 digits)', () => {
      expect(normalizeEthiopianPhone('91234567')).toBeNull();
    });

    it('rejects local number that is too long (10 digits)', () => {
      expect(normalizeEthiopianPhone('9123456789')).toBeNull();
    });

    it('rejects empty string', () => {
      expect(normalizeEthiopianPhone('')).toBeNull();
    });

    it('rejects non-numeric input', () => {
      expect(normalizeEthiopianPhone('not-a-number')).toBeNull();
    });
  });
});

describe('formatEthiopianPhoneDisplay', () => {
  it('formats a standard E.164 Ethiopian number', () => {
    expect(formatEthiopianPhoneDisplay('+251912345678')).toBe('+251 91 234 5678');
  });

  it('formats a 7-prefix number', () => {
    expect(formatEthiopianPhoneDisplay('+251712345678')).toBe('+251 71 234 5678');
  });

  it('returns input unchanged if not +251 prefixed', () => {
    expect(formatEthiopianPhoneDisplay('+441234567890')).toBe('+441234567890');
  });
});
