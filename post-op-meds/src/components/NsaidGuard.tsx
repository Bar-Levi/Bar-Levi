import { Ban, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { BLOCKED_NSAIDS, NSAID_BLOCK_MESSAGE } from '../lib/medications';
import { Modal, btn } from './ui';

/** Hard guardrail: Nurofen / Ibuprofen and other NSAIDs can never be logged alongside Arcoxia. */
export function NsaidGuard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button" onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-3xl border-2 border-dashed border-red-200 bg-white p-4 text-right transition hover:bg-red-50"
      >
        <span className="rounded-2xl bg-red-100 p-2.5 text-red-600"><Ban className="h-6 w-6" /></span>
        <span className="min-w-0">
          <span className="block font-extrabold text-slate-900">רוצה לקחת נורופן / איבופרופן?</span>
          <span className="block text-sm text-slate-600">בדיקת התנגשות עם ארקוקסיה לפני נטילה</span>
        </span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="חסימת בטיחות" tone="danger">
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-red-500 p-5 text-center text-white" role="alert">
            <ShieldAlert className="h-14 w-14" />
            <p className="text-xl font-extrabold leading-snug">{NSAID_BLOCK_MESSAGE}</p>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            ארקוקסיה היא כבר תרופה נוגדת דלקת (NSAID). שילוב עם נוגד דלקת נוסף לא משפר את שיכוך הכאב, אך מעלה משמעותית את הסיכון לכיב, לדימום בקיבה ולפגיעה בכליות.
            <strong> לא ניתן לרשום נטילה של התכשירים הבאים באפליקציה:</strong>
          </p>
          <ul className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
            {BLOCKED_NSAIDS.map((n) => (
              <li key={n} className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 font-semibold text-red-800">
                <Ban className="h-4 w-4 shrink-0" />{n}
              </li>
            ))}
          </ul>
          <div className="rounded-2xl bg-blue-50 p-3 text-sm leading-relaxed text-blue-900">
            <strong>כאב שלא נשלט?</strong> ניתן ליטול רוקסט פלוס לפי ההוראות (עד 4 ביום, במרווח הבטיחות). אם הכאב עדיין חזק – פנה לרופא השיניים/המנתח.
          </div>
          <button type="button" className={`${btn.primary} w-full`} onClick={() => setOpen(false)}>הבנתי – לא אקח נורופן</button>
        </div>
      </Modal>
    </>
  );
}
