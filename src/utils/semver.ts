// ---------------------------------------------------------------------------
// Semantic Version Utilities
// ---------------------------------------------------------------------------
//
// Handles versions in the form "1.2.3" or "v1.2.3".
// Intentionally minimal — no pre-release or build-metadata support needed.
// ---------------------------------------------------------------------------

/**
 * Strip a leading 'v' and parse a semver string into [major, minor, patch].
 * Non-numeric parts default to 0.
 */
export function parseSemver(version: string): [number, number, number] {
  const v = version.replace(/^v/, '');
  const parts = v.split('.').map((p) => {
    const n = parseInt(p, 10);
    return Number.isFinite(n) ? n : 0;
  });
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/**
 * Compare two semver strings.
 *
 * Returns:
 *  1  — a is newer than b
 * -1  — a is older than b
 *  0  — a and b are the same version
 */
export function compareSemver(a: string, b: string): number {
  const [aMaj, aMin, aPatch] = parseSemver(a);
  const [bMaj, bMin, bPatch] = parseSemver(b);

  if (aMaj !== bMaj) return aMaj > bMaj ? 1 : -1;
  if (aMin !== bMin) return aMin > bMin ? 1 : -1;
  if (aPatch !== bPatch) return aPatch > bPatch ? 1 : -1;
  return 0;
}

export type UpdateDecision = 'no-update' | 'optional-update' | 'mandatory-update';

export type UpdateDecisionParams = {
  currentVersion: string;
  latestVersion: string;
  minimumVersion: string;
  forceUpdate: boolean;
};

/**
 * Decide what kind of update prompt to show, if any.
 *
 * Decision rules (in priority order):
 *  1. force_update === true                              → mandatory
 *  2. currentVersion < minimum_version                  → mandatory
 *  3. currentVersion < latest_version  (and not forced) → optional
 *  4. currentVersion >= latest_version                  → no-update
 */
export function decideUpdate({
  currentVersion,
  latestVersion,
  minimumVersion,
  forceUpdate,
}: UpdateDecisionParams): UpdateDecision {
  if (forceUpdate) return 'mandatory-update';
  if (compareSemver(currentVersion, minimumVersion) < 0) return 'mandatory-update';
  if (compareSemver(currentVersion, latestVersion) < 0) return 'optional-update';
  return 'no-update';
}
