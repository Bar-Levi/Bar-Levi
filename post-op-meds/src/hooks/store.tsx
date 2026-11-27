import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { STORAGE_KEY, loadState, newId, saveState, sanitizeState, type PersistedState } from '../lib/storage';
import type { DoseEntry, MedId, Settings } from '../lib/types';

type Action =
  | { type: 'add'; dose: DoseEntry }
  | { type: 'update'; id: string; patch: Partial<Pick<DoseEntry, 'takenAt' | 'withFood' | 'note'>> }
  | { type: 'remove'; id: string }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'replace'; state: PersistedState };

function reducer(state: PersistedState, a: Action): PersistedState {
  switch (a.type) {
    case 'add':
      return { ...state, doses: [...state.doses, a.dose] };
    case 'update':
      return {
        ...state,
        doses: state.doses.map((d) => (d.id === a.id ? { ...d, ...a.patch, editedAt: Date.now() } : d)),
      };
    case 'remove':
      return { ...state, doses: state.doses.filter((d) => d.id !== a.id) };
    case 'settings':
      return { ...state, settings: { ...state.settings, ...a.patch } };
    case 'replace':
      return a.state;
  }
}

interface Store {
  state: PersistedState;
  addDose: (medId: MedId, takenAt: number, withFood: boolean, note?: string) => DoseEntry;
  updateDose: (id: string, patch: Partial<Pick<DoseEntry, 'takenAt' | 'withFood' | 'note'>>) => void;
  removeDose: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceState: (raw: unknown) => void;
  persistError: boolean;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const persistError = useRef(false);
  const fromOtherTab = useRef(false);

  useEffect(() => {
    if (fromOtherTab.current) { fromOtherTab.current = false; return; }
    persistError.current = !saveState(state);
  }, [state]);

  // Keep multiple open tabs / the installed app and a browser tab in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        fromOtherTab.current = true;
        dispatch({ type: 'replace', state: sanitizeState(JSON.parse(e.newValue)) });
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addDose = useCallback((medId: MedId, takenAt: number, withFood: boolean, note?: string) => {
    const dose: DoseEntry = { id: newId(), medId, takenAt, withFood, note: note?.trim() || undefined, createdAt: Date.now() };
    dispatch({ type: 'add', dose });
    return dose;
  }, []);
  const updateDose = useCallback<Store['updateDose']>((id, patch) => dispatch({ type: 'update', id, patch }), []);
  const removeDose = useCallback((id: string) => dispatch({ type: 'remove', id }), []);
  const updateSettings = useCallback((patch: Partial<Settings>) => dispatch({ type: 'settings', patch }), []);
  const replaceState = useCallback((raw: unknown) => dispatch({ type: 'replace', state: sanitizeState(raw) }), []);

  const value = useMemo<Store>(() => ({
    state, addDose, updateDose, removeDose, updateSettings, replaceState, persistError: persistError.current,
  }), [state, addDose, updateDose, removeDose, updateSettings, replaceState]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside <StoreProvider>');
  return s;
}
