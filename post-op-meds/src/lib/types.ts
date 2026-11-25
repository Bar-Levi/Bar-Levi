export type MedId = 'arcoxia' | 'rokacet' | 'moxypen';

export interface DoseEntry {
  id: string;
  medId: MedId;
  /** Epoch ms – when the tablet was actually taken. */
  takenAt: number;
  /** Taken with food / water / stomach protection. */
  withFood: boolean;
  note?: string;
  /** Epoch ms – when the entry was recorded (drives the 60s undo window). */
  createdAt: number;
  editedAt?: number;
}

export interface Settings {
  /** "HH:MM" – start of awake hours (scheduled reminders are not fired before this). */
  wakeTime: string;
  /** "HH:MM" – start of sleep hours. */
  sleepTime: string;
  /** Minimum hours between Rokacet Plus doses (4–6, per prescription). */
  rokacetMinHours: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  /** Notify when Rokacet Plus becomes permitted again (PRN, so optional). */
  notifyRokacet: boolean;
}

export type StatusLevel = 'green' | 'yellow' | 'red';

export interface MedStatus {
  medId: MedId;
  level: StatusLevel;
  /** Short Hebrew status label. */
  label: string;
  /** Extra explanation shown under the label. */
  detail?: string;
  lastDose?: DoseEntry;
  /** When the safety lock lifts (null = not locked). */
  lockedUntil: number | null;
  /** Recommended time of next dose for scheduled meds (null for PRN). */
  nextDueAt: number | null;
  /** The time the card's countdown counts to, and what it means. */
  countdownTo: number | null;
  countdownLabel?: string;
  /** Doses in the rolling last 24h. */
  count24h: number;
  /** Doses in the current treatment day (day boundary 04:00). */
  countToday: number;
  /** Scheduled dose is overdue (adherence flag). */
  overdue: boolean;
  /** Time at which a reminder should fire (null = nothing to remind). */
  reminderAt: number | null;
}

export type ValidationResult =
  | { ok: true; warnings: string[] }
  | { ok: false; reason: string; until?: number };
