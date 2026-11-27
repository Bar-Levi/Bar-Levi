import { Ban, Bell, BellOff, History as HistoryIcon, LayoutDashboard, Settings as SettingsIcon, Stethoscope } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdherenceStrip } from './components/Adherence';
import { DueBanner, NotificationSetup, SafetyStrip } from './components/Banners';
import { EditDoseDialog, IntakeDialog } from './components/DoseDialogs';
import { ExportPanel, HistoryView, UNDO_WINDOW_MS } from './components/History';
import { MedicationCard } from './components/MedicationCard';
import { NsaidGuard } from './components/NsaidGuard';
import { RedFlags } from './components/RedFlags';
import { SettingsView } from './components/SettingsView';
import { UndoToast } from './components/UndoToast';
import { useStore } from './hooks/store';
import { useNow } from './hooks/useNow';
import { useReminders } from './hooks/useReminders';
import { notificationCapability, unlockAudio, type NotifyCapability } from './lib/alerts';
import { ACTIVE_MEDS, MEDICATIONS } from './lib/medications';
import { DEFAULT_SETTINGS, evaluateStatus, antibioticAdherence } from './lib/rules';
import { requestPersistentStorage } from './lib/storage';
import { fmtFullDate } from './lib/time';
import type { DoseEntry, MedId } from './lib/types';

type Tab = 'dashboard' | 'history' | 'settings';
const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
  { id: 'history', label: 'היסטוריה', icon: HistoryIcon },
  { id: 'settings', label: 'הגדרות', icon: SettingsIcon },
];

export default function App() {
  const { state, addDose, updateDose, removeDose, updateSettings, replaceState } = useStore();
  const { doses, settings } = state;
  const now = useNow(1000);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [intakeMed, setIntakeMed] = useState<MedId | null>(null);
  const [editing, setEditing] = useState<DoseEntry | null>(null);
  const [lastAdded, setLastAdded] = useState<DoseEntry | null>(null);
  const [capability, setCapability] = useState<NotifyCapability>(notificationCapability);

  const statuses = useMemo(
    () => ACTIVE_MEDS.map((id) => evaluateStatus(id, doses, now, settings)),
    [doses, now, settings],
  );
  const adherence = useMemo(() => antibioticAdherence(doses, now), [doses, now]);
  const { lastFired, dismissLastFired, pushState } = useReminders(statuses, settings, now, capability);

  useEffect(() => { void requestPersistentStorage(); }, []);
  // Browsers only allow audio after a user gesture – unlock on the first tap.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);
  // Re-check permission when returning to the app (user may have changed it in settings).
  useEffect(() => {
    const onVis = () => document.visibilityState === 'visible' && setCapability(notificationCapability());
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const dueCount = statuses.filter((s) => s.level === 'yellow' && s.lastDose && s.medId !== 'rokacet').length;
  useEffect(() => {
    document.title = dueCount > 0 ? `(${dueCount}) ⏰ הגיע זמן תרופה` : 'מעקב תרופות אחרי ניתוח';
  }, [dueCount]);

  const confirmIntake = useCallback((medId: MedId, takenAt: number, withFood: boolean, note: string) => {
    const d = addDose(medId, takenAt, withFood, note);
    setLastAdded(d);
    setIntakeMed(null);
    dismissLastFired();
  }, [addDose, dismissLastFired]);

  const undo = useCallback((d: DoseEntry) => {
    if (Date.now() - d.createdAt > UNDO_WINDOW_MS) return;
    removeDose(d.id);
    setLastAdded((cur) => (cur?.id === d.id ? null : cur));
  }, [removeDose]);

  return (
    <div className="mx-auto min-h-dvh max-w-2xl pb-28">
      <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="rounded-xl bg-blue-600 p-1.5 text-white"><Stethoscope className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold leading-tight">מעקב תרופות אחרי ניתוח</h1>
            <p className="truncate text-xs text-slate-500">{fmtFullDate(now)}</p>
          </div>
        </div>
        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${capability === 'granted' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {capability === 'granted' ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
          {capability === 'granted' ? 'התראות פעילות' : 'באנרים בלבד'}
        </span>
      </header>

      <main className="space-y-4 px-4 pt-4">
        {tab === 'dashboard' && (
          <>
            <SafetyStrip />
            <NotificationSetup capability={capability} onChange={setCapability} />
            <DueBanner statuses={statuses} onLog={setIntakeMed}
              flashMedId={lastFired?.medId ?? null} onDismissFlash={dismissLastFired} />
            {statuses.map((s) => (
              <MedicationCard
                key={s.medId} def={MEDICATIONS[s.medId]} status={s} now={now}
                onLog={() => setIntakeMed(s.medId)}
                footer={
                  s.medId === 'augmentin' ? <AdherenceStrip days={adherence} />
                    : s.medId === 'arcoxia' ? (
                      <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                        <Ban className="h-4 w-4 shrink-0" /> אסור לשלב עם נורופן / איבופרופן
                      </div>
                    ) : null
                }
              />
            ))}
            <NsaidGuard />
            <RedFlags />
            <p className="px-2 pb-2 text-center text-xs leading-relaxed text-slate-500">
              האפליקציה היא כלי עזר למעקב בלבד ואינה מחליפה ייעוץ רפואי. יש לפעול לפי הוראות הרופא/המנתח והעלון לצרכן.
              הנתונים נשמרים רק במכשיר זה.
            </p>
          </>
        )}

        {tab === 'history' && (
          <>
            <ExportPanel state={state} onImport={replaceState} />
            <HistoryView doses={doses} now={now} onEdit={setEditing} onUndo={undo} />
          </>
        )}

        {tab === 'settings' && (
          <SettingsView
            settings={settings} onChange={updateSettings} pushState={pushState} capability={capability} onCapability={setCapability}
            onClearAll={() => replaceState({ doses: [], settings: DEFAULT_SETTINGS, migrations: state.migrations })}
          />
        )}
      </main>

      <UndoToast dose={lastAdded} now={now} onUndo={() => lastAdded && undo(lastAdded)} onClose={() => setLastAdded(null)} />

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="ניווט ראשי">
        <div className="mx-auto grid max-w-2xl grid-cols-3">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => { setTab(id); window.scrollTo({ top: 0 }); }}
              aria-current={tab === id ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${tab === id ? 'text-blue-600' : 'text-slate-500'}`}>
              <Icon className="h-6 w-6" />
              {label}
              {id === 'dashboard' && dueCount > 0 && (
                <span className="absolute top-1.5 left-1/2 ml-3 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
            </button>
          ))}
        </div>
      </nav>

      <IntakeDialog medId={intakeMed} doses={doses} settings={settings} now={now}
        onClose={() => setIntakeMed(null)} onConfirm={confirmIntake} />
      <EditDoseDialog
        dose={editing} doses={doses} settings={settings} now={now} onClose={() => setEditing(null)}
        onSave={(id, patch) => { updateDose(id, patch); setEditing(null); }}
        onDelete={(id) => { removeDose(id); setEditing(null); setLastAdded((c) => (c?.id === id ? null : c)); }}
      />
    </div>
  );
}
