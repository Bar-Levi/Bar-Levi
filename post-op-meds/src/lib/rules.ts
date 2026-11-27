/**
 * Pure clinical-rules engine. No React, no I/O – everything here is unit-tested.
 * All functions take `now` explicitly so they are deterministic.
 */
import { RULES } from './medications';
import {
  DAY, DAY_BOUNDARY_HOUR, HOUR, MIN, fmtDuration, fmtTime, fmtRelativeDay,
  shiftOutOfSleep, treatmentDayKey,
} from './time';
import type { DoseEntry, MedId, MedStatus, Settings, ValidationResult } from './types';

export const DEFAULT_SETTINGS: Settings = {
  wakeTime: '07:00',
  sleepTime: '23:00',
  rokacetMinHours: 4,
  soundEnabled: true,
  vibrationEnabled: true,
  notifyRokacet: true,
  serverPush: true,
};

/** Doses of one medication, newest first. */
export function dosesFor(doses: DoseEntry[], medId: MedId, excludeId?: string): DoseEntry[] {
  return doses
    .filter((d) => d.medId === medId && d.id !== excludeId)
    .sort((a, b) => b.takenAt - a.takenAt);
}

export function rokacetMinMs(settings: Settings): number {
  const [lo, hi] = RULES.rokacet.minIntervalRange;
  const h = Math.min(hi, Math.max(lo, settings.rokacetMinHours || lo));
  return h * HOUR;
}

/** Start (04:00 local) of the treatment day after the one containing `ts`. */
export function nextTreatmentDayStart(ts: number): number {
  const d = new Date(ts - DAY_BOUNDARY_HOUR * HOUR);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  d.setHours(DAY_BOUNDARY_HOUR, 0, 0, 0);
  return d.getTime();
}

const when = (ts: number, now: number) => `${fmtRelativeDay(ts, now)} ב-${fmtTime(ts)}`;

// ───────────────────────────── Status ─────────────────────────────

export function evaluateStatus(
  medId: MedId, doses: DoseEntry[], now: number, settings: Settings,
): MedStatus {
  const list = dosesFor(doses, medId).filter((d) => d.takenAt <= now + MIN);
  const last = list[0];
  const count24h = list.filter((d) => d.takenAt > now - DAY).length;
  const todayKey = treatmentDayKey(now);
  const countToday = list.filter((d) => treatmentDayKey(d.takenAt) === todayKey).length;
  const base = { medId, lastDose: last, count24h, countToday };

  switch (medId) {
    case 'arcoxia': {
      if (!last) {
        return {
          ...base, level: 'yellow', label: 'זמן מנה מומלץ',
          detail: 'טבליה אחת ביום, רצוי בבוקר עם אוכל',
          lockedUntil: null, nextDueAt: null, countdownTo: null, overdue: false, reminderAt: null,
        };
      }
      const next = last.takenAt + RULES.arcoxia.intervalH * HOUR;
      const reminderAt = shiftOutOfSleep(next, settings.wakeTime, settings.sleepTime);
      if (now < next) {
        return {
          ...base, level: 'red', label: 'נעול – להמתין למרווח בטיחות',
          detail: `המנה הבאה מותרת ${when(next, now)} (פעם ב-24 שעות)`,
          lockedUntil: next, nextDueAt: next, countdownTo: next, countdownLabel: 'עד המנה הבאה',
          overdue: false, reminderAt,
        };
      }
      const overdue = now > next + 3 * HOUR;
      return {
        ...base, level: 'yellow', label: 'זמן מנה מומלץ',
        detail: overdue
          ? `המנה היומית ממתינה כבר ${fmtDuration(now - next)} – ליטול עם אוכל`
          : 'הגיע זמן המנה היומית – ליטול עם אוכל',
        lockedUntil: null, nextDueAt: next, countdownTo: null, overdue, reminderAt,
      };
    }

    case 'rokacet': {
      const minMs = rokacetMinMs(settings);
      const minH = minMs / HOUR;
      const windowAsc = list.filter((d) => d.takenAt > now - DAY).sort((a, b) => a.takenAt - b.takenAt);
      const max = RULES.rokacet.maxPer24h;
      const byInterval = last ? last.takenAt + minMs : 0;
      const byCount = windowAsc.length >= max ? windowAsc[windowAsc.length - max].takenAt + DAY : 0;
      const lockEnd = Math.max(byInterval, byCount);
      const remaining = Math.max(0, max - count24h);
      const reminderAt = settings.notifyRokacet && last ? lockEnd : null;

      if (lockEnd > now) {
        const countLock = byCount > now && byCount >= byInterval;
        return {
          ...base, level: 'red', label: 'נעול – להמתין למרווח בטיחות',
          detail: countLock
            ? `הגעת למקסימום ${max} טבליות ב-24 שעות. מותר שוב ${when(lockEnd, now)}`
            : `מרווח מינימלי של ${minH} שעות בין מנות. מותר שוב ${when(lockEnd, now)}`,
          lockedUntil: lockEnd, nextDueAt: null, countdownTo: lockEnd,
          countdownLabel: 'עד שמותר לקחת שוב', overdue: false, reminderAt,
        };
      }
      const recommended = last ? last.takenAt + RULES.rokacet.recommendedIntervalH * HOUR : 0;
      const parts = [`נותרו ${remaining} מתוך ${max} טבליות ב-24 השעות האחרונות`];
      if (recommended > now) {
        parts.push(`המרווח המומלץ הוא ${RULES.rokacet.recommendedIntervalH} שעות (עוד ${fmtDuration(recommended - now)})`);
      }
      return {
        ...base, level: 'green', label: 'מותר לקחת לפי הצורך', detail: parts.join(' · '),
        lockedUntil: null, nextDueAt: null, countdownTo: null, overdue: false, reminderAt,
      };
    }

    case 'augmentin': {
      const r = RULES.augmentin;
      const taken = list.length;
      const first = list[list.length - 1];
      const endsAt = first ? first.takenAt + (r.courseTotal - 1) * r.intervalH * HOUR : null;
      const course = { taken, total: r.courseTotal, endsAt };
      if (!last) {
        return {
          ...base, course, level: 'yellow', label: 'זמן מנה מומלץ',
          detail: `התחלת טיפול – טבליה כל ${r.intervalH} שעות, ${r.courseTotal} טבליות בסך הכל`,
          lockedUntil: null, nextDueAt: null, countdownTo: null, overdue: false, reminderAt: null,
        };
      }
      if (taken >= r.courseTotal) {
        return {
          ...base, course, level: 'green', label: 'הטיפול הושלם ✓',
          detail: `נלקחו כל ${r.courseTotal} הטבליות. אין צורך במנות נוספות.`,
          lockedUntil: null, nextDueAt: null, countdownTo: null, overdue: false, reminderAt: null,
        };
      }
      const nextDue = shiftOutOfSleep(last.takenAt + r.intervalH * HOUR, settings.wakeTime, settings.sleepTime);
      const dayDone = countToday >= r.maxPerDay;
      const lockEnd = Math.max(last.takenAt + r.minIntervalH * HOUR, dayDone ? nextTreatmentDayStart(now) : 0);
      if (lockEnd > now) {
        return {
          ...base, course, level: 'red', label: 'נעול – להמתין למרווח בטיחות',
          detail: dayDone
            ? `הושלמו ${r.maxPerDay} מנות היום. המנה הבאה ${when(nextDue, now)}`
            : `מוקדם מדי – לפחות ${r.minIntervalH} שעות בין מנות (מניעת מנה כפולה). המנה הבאה ${when(nextDue, now)}`,
          lockedUntil: lockEnd, nextDueAt: nextDue, countdownTo: nextDue,
          countdownLabel: 'עד המנה הבאה', overdue: false, reminderAt: nextDue,
        };
      }
      if (now < nextDue) {
        return {
          ...base, course, level: 'green', label: 'ממתין למועד המנה הבאה',
          detail: `המנה הבאה מתוכננת ${when(nextDue, now)}. ניתן ליטול מעט מוקדם עם ארוחה`,
          lockedUntil: null, nextDueAt: nextDue, countdownTo: nextDue,
          countdownLabel: 'עד המנה הבאה', overdue: false, reminderAt: nextDue,
        };
      }
      const overdue = now > nextDue + r.overdueGraceH * HOUR;
      return {
        ...base, course, level: 'yellow', label: 'זמן מנה מומלץ',
        detail: overdue
          ? `המנה באיחור של ${fmtDuration(now - nextDue)}. קח כשנזכרת, עם ארוחה; אם המנה הבאה בעוד פחות מ-4 שעות – דלג. לעולם אל תכפיל מנה.`
          : `טבליה ${taken + 1} מתוך ${r.courseTotal} – עם ארוחה וכוס מים`,
        lockedUntil: null, nextDueAt: nextDue, countdownTo: null, overdue, reminderAt: nextDue,
      };
    }

    case 'moxypen':
      // Archived – replaced by Augmentin. Kept only so old history entries still render.
      return {
        ...base, level: 'red', label: 'הוחלף – בארכיון',
        detail: 'מוקסיפן הוחלף באוגמנטין 875 מ״ג ב-26.11.2026',
        lockedUntil: null, nextDueAt: null, countdownTo: null, overdue: false, reminderAt: null,
      };
  }
}

// ─────────────────────────── Validation ───────────────────────────

/**
 * Hard guardrails applied when logging or editing a dose.
 * `excludeId` lets an edited entry be validated against all the others.
 */
export function validateIntake(
  medId: MedId, doses: DoseEntry[], takenAt: number, now: number, settings: Settings, excludeId?: string,
): ValidationResult {
  if (takenAt > now + 5 * MIN) {
    return { ok: false, reason: 'לא ניתן לרשום נטילה בזמן עתידי' };
  }
  const others = dosesFor(doses, medId, excludeId);
  const nearest = (withinMs: number) =>
    others.find((d) => Math.abs(d.takenAt - takenAt) < withinMs);
  const warnings: string[] = [];

  switch (medId) {
    case 'arcoxia': {
      const c = nearest(RULES.arcoxia.intervalH * HOUR);
      if (c) {
        return {
          ok: false,
          reason: `ארקוקסיה כבר נרשמה ${when(c.takenAt, now)}. מותרת טבליה אחת בלבד ב-24 שעות.`,
          until: c.takenAt < takenAt ? c.takenAt + DAY : undefined,
        };
      }
      return { ok: true, warnings };
    }

    case 'rokacet': {
      const minMs = rokacetMinMs(settings);
      const c = nearest(minMs);
      if (c) {
        return {
          ok: false,
          reason: `מרווח מינימלי של ${minMs / HOUR} שעות בין מנות. מנה קודמת נרשמה ${when(c.takenAt, now)}.`,
          until: c.takenAt < takenAt ? c.takenAt + minMs : undefined,
        };
      }
      const max = RULES.rokacet.maxPer24h;
      const times = [...others.map((d) => d.takenAt), takenAt].sort((a, b) => a - b);
      // Any rolling 24h window that contains the new dose must hold ≤ max doses.
      for (const start of times) {
        if (start > takenAt || start + DAY <= takenAt) continue;
        const n = times.filter((t) => t >= start && t < start + DAY).length;
        if (n > max) {
          const inWin = times.filter((t) => t > takenAt - DAY && t < takenAt);
          const until = inWin.length >= max ? inWin[inWin.length - max] + DAY : undefined;
          return {
            ok: false,
            reason: `הגעת למקסימום של ${max} טבליות רוקסט פלוס ב-24 שעות. אין ליטול טבליה נוספת.`,
            until,
          };
        }
      }
      const close = nearest(RULES.rokacet.recommendedIntervalH * HOUR);
      if (close) warnings.push(`המרווח המומלץ הוא ${RULES.rokacet.recommendedIntervalH} שעות – מנה קודמת ${when(close.takenAt, now)}`);
      warnings.push('עלול לטשטש – להימנע מנהיגה ומהפעלת מכונות');
      return { ok: true, warnings };
    }

    case 'augmentin': {
      const r = RULES.augmentin;
      if (others.length >= r.courseTotal) {
        return { ok: false, reason: `כבר נרשמו כל ${r.courseTotal} טבליות האוגמנטין – הטיפול הושלם.` };
      }
      const c = nearest(r.minIntervalH * HOUR);
      if (c) {
        return {
          ok: false,
          reason: `מנה קודמת נרשמה ${when(c.takenAt, now)}. אין להכפיל מנה – מרווח מינימלי ${r.minIntervalH} שעות.`,
          until: c.takenAt < takenAt ? c.takenAt + r.minIntervalH * HOUR : undefined,
        };
      }
      const key = treatmentDayKey(takenAt);
      if (others.filter((d) => treatmentDayKey(d.takenAt) === key).length >= r.maxPerDay) {
        return { ok: false, reason: `כבר נרשמו ${r.maxPerDay} מנות אוגמנטין ליום זה. אין ליטול מנה נוספת.` };
      }
      const close = nearest(r.intervalH * HOUR);
      if (close) warnings.push(`מוקדם מהמרווח המומלץ (${r.intervalH} שעות) – מנה קודמת ${when(close.takenAt, now)}`);
      return { ok: true, warnings };
    }

    case 'moxypen':
      return { ok: false, reason: 'מוקסיפן הוחלף באוגמנטין 875 מ״ג (26.11.2026) ואינו חלק מהטיפול הפעיל. אין ליטול את שניהם.' };
  }
}

// ─────────────────────────── Adherence ────────────────────────────

export interface AdherenceDay {
  key: string;
  count: number;
  expected: number;
  isToday: boolean;
  isFirstDay: boolean;
  missed: number;
}

/** Per-treatment-day antibiotic adherence, oldest → newest (max `days` entries). */
export function antibioticAdherence(doses: DoseEntry[], now: number, days = 7): AdherenceDay[] {
  const list = dosesFor(doses, 'augmentin').filter((d) => d.takenAt <= now + MIN);
  if (list.length === 0) return [];
  const expected = RULES.augmentin.maxPerDay;
  const firstKey = treatmentDayKey(list[list.length - 1].takenAt);
  // Once the course is complete, the day of the last tablet is the end of the strip.
  const lastKey = list.length >= RULES.augmentin.courseTotal ? treatmentDayKey(list[0].takenAt) : null;
  const todayKey = treatmentDayKey(now);
  const counts = new Map<string, number>();
  for (const d of list) {
    const k = treatmentDayKey(d.takenAt);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const out: AdherenceDay[] = [];
  for (let i = 0; i < 60 && out.length < days; i++) {
    // Midday of the i-th previous treatment day avoids DST edge cases.
    const k = treatmentDayKey(now - i * DAY);
    if (lastKey && k > lastKey) continue;
    const count = counts.get(k) ?? 0;
    const isToday = k === todayKey;
    const isFirstDay = k === firstKey;
    out.unshift({
      key: k, count, expected, isToday, isFirstDay,
      missed: isToday || isFirstDay || k === lastKey ? 0 : Math.max(0, expected - count),
    });
    if (k === firstKey) break;
  }
  return out;
}
