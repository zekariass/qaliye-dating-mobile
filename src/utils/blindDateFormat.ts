// ─── Shared Blind Date formatting helpers ────────────────────────────────────

import i18n from '@/i18n';

export function formatTimeLeft(expiresAt: string | null | undefined): string {
  const t = i18n.t.bind(i18n);
  if (!expiresAt) return t('blindDate.format.noDeadline');
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return t('blindDate.format.ended');
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t('blindDate.format.minutesLeft', { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('blindDate.format.hoursLeft', { count: hrs });
  const days = Math.floor(hrs / 24);
  return t('blindDate.format.daysLeft', { count: days });
}

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "Decide within 34h" style countdown from final_decision.decision_deadline_at. */
export function formatDecisionDeadline(iso: string | null | undefined): string | null {
  const t = i18n.t.bind(i18n);
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return null;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return t('blindDate.format.decideWithinMinutes', { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return t('blindDate.format.decideWithinHours', { count: hrs });
  const days = Math.floor(hrs / 24);
  return t('blindDate.format.decideWithinDays', { count: days });
}
