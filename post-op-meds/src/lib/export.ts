import { MEDICATIONS, MED_ORDER } from './medications';
import { fmtFullDate, fmtTime } from './time';
import type { DoseEntry } from './types';
import type { PersistedState } from './storage';

export function buildJson(state: PersistedState): string {
  return JSON.stringify(
    { app: 'post-op-meds', exportedAt: new Date().toISOString(), ...state },
    null, 2,
  );
}

/** Plain-text log in Hebrew, grouped by day, newest first – for WhatsApp / email to the clinic. */
export function buildTextLog(doses: DoseEntry[]): string {
  const sorted = [...doses].sort((a, b) => b.takenAt - a.takenAt);
  const lines: string[] = ['יומן נטילת תרופות לאחר ניתוח בחלל הפה', `הופק: ${fmtFullDate(Date.now())} ${fmtTime(Date.now())}`, ''];

  lines.push('סיכום:');
  for (const id of MED_ORDER) {
    const n = doses.filter((d) => d.medId === id).length;
    lines.push(`• ${MEDICATIONS[id].name} (${MEDICATIONS[id].brand}): ${n} מנות`);
  }
  lines.push('');

  let day = '';
  for (const d of sorted) {
    const dk = fmtFullDate(d.takenAt);
    if (dk !== day) {
      day = dk;
      lines.push(`— ${dk} —`);
    }
    const med = MEDICATIONS[d.medId];
    const food = d.withFood ? 'עם אוכל/הגנה לקיבה' : 'ללא אוכל';
    const note = d.note ? ` · הערה: ${d.note}` : '';
    lines.push(`${fmtTime(d.takenAt)}  ${med.name} – טבליה 1 · ${food}${note}`);
  }
  if (sorted.length === 0) lines.push('לא נרשמו נטילות.');
  return lines.join('\n');
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ShareResult = 'shared' | 'copied' | 'failed' | 'cancelled';

export async function shareText(title: string, text: string): Promise<ShareResult> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export const fileStamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
