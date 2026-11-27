import { ChevronDown, Phone, Siren, Stethoscope } from 'lucide-react';
import { useState } from 'react';

const EMERGENCY = [
  'נפיחות מתפשטת בצוואר או בפנים',
  'חום מעל 38.5°C',
  'קושי בבליעה או בנשימה',
  'דימום שאינו נעצר לאחר 30 דקות לחץ עם גאזה',
  'תגובה אלרגית: פריחה, נפיחות בשפתיים/לשון, קוצר נשימה (במיוחד לאחר אנטיביוטיקה)',
];

const CALL_CLINIC = [
  'כאב שמחמיר אחרי היום ה-3–4 במקום להשתפר',
  'טעם רע / ריח רע מתמשך מאזור הניתוח',
  'צרבת חזקה, כאבי בטן או צואה שחורה',
  'שלשול חמור או מתמשך בזמן האנטיביוטיקה',
  'נמנום יתר או בלבול לאחר רוקסט פלוס',
];

export function RedFlags({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="overflow-hidden rounded-3xl border-2 border-red-300 bg-white">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex w-full items-center gap-3 bg-red-50 p-4 text-right">
        <Siren className="h-6 w-6 shrink-0 text-red-600" />
        <span className="flex-1">
          <span className="block font-extrabold text-red-800">סימני אזהרה לפנייה מיידית</span>
          <span className="block text-xs text-red-700">לחץ לצפייה ברשימה</span>
        </span>
        <ChevronDown className={`h-5 w-5 text-red-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-4 p-4">
          <div>
            <p className="mb-2 font-extrabold text-red-700">אם מופיע אחד מאלה – פנה מיד למיון:</p>
            <ul className="space-y-1.5">
              {EMERGENCY.map((t) => (
                <li key={t} className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-900">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />{t}
                </li>
              ))}
            </ul>
            <a href="tel:101" className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-lg font-extrabold text-white">
              <Phone className="h-5 w-5" /> חיוג למד״א 101
            </a>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 font-bold text-slate-800"><Stethoscope className="h-4 w-4" />פנה לרופא השיניים / המנתח בהקדם:</p>
            <ul className="space-y-1 text-sm text-slate-700">
              {CALL_CLINIC.map((t) => <li key={t} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />{t}</li>)}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
