// ─── Shared Blind Date formatting helpers ────────────────────────────────────

export function formatTimeLeft(expiresAt: string | null | undefined): string {
  if (!expiresAt) return 'No deadline';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h left`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} left`;
}

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "Decide within 34h" style countdown from final_decision.decision_deadline_at. */
export function formatDecisionDeadline(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Decide within ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `Decide within ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Decide within ${days} day${days === 1 ? '' : 's'}`;
}
