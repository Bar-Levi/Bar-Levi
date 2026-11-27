import { AlertTriangle, Car, Clock, Lock, Pill, Plus, UtensilsCrossed } from 'lucide-react';
import type { ReactNode } from 'react';
import type { MedicationDef } from '../lib/medications';
import { fmtCountdown, fmtDuration, fmtRelativeDay, fmtTime } from '../lib/time';
import type { MedStatus } from '../lib/types';
import { LEVEL_STYLES, StatusChip, btn } from './ui';

function Dots({ filled, total, color }: { filled: number; total: number; color: string }) {
  return (
    <span className="inline-flex gap-1" aria-label={`${filled} מתוך ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < filled ? color : 'bg-slate-200'}`} />
      ))}
    </span>
  );
}

function CourseProgress({ taken, total, endsAt, now }: { taken: number; total: number; endsAt: number | null; now: number }) {
  const pct = Math.min(100, Math.round((taken / total) * 100));
  const left = Math.max(0, total - taken);
  return (
    <div className="mt-3 rounded-2xl bg-teal-50 p-3">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-extrabold text-teal-900">נלקחו <span className="tabular">{taken}</span> מתוך <span className="tabular">{total}</span> טבליות</span>
        <span className="font-semibold text-teal-800">{left > 0 ? <>נותרו <span className="tabular">{left}</span></> : 'הושלם ✓'}</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={taken}>
        <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      {endsAt && left > 0 && (
        <div className="mt-1.5 text-xs text-teal-800">טבליה אחרונה משוערת: {fmtRelativeDay(endsAt, now)} · <span className="tabular">{fmtTime(endsAt)}</span></div>
      )}
    </div>
  );
}

export function MedicationCard({ def, status, now, onLog, footer }: {
  def: MedicationDef; status: MedStatus; now: number; onLog: () => void; footer?: ReactNode;
}) {
  const s = LEVEL_STYLES[status.level];
  const locked = status.level === 'red';
  const last = status.lastDose;
  const countdownMs = status.countdownTo ? status.countdownTo - now : 0;

  return (
    <article className={`relative overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ${s.ring} ${status.level === 'yellow' ? 'pulse-due' : ''}`}>
      <div className={`absolute inset-y-0 right-0 w-1.5 ${def.accent}`} aria-hidden />
      <div className="p-4 pr-5">
        <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-lg font-extrabold">
              <Pill className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
              {def.name}
            </h3>
            <p className="text-sm text-slate-500">{def.role}</p>
          </div>
          <StatusChip level={status.level} label={status.label} />
        </header>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-500">מנה אחרונה</div>
            {last ? (
              <>
                <div className="mt-0.5 font-bold">{fmtRelativeDay(last.takenAt, now)} · <span className="tabular">{fmtTime(last.takenAt)}</span></div>
                <div className="text-xs text-slate-500">לפני {fmtDuration(now - last.takenAt)}</div>
              </>
            ) : <div className="mt-0.5 font-bold text-slate-400">טרם נרשמה</div>}
          </div>
          <div className={`rounded-2xl p-3 ${locked ? 'bg-red-50' : status.level === 'yellow' ? 'bg-amber-50' : 'bg-slate-50'}`}>
            <div className="text-xs font-semibold text-slate-500">{status.countdownLabel ?? 'מנה הבאה'}</div>
            {status.countdownTo ? (
              <div className={`mt-0.5 text-2xl font-extrabold tabular ${s.text}`} aria-live="off">
                {fmtCountdown(countdownMs)}
              </div>
            ) : (
              <div className={`mt-1 font-bold ${s.text}`}>
                {status.level === 'green' ? 'אפשר עכשיו' : status.overdue ? 'באיחור' : 'עכשיו'}
              </div>
            )}
          </div>
        </div>

        {status.detail && (
          <p className={`mt-3 flex items-start gap-2 text-sm leading-relaxed ${status.overdue ? 'font-semibold text-amber-800' : 'text-slate-700'}`}>
            {status.overdue ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
            <span>{status.detail}</span>
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
          {def.id === 'rokacet' && (
            <span className="flex items-center gap-1.5">24 שעות: <Dots filled={status.count24h} total={4} color="bg-violet-500" /> <span className="tabular">{status.count24h}/4</span></span>
          )}
          {def.id === 'augmentin' && (
            <span className="flex items-center gap-1.5">היום: <Dots filled={Math.min(status.countToday, 2)} total={2} color="bg-teal-500" /> <span className="tabular">{status.countToday}/2</span></span>
          )}
        </div>

        {status.course && <CourseProgress {...status.course} now={now} />}

        {def.foodHint && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-900">
            <UtensilsCrossed className="mt-0.5 h-4 w-4 shrink-0" /> {def.foodHint}
          </div>
        )}

        {def.id === 'rokacet' && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            <Car className="h-4 w-4 shrink-0" /> עלול לטשטש – להימנע מנהיגה
          </div>
        )}

        {footer}

        <button type="button" onClick={onLog} className={`mt-4 w-full ${locked ? btn.secondary : btn.primary}`}>
          {locked ? <Lock className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {locked ? 'נעול – פרטים / רישום מנה שנשכחה' : 'רשום נטילה עכשיו'}
        </button>
      </div>
    </article>
  );
}
