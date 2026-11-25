export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

/** Doses taken before this hour belong to the previous "treatment day". */
export const DAY_BOUNDARY_HOUR = 4;

export function parseHHMM(v: string): { h: number; m: number } {
  const [h, m] = v.split(':').map((x) => parseInt(x, 10));
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
}

/** Local date key (YYYY-MM-DD) of the treatment day a timestamp belongs to. */
export function treatmentDayKey(ts: number): string {
  const d = new Date(ts - DAY_BOUNDARY_HOUR * HOUR);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

/** Epoch ms of the given HH:MM on the same local calendar date as `ts`. */
export function atTimeOfDay(ts: number, hhmm: string): number {
  const { h, m } = parseHHMM(hhmm);
  const d = new Date(ts);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

/** True when `ts` falls inside the sleep window [sleepTime, wakeTime). Handles windows crossing midnight. */
export function isDuringSleep(ts: number, wakeTime: string, sleepTime: string): boolean {
  const d = new Date(ts);
  const mins = d.getHours() * 60 + d.getMinutes();
  const w = parseHHMM(wakeTime);
  const s = parseHHMM(sleepTime);
  const wake = w.h * 60 + w.m;
  const sleep = s.h * 60 + s.m;
  if (sleep === wake) return false;
  return sleep > wake ? mins >= sleep || mins < wake : mins >= sleep && mins < wake;
}

/** If `ts` falls during sleep hours, push it forward to the next wake time. */
export function shiftOutOfSleep(ts: number, wakeTime: string, sleepTime: string): number {
  if (!isDuringSleep(ts, wakeTime, sleepTime)) return ts;
  let wake = atTimeOfDay(ts, wakeTime);
  if (wake <= ts) wake += DAY;
  return wake;
}

const timeFmt = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' });
const fullFmt = new Intl.DateTimeFormat('he-IL', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});

export const fmtTime = (ts: number) => timeFmt.format(ts);
export const fmtDate = (ts: number) => dateFmt.format(ts);
export const fmtFullDate = (ts: number) => fullFmt.format(ts);

export function fmtRelativeDay(ts: number, now: number): string {
  const a = new Date(ts); a.setHours(0, 0, 0, 0);
  const b = new Date(now); b.setHours(0, 0, 0, 0);
  const diff = Math.round((b.getTime() - a.getTime()) / DAY);
  if (diff === 0) return 'היום';
  if (diff === 1) return 'אתמול';
  if (diff === -1) return 'מחר';
  return fmtDate(ts);
}

/** "HH:MM:SS" countdown (or "D ימים HH:MM:SS"). */
export function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Human "לפני 3 ש׳ 20 ד׳" style duration. */
export function fmtDuration(ms: number): string {
  const mins = Math.max(0, Math.round(ms / MIN));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} ד׳`;
  if (m === 0) return `${h} ש׳`;
  return `${h} ש׳ ${m} ד׳`;
}

/** Value for <input type="datetime-local"> in local time. */
export function toLocalInput(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(v: string): number | null {
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
}
