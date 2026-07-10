/**
 * Normalizes an Ethiopian phone number to E.164 format.
 *
 * Accepts:
 *   0912345678      → +251912345678
 *   912345678       → +251912345678
 *   +251912345678   → +251912345678
 *   251912345678    → +251912345678
 *
 * Ethiopian mobile numbers start with 9 or 7 and are 9 digits after the country code.
 * Any other format returns null.
 */
export function normalizeEthiopianPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');

  let normalized = digits;

  if (normalized.startsWith('0') && normalized.length === 10) {
    // 0912345678 → 251912345678
    normalized = `251${normalized.slice(1)}`;
  } else if ((normalized.startsWith('9') || normalized.startsWith('7')) && normalized.length === 9) {
    // 912345678 → 251912345678
    normalized = `251${normalized}`;
  }

  if (!normalized.startsWith('251')) {
    return null;
  }

  const isValid = /^251[79]\d{8}$/.test(normalized);

  return isValid ? `+${normalized}` : null;
}

/**
 * Returns a human-readable display of a normalized Ethiopian E.164 number.
 * Example: "+251912345678" → "+251 91 234 5678"
 */
export function formatEthiopianPhoneDisplay(normalized: string): string {
  if (!normalized.startsWith('+251')) return normalized;
  const local = normalized.slice(4);
  if (local.length === 9) {
    return `+251 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }
  return normalized;
}
