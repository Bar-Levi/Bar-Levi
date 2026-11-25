import { CheckCircle2, Undo2 } from 'lucide-react';
import { MEDICATIONS } from '../lib/medications';
import { fmtTime } from '../lib/time';
import type { DoseEntry } from '../lib/types';
import { UNDO_WINDOW_MS } from './History';

export function UndoToast({ dose, now, onUndo, onClose }: {
  dose: DoseEntry | null; now: number; onUndo: () => void; onClose: () => void;
}) {
  if (!dose) return null;
  const left = UNDO_WINDOW_MS - (now - dose.createdAt);
  if (left <= 0) return null;
  return (
    <div className="fixed inset-x-3 bottom-[84px] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-slate-900 p-3 text-white shadow-2xl" role="status">
      <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />
      <button type="button" className="min-w-0 flex-1 text-right text-sm" onClick={onClose}>
        <span className="block font-bold">נרשם: {MEDICATIONS[dose.medId].name}</span>
        <span className="block text-slate-300">ב-<span className="tabular">{fmtTime(dose.takenAt)}</span> · ניתן לבטל תוך דקה</span>
      </button>
      <button type="button" onClick={onUndo} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-sm font-bold hover:bg-white/25">
        <Undo2 className="h-4 w-4" /> בטל <span className="tabular">{Math.ceil(left / 1000)}</span>
      </button>
    </div>
  );
}
