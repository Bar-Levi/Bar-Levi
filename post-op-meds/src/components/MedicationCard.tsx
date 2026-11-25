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
          {def.id === 'moxypen' && (
            <span className="flex items-center gap-1.5">היום: <Dots filled={status.countToday} total={3} color="bg-teal-500" /> <span className="tabular">{status.countToday}/3</span></span>
          )}
          {def.id === 'arcoxia' && (
            <span className="flex items-center gap-1.5"><UtensilsCrossed className="h-3.5 w-3.5" /> פעם ביום, עם אוכל</span>
          )}
        </div>

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
