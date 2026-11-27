import { AlertTriangle, Ban, Car, Check, Info, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { MEDICATIONS } from '../lib/medications';
import { validateIntake } from '../lib/rules';
import { fmtRelativeDay, fmtTime, fromLocalInput, toLocalInput } from '../lib/time';
import type { DoseEntry, MedId, Settings } from '../lib/types';
import { Callout, Modal, Toggle, btn } from './ui';

interface FormState { takenAt: number; customTime: boolean; withFood: boolean; note: string }

function DoseFields({ medId, form, setForm, now, allowNowToggle }: {
  medId: MedId; form: FormState; setForm: (f: FormState) => void; now: number; allowNowToggle: boolean;
}) {
  const med = MEDICATIONS[medId];
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-slate-50 p-3 text-sm">
        <div className="font-bold">{med.brand}</div>
        <div className="text-slate-600">{med.ingredients}</div>
        <div className="mt-1 text-slate-600">{med.dosage}</div>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-bold">מתי נלקח?</legend>
        {allowNowToggle && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setForm({ ...form, customTime: false })}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${!form.customTime ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200'}`}>
              עכשיו (<span className="tabular">{fmtTime(now)}</span>)
            </button>
            <button type="button" onClick={() => setForm({ ...form, customTime: true, takenAt: form.customTime ? form.takenAt : now })}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${form.customTime ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200'}`}>
              בשעה אחרת
            </button>
          </div>
        )}
        {(form.customTime || !allowNowToggle) && (
          <input
            type="datetime-local" value={toLocalInput(form.takenAt)} max={toLocalInput(now)}
            onChange={(e) => { const t = fromLocalInput(e.target.value); if (t) setForm({ ...form, takenAt: t }); }}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base tabular"
            aria-label="שעת נטילה"
          />
        )}
      </fieldset>

      <Toggle
        checked={form.withFood}
        onChange={(v) => setForm({ ...form, withFood: v })}
        label={<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-600" />נלקח עם אוכל / מים להגנה על הקיבה</span>}
        description={med.foodHint ?? 'מומלץ לשתות כוס מים מלאה'}
      />
      {med.requiresFood && !form.withFood && (
        <Callout tone="amber" icon={<AlertTriangle className="h-4 w-4" />}>
          {med.name} על קיבה ריקה מגבירה סיכון לצרבת, בחילה ופגיעה בקיבה. מומלץ לאכול משהו לפני הנטילה.
        </Callout>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-bold">הערה (לא חובה)</span>
        <input
          type="text" value={form.note} maxLength={200} placeholder="למשל: כאב 7/10, נפיחות קלה"
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
        />
      </label>
    </div>
  );
}

function ValidationView({ result, now }: { result: ReturnType<typeof validateIntake>; now: number }) {
  if (!result.ok) {
    return (
      <Callout tone="red" icon={<Ban className="h-5 w-5" />}>
        <div className="font-extrabold">לא ניתן לרשום – חסימת בטיחות</div>
        <div>{result.reason}</div>
        {result.until && result.until > now && (
          <div className="mt-1 font-semibold">מותר שוב {fmtRelativeDay(result.until, now)} ב-<span className="tabular">{fmtTime(result.until)}</span></div>
        )}
      </Callout>
    );
  }
  if (result.warnings.length === 0) return null;
  return (
    <div className="space-y-2">
      {result.warnings.map((w) => (
        <Callout key={w} tone="amber" icon={w.includes('נהיגה') ? <Car className="h-4 w-4" /> : <Info className="h-4 w-4" />}>{w}</Callout>
      ))}
    </div>
  );
}

export function IntakeDialog({ medId, doses, settings, now, onClose, onConfirm }: {
  medId: MedId | null; doses: DoseEntry[]; settings: Settings; now: number;
  onClose: () => void; onConfirm: (medId: MedId, takenAt: number, withFood: boolean, note: string) => void;
}) {
  const [form, setForm] = useState<FormState>({ takenAt: now, customTime: false, withFood: true, note: '' });
  useEffect(() => {
    if (medId) setForm({ takenAt: Date.now(), customTime: false, withFood: true, note: '' });
  }, [medId]);

  const takenAt = form.customTime ? form.takenAt : now;
  const result = useMemo(
    () => (medId ? validateIntake(medId, doses, takenAt, now, settings) : { ok: true as const, warnings: [] }),
    [medId, doses, takenAt, now, settings],
  );
  if (!medId) return null;
  const med = MEDICATIONS[medId];

  return (
    <Modal open onClose={onClose} title={`רישום נטילה – ${med.name}`}>
      <div className="space-y-4">
        <DoseFields medId={medId} form={form} setForm={setForm} now={now} allowNowToggle />
        <ValidationView result={result} now={now} />
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button type="button" className={btn.secondary} onClick={onClose}>ביטול</button>
          <button
            type="button" className={btn.primary} disabled={!result.ok}
            onClick={() => onConfirm(medId, takenAt, form.withFood, form.note)}
          >
            <Check className="h-5 w-5" /> {med.requiresFood && !form.withFood ? 'רשום (ללא אוכל)' : 'אישור – נטלתי'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function EditDoseDialog({ dose, doses, settings, now, onClose, onSave, onDelete }: {
  dose: DoseEntry | null; doses: DoseEntry[]; settings: Settings; now: number; onClose: () => void;
  onSave: (id: string, patch: { takenAt: number; withFood: boolean; note?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState<FormState>({ takenAt: now, customTime: true, withFood: true, note: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (dose) setForm({ takenAt: dose.takenAt, customTime: true, withFood: dose.withFood, note: dose.note ?? '' });
    setConfirmDelete(false);
  }, [dose]);
  const result = useMemo(
    () => (dose ? validateIntake(dose.medId, doses, form.takenAt, now, settings, dose.id) : { ok: true as const, warnings: [] }),
    [dose, doses, form.takenAt, now, settings],
  );
  if (!dose) return null;

  return (
    <Modal open onClose={onClose} title={`עריכת רישום – ${MEDICATIONS[dose.medId].name}`}>
      <div className="space-y-4">
        <DoseFields medId={dose.medId} form={form} setForm={setForm} now={now} allowNowToggle={false} />
        <ValidationView result={result} now={now} />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={btn.secondary} onClick={onClose}>ביטול</button>
          <button type="button" className={btn.primary} disabled={!result.ok}
            onClick={() => onSave(dose.id, { takenAt: form.takenAt, withFood: form.withFood, note: form.note.trim() || undefined })}>
            <Save className="h-5 w-5" /> שמור
          </button>
        </div>
        <div className="border-t border-slate-100 pt-3">
          {confirmDelete ? (
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-red-50 p-3">
              <span className="text-sm font-semibold text-red-800">למחוק את הרישום לצמיתות?</span>
              <div className="flex gap-2">
                <button type="button" className={btn.ghost} onClick={() => setConfirmDelete(false)}>לא</button>
                <button type="button" className="rounded-xl bg-red-500 px-3 py-1.5 text-sm font-bold text-white" onClick={() => onDelete(dose.id)}>מחק</button>
              </div>
            </div>
          ) : (
            <button type="button" className={`${btn.ghost} text-red-600`} onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> מחיקת רישום
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
