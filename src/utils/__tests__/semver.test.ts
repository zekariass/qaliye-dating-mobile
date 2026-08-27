import { compareSemver, decideUpdate, parseSemver } from '../semver';

// ─── parseSemver ──────────────────────────────────────────────────────────────

describe('parseSemver', () => {
  it('parses a normal semver string', () => {
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3]);
  });

  it('strips a leading "v"', () => {
    expect(parseSemver('v1.4.0')).toEqual([1, 4, 0]);
  });

  it('defaults missing parts to 0', () => {
    expect(parseSemver('1')).toEqual([1, 0, 0]);
    expect(parseSemver('1.2')).toEqual([1, 2, 0]);
  });

  it('treats non-numeric parts as 0', () => {
    expect(parseSemver('1.x.y')).toEqual([1, 0, 0]);
  });
});

// ─── compareSemver ────────────────────────────────────────────────────────────

describe('compareSemver', () => {
  it('returns 0 for equal versions', () => {
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
  });

  it('returns 1 when a is newer', () => {
    expect(compareSemver('1.1.0', '1.0.0')).toBe(1);
  });

  it('returns -1 when a is older', () => {
    expect(compareSemver('1.0.0', '1.1.0')).toBe(-1);
  });

  it('handles double-digit minor versions correctly (1.10.0 > 1.9.0)', () => {
    expect(compareSemver('1.10.0', '1.9.0')).toBe(1);
  });

  it('handles large patch versions (2.0.0 > 1.99.99)', () => {
    expect(compareSemver('2.0.0', '1.99.99')).toBe(1);
  });

  it('compares major versions first', () => {
    expect(compareSemver('3.0.0', '2.99.99')).toBe(1);
    expect(compareSemver('0.99.99', '1.0.0')).toBe(-1);
  });

  it('handles leading "v" prefix on either side', () => {
    expect(compareSemver('v1.4.0', '1.4.0')).toBe(0);
    expect(compareSemver('v1.5.0', 'v1.4.0')).toBe(1);
  });
});

// ─── decideUpdate ─────────────────────────────────────────────────────────────

describe('decideUpdate', () => {
  it('returns no-update when current >= latest and not forced', () => {
    expect(
      decideUpdate({
        currentVersion: '1.4.0',
        latestVersion: '1.4.0',
        minimumVersion: '1.2.0',
        forceUpdate: false,
      }),
    ).toBe('no-update');
  });

  it('returns optional-update when current >= minimum and current < latest', () => {
    expect(
      decideUpdate({
        currentVersion: '1.3.0',
        latestVersion: '1.4.0',
        minimumVersion: '1.2.0',
        forceUpdate: false,
      }),
    ).toBe('optional-update');
  });

  it('returns mandatory-update when current < minimum', () => {
    expect(
      decideUpdate({
        currentVersion: '1.1.0',
        latestVersion: '1.4.0',
        minimumVersion: '1.2.0',
        forceUpdate: false,
      }),
    ).toBe('mandatory-update');
  });

  it('returns mandatory-update when force_update is true, regardless of version', () => {
    expect(
      decideUpdate({
        currentVersion: '1.4.0',
        latestVersion: '1.4.0',
        minimumVersion: '1.2.0',
        forceUpdate: true,
      }),
    ).toBe('mandatory-update');
  });

  it('force_update overrides even when current is newer than latest', () => {
    expect(
      decideUpdate({
        currentVersion: '1.5.0',
        latestVersion: '1.4.0',
        minimumVersion: '1.2.0',
        forceUpdate: true,
      }),
    ).toBe('mandatory-update');
  });

  it('returns mandatory-update for emergency forced update with newer latest', () => {
    expect(
      decideUpdate({
        currentVersion: '1.4.0',
        latestVersion: '1.5.0',
        minimumVersion: '1.0.0',
        forceUpdate: true,
      }),
    ).toBe('mandatory-update');
  });

  it('handles double-digit version comparisons correctly', () => {
    expect(
      decideUpdate({
        currentVersion: '1.9.0',
        latestVersion: '1.10.0',
        minimumVersion: '1.0.0',
        forceUpdate: false,
      }),
    ).toBe('optional-update');
  });

  it('returns no-update when current is newer than latest and not forced', () => {
    expect(
      decideUpdate({
        currentVersion: '2.0.0',
        latestVersion: '1.4.0',
        minimumVersion: '1.0.0',
        forceUpdate: false,
      }),
    ).toBe('no-update');
  });
});
