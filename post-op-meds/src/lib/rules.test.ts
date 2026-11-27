import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, antibioticAdherence, evaluateStatus, validateIntake } from './rules';
import { AUGMENTIN_SEED_DOSES, AUGMENTIN_SEED_ID, applyMigrations } from './storage';
import { HOUR } from './time';
import type { DoseEntry, MedId } from './types';

const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m).getTime();
let n = 0;
const dose = (medId: MedId, takenAt: number): DoseEntry => ({
  id: `d${++n}`, medId, takenAt, withFood: true, createdAt: takenAt,
});
const S = DEFAULT_SETTINGS;

describe('Arcoxia', () => {
  it('is due when never taken', () => {
    expect(evaluateStatus('arcoxia', [], at(25, 8), S).level).toBe('yellow');
  });
  it('locks for 24h after a dose', () => {
    const doses = [dose('arcoxia', at(25, 8))];
    const s = evaluateStatus('arcoxia', doses, at(25, 20), S);
    expect(s.level).toBe('red');
    expect(s.lockedUntil).toBe(at(26, 8));
    expect(evaluateStatus('arcoxia', doses, at(26, 8, 1), S).level).toBe('yellow');
  });
  it('blocks a second tablet within 24h', () => {
    const doses = [dose('arcoxia', at(25, 8))];
    expect(validateIntake('arcoxia', doses, at(26, 7), at(26, 7), S).ok).toBe(false);
    expect(validateIntake('arcoxia', doses, at(26, 8), at(26, 8), S).ok).toBe(true);
  });
  it('blocks future entries', () => {
    expect(validateIntake('arcoxia', [], at(25, 12), at(25, 8), S).ok).toBe(false);
  });
});

describe('Rokacet Plus', () => {
  it('is green (PRN) when never taken', () => {
    expect(evaluateStatus('rokacet', [], at(25, 8), S).level).toBe('green');
  });
  it('enforces the minimum interval', () => {
    const doses = [dose('rokacet', at(25, 8))];
    expect(evaluateStatus('rokacet', doses, at(25, 11), S).level).toBe('red');
    expect(evaluateStatus('rokacet', doses, at(25, 12), S).level).toBe('green');
    expect(validateIntake('rokacet', doses, at(25, 11), at(25, 11), S).ok).toBe(false);
    const six = { ...S, rokacetMinHours: 6 };
    expect(validateIntake('rokacet', doses, at(25, 13), at(25, 13), six).ok).toBe(false);
  });
  it('warns (but allows) between min and recommended interval', () => {
    const doses = [dose('rokacet', at(25, 8))];
    const r = validateIntake('rokacet', doses, at(25, 13), at(25, 13), S);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.some((w) => w.includes('6 שעות'))).toBe(true);
  });
  it('caps at 4 tablets in a rolling 24h window', () => {
    const doses = [8, 12, 16, 20].map((h) => dose('rokacet', at(25, h)));
    const s = evaluateStatus('rokacet', doses, at(26, 1), S);
    expect(s.level).toBe('red');
    expect(s.lockedUntil).toBe(at(26, 8)); // first dose leaves the window
    const r = validateIntake('rokacet', doses, at(26, 1), at(26, 1), S);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.until).toBe(at(26, 8));
    expect(validateIntake('rokacet', doses, at(26, 8), at(26, 8), S).ok).toBe(true);
  });
  it('catches a backdated entry that breaks the window', () => {
    const doses = [0, 5, 10, 15].map((h) => dose('rokacet', at(25, 2) + h * HOUR));
    // 22:00 is ≥4h after 17:00 but would be the 5th dose within 24h of 02:00.
    expect(validateIntake('rokacet', doses, at(25, 22), at(25, 23), S).ok).toBe(false);
  });
});

describe('Augmentin 875 BID', () => {
  it('is due when not started', () => {
    expect(evaluateStatus('augmentin', [], at(25, 8), S).level).toBe('yellow');
  });
  it('schedules every 12h and locks for 8h', () => {
    const doses = [dose('augmentin', at(26, 19))];
    const early = evaluateStatus('augmentin', doses, at(27, 2), S);
    expect(early.level).toBe('red');
    expect(early.nextDueAt).toBe(at(27, 7));
    expect(evaluateStatus('augmentin', doses, at(27, 6), S).level).toBe('green');
    expect(evaluateStatus('augmentin', doses, at(27, 7), S).level).toBe('yellow');
    expect(validateIntake('augmentin', doses, at(27, 1), at(27, 1), S).ok).toBe(false);
  });
  it('tracks the 14-tablet course', () => {
    const doses = [dose('augmentin', at(26, 19)), dose('augmentin', at(27, 8))];
    const s = evaluateStatus('augmentin', doses, at(27, 9), S);
    expect(s.course).toMatchObject({ taken: 2, total: 14 });
    expect(s.course?.endsAt).toBe(at(26, 19) + 13 * 12 * HOUR);
  });
  it('completes after 14 tablets and blocks a 15th', () => {
    const doses = Array.from({ length: 14 }, (_, i) => dose('augmentin', at(20, 8) + i * 12 * HOUR));
    const end = at(20, 8) + 13 * 12 * HOUR;
    expect(evaluateStatus('augmentin', doses, end + 13 * HOUR, S).label).toContain('הושלם');
    expect(evaluateStatus('augmentin', doses, end + 13 * HOUR, S).reminderAt).toBeNull();
    expect(validateIntake('augmentin', doses, end + 13 * HOUR, end + 13 * HOUR, S).ok).toBe(false);
  });
  it('flags overdue doses without suggesting a double dose', () => {
    const s = evaluateStatus('augmentin', [dose('augmentin', at(27, 8))], at(27, 23, 30), { ...S, sleepTime: '23:59' });
    expect(s.overdue).toBe(true);
    expect(s.detail).toContain('אל תכפיל');
  });
  it('blocks a 3rd dose on the same treatment day', () => {
    const doses = [dose('augmentin', at(27, 8)), dose('augmentin', at(27, 16, 30))];
    expect(validateIntake('augmentin', doses, at(28, 1), at(28, 1), S).ok).toBe(false);
  });
  it('reports missed doses on past days', () => {
    const doses = [dose('augmentin', at(25, 20)), dose('augmentin', at(26, 8)), dose('augmentin', at(27, 8)), dose('augmentin', at(27, 20))];
    expect(antibioticAdherence(doses, at(28, 7)).map((d) => d.missed)).toEqual([0, 1, 0, 0]);
  });
});

describe('Moxypen (archived)', () => {
  it('can no longer be logged and never reminds', () => {
    expect(validateIntake('moxypen', [], at(27, 9), at(27, 9), S).ok).toBe(false);
    expect(evaluateStatus('moxypen', [dose('moxypen', at(26, 8))], at(27, 9), S).reminderAt).toBeNull();
  });
});

describe('Regimen migration 26.11.2026', () => {
  const base = { version: 1 as const, doses: [dose('moxypen', at(26, 8))], settings: S };
  it('seeds the two Augmentin doses once, keeping Moxypen history', () => {
    const m = applyMigrations(base);
    expect(m.doses.filter((d) => d.medId === 'augmentin').map((d) => new Date(d.takenAt).toISOString()))
      .toEqual(['2026-11-26T17:00:00.000Z', '2026-11-27T06:00:00.000Z']);
    expect(m.doses.some((d) => d.medId === 'moxypen')).toBe(true);
    expect(m.migrations).toContain(AUGMENTIN_SEED_ID);
    // Running again (or after the user deletes a seeded entry) never re-adds.
    const again = applyMigrations({ ...m, doses: m.doses.slice(0, 2) });
    expect(again.doses).toHaveLength(2);
  });
  it('does not duplicate doses the user already logged', () => {
    const existing = dose('augmentin', AUGMENTIN_SEED_DOSES[0].takenAt + 10 * 60_000);
    const m = applyMigrations({ ...base, doses: [existing] });
    expect(m.doses.filter((d) => d.medId === 'augmentin')).toHaveLength(2);
  });
});
