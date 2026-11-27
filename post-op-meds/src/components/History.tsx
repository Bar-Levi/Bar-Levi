import { Copy, Download, FileJson, FileText, History as HistoryIcon, Pencil, Share2, ShieldCheck, Undo2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { buildJson, buildTextLog, downloadFile, fileStamp, shareText } from '../lib/export';
import { MEDICATIONS, MED_ORDER } from '../lib/medications';
import type { PersistedState } from '../lib/storage';
import { fmtFullDate, fmtTime } from '../lib/time';
import type { DoseEntry, MedId } from '../lib/types';
import { Callout, btn } from './ui';

export const UNDO_WINDOW_MS = 60_000;

export function HistoryView({ doses, now, onEdit, onUndo }: {
  doses: DoseEntry[]; now: number; onEdit: (d: DoseEntry) => void; onUndo: (d: DoseEntry) => void;
}) {
  const [filter, setFilter] = useState<MedId | 'all'>('all');
  const list = [...doses]
    .filter((d) => filter === 'all' || d.medId === filter)
    .sort((a, b) => b.takenAt - a.takenAt);

  const groups: { day: string; items: DoseEntry[] }[] = [];
  for (const d of list) {
    const day = fmtFullDate(d.takenAt);
    const g = groups[groups.length - 1];
    if (g?.day === day) g.items.push(d); else groups.push({ day, items: [d] });
  }

  return (
    <section className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="סינון לפי תרופה">
        {(['all', ...MED_ORDER.filter((m) => !MEDICATIONS[m].archived || doses.some((d) => d.medId === m))] as const).map((id) => (
          <button key={id} type="button" role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${filter === id ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>
            {id === 'all' ? 'הכל' : MEDICATIONS[id].name}{id !== 'all' && MEDICATIONS[id].archived ? ' (ארכיון)' : ''}
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-white p-8 text-center text-slate-500">
          <HistoryIcon className="h-10 w-10 text-slate-300" />
          <p>עדיין אין רישומים</p>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.day}>
          <h3 className="sticky top-[60px] z-10 mb-2 bg-slate-50/95 py-1 text-sm font-bold text-slate-500 backdrop-blur">{g.day}</h3>
          <ol className="relative space-y-2 border-r-2 border-slate-200 pr-4">
            {g.items.map((d) => {
              const med = MEDICATIONS[d.medId];
              const undoLeft = UNDO_WINDOW_MS - (now - d.createdAt);
              return (
                <li key={d.id} className="relative rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                  <span className={`absolute -right-[23px] top-4 h-3.5 w-3.5 rounded-full ring-4 ring-slate-50 ${med.accent}`} aria-hidden />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-lg font-extrabold tabular">{fmtTime(d.takenAt)}</span>
                        <span className="font-bold">{med.name}</span>
                        <span className="text-sm text-slate-500">· טבליה 1</span>
                      </div>
                      {med.archived && (
                        <div className="mt-1 text-xs font-semibold text-slate-500">ארכיון · {med.archived.reason} ({med.archived.since})</div>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                        {d.withFood
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700"><ShieldCheck className="h-3 w-3" />עם אוכל/הגנה</span>
                          : <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">ללא אוכל</span>}
                        {d.editedAt && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">נערך</span>}
                      </div>
                      {d.note && <p className="mt-1.5 text-sm text-slate-700">{d.note}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {undoLeft > 0 && (
                        <button type="button" className={`${btn.ghost} bg-amber-50 text-amber-800`} onClick={() => onUndo(d)}>
                          <Undo2 className="h-4 w-4" /> בטל <span className="tabular">({Math.ceil(undoLeft / 1000)})</span>
                        </button>
                      )}
                      <button type="button" className={btn.ghost} onClick={() => onEdit(d)} aria-label="עריכה">
                        <Pencil className="h-4 w-4" /> עריכה
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </section>
  );
}

export function ExportPanel({ state, onImport }: { state: PersistedState; onImport: (raw: unknown) => void }) {
  const [msg, setMsg] = useState<{ tone: 'blue' | 'red'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const text = () => buildTextLog(state.doses);

  const onShare = async () => {
    const r = await shareText('יומן תרופות לאחר ניתוח', text());
    if (r === 'copied') setMsg({ tone: 'blue', text: 'היומן הועתק ללוח – ניתן להדביק בוואטסאפ או במייל לרופא.' });
    else if (r === 'failed') setMsg({ tone: 'red', text: 'השיתוף נכשל. נסה „הורד קובץ טקסט”.' });
    else setMsg(null);
  };
  const onCopy = async () => {
    try { await navigator.clipboard.writeText(text()); setMsg({ tone: 'blue', text: 'הועתק ללוח.' }); }
    catch { setMsg({ tone: 'red', text: 'ההעתקה נכשלה.' }); }
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const raw = JSON.parse(await f.text());
      if (!Array.isArray(raw?.doses)) throw new Error('bad');
      if (!window.confirm(`לייבא ${raw.doses.length} רישומים? הנתונים הנוכחיים יוחלפו.`)) return;
      onImport(raw);
      setMsg({ tone: 'blue', text: 'הנתונים יובאו בהצלחה.' });
    } catch {
      setMsg({ tone: 'red', text: 'הקובץ אינו גיבוי תקין של האפליקציה.' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <h3 className="flex items-center gap-2 font-extrabold"><Download className="h-5 w-5 text-blue-600" />ייצוא לרופא / גיבוי</h3>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={`${btn.primary} col-span-2`} onClick={onShare}><Share2 className="h-5 w-5" />שיתוף יומן כטקסט</button>
        <button type="button" className={btn.secondary} onClick={onCopy}><Copy className="h-4 w-4" />העתק טקסט</button>
        <button type="button" className={btn.secondary} onClick={() => downloadFile(`medication-log-${fileStamp()}.txt`, text(), 'text/plain')}><FileText className="h-4 w-4" />קובץ טקסט</button>
        <button type="button" className={btn.secondary} onClick={() => downloadFile(`medication-log-${fileStamp()}.json`, buildJson(state), 'application/json')}><FileJson className="h-4 w-4" />ייצוא JSON</button>
        <button type="button" className={btn.secondary} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />ייבוא גיבוי</button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      {msg && <Callout tone={msg.tone}>{msg.text}</Callout>}
    </section>
  );
}
