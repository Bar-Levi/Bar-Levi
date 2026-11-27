import { DEFAULT_SETTINGS } from './rules';
import type { DoseEntry, MedId, Settings } from './types';

export const STORAGE_KEY = 'postop-meds:v1';
const FIRED_KEY = 'postop-meds:fired-reminders';
const MED_IDS: MedId[] = ['arcoxia', 'rokacet', 'augmentin', 'moxypen'];

export interface PersistedState {
  version: 1;
  doses: DoseEntry[];
  settings: Settings;
  /** One-time data migrations already applied on this device. */
  migrations?: string[];
}

/**
 * Regimen change of 26.11.2026: Moxypen → Augmentin 875 mg BID.
 * Seeds the two Augmentin doses already taken (Israel time, UTC+2 in November)
 * exactly once per device. Existing Moxypen entries stay as archived history.
 */
export const AUGMENTIN_SEED_ID = 'regimen-2026-11-26-augmentin';
export const AUGMENTIN_SEED_DOSES: DoseEntry[] = [
  { id: 'seed-augmentin-2026-11-26-1900', medId: 'augmentin', takenAt: Date.UTC(2026, 10, 26, 17, 0), withFood: true, note: 'הוזן מראש – מנה ראשונה', createdAt: 0 },
  { id: 'seed-augmentin-2026-11-27-0800', medId: 'augmentin', takenAt: Date.UTC(2026, 10, 27, 6, 0), withFood: true, note: 'הוזן מראש', createdAt: 0 },
];

export function applyMigrations(state: PersistedState): PersistedState {
  const done = new Set(state.migrations ?? []);
  if (done.has(AUGMENTIN_SEED_ID)) return state;
  // Skip a seed dose if the user already logged Augmentin within 2h of it.
  const toAdd = AUGMENTIN_SEED_DOSES.filter((seed) => !state.doses.some(
    (d) => d.id === seed.id || (d.medId === 'augmentin' && Math.abs(d.takenAt - seed.takenAt) < 2 * 3600e3),
  ));
  return {
    ...state,
    doses: [...state.doses, ...toAdd],
    migrations: [...done, AUGMENTIN_SEED_ID],
  };
}

function isDose(x: unknown): x is DoseEntry {
  const d = x as DoseEntry;
  return !!d && typeof d.id === 'string' && MED_IDS.includes(d.medId)
    && typeof d.takenAt === 'number' && Number.isFinite(d.takenAt);
}

/** Validate + normalise anything that claims to be app state (localStorage or an imported file). */
export function sanitizeState(raw: unknown): PersistedState {
  const obj = (raw ?? {}) as Partial<PersistedState>;
  const doses = Array.isArray(obj.doses)
    ? obj.doses.filter(isDose).map((d) => ({
      id: d.id, medId: d.medId, takenAt: d.takenAt, withFood: !!d.withFood,
      note: typeof d.note === 'string' ? d.note.slice(0, 500) : undefined,
      createdAt: typeof d.createdAt === 'number' ? d.createdAt : d.takenAt,
      editedAt: typeof d.editedAt === 'number' ? d.editedAt : undefined,
    }))
    : [];
  const settings: Settings = { ...DEFAULT_SETTINGS, ...(obj.settings ?? {}) };
  const migrations = Array.isArray(obj.migrations) ? obj.migrations.filter((m): m is string => typeof m === 'string') : [];
  return { version: 1, doses, settings, migrations };
}

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return applyMigrations(sanitizeState(JSON.parse(raw)));
  } catch { /* corrupted or blocked storage – start fresh */ }
  return applyMigrations({ version: 1, doses: [], settings: { ...DEFAULT_SETTINGS } });
}

export function saveState(state: PersistedState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Keys of reminders already fired, so reloads don't re-notify. */
export function loadFired(): Set<string> {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function saveFired(keys: Set<string>) {
  try {
    localStorage.setItem(FIRED_KEY, JSON.stringify([...keys].slice(-100)));
  } catch { /* ignore */ }
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Ask the browser not to evict our data (best effort). */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch { /* ignore */ }
}
