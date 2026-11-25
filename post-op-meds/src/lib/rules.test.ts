import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, evaluateStatus, moxypenAdherence, validateIntake } from './rules';
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

describe('Moxypen', () => {
  it('is due when not started', () => {
    expect(evaluateStatus('moxypen', [], at(25, 8), S).level).toBe('yellow');
  });
  it('schedules next dose 6h later and locks for 4h', () => {
    const doses = [dose('moxypen', at(25, 8))];
    const early = evaluateStatus('moxypen', doses, at(25, 10), S);
    expect(early.level).toBe('red');
    expect(early.nextDueAt).toBe(at(25, 14));
    expect(evaluateStatus('moxypen', doses, at(25, 13), S).level).toBe('green');
    expect(evaluateStatus('moxypen', doses, at(25, 14), S).level).toBe('yellow');
  });
  it('flags overdue doses without suggesting a double dose', () => {
    const doses = [dose('moxypen', at(25, 8))];
    const s = evaluateStatus('moxypen', doses, at(25, 17), S);
    expect(s.overdue).toBe(true);
    expect(s.detail).toContain('אל תכפיל');
  });
  it('pushes the next dose out of sleep hours', () => {
    const doses = [dose('moxypen', at(25, 20))];
    expect(evaluateStatus('moxypen', doses, at(25, 21), S).nextDueAt).toBe(at(26, 7));
  });
  it('blocks a 4th dose on the same treatment day', () => {
    const doses = [8, 14, 20].map((h) => dose('moxypen', at(25, h)));
    expect(validateIntake('moxypen', doses, at(25, 23, 30), at(25, 23, 30), S).ok).toBe(false);
    const s = evaluateStatus('moxypen', doses, at(25, 23), S);
    expect(s.level).toBe('red');
    expect(s.nextDueAt).toBe(at(26, 7));
  });
  it('reports missed doses on past days', () => {
    const doses = [dose('moxypen', at(24, 8)), dose('moxypen', at(25, 8)), dose('moxypen', at(25, 14)), dose('moxypen', at(26, 8))];
    const days = moxypenAdherence(doses, at(26, 9));
    expect(days.map((d) => d.missed)).toEqual([0, 1, 0]);
  });
});
