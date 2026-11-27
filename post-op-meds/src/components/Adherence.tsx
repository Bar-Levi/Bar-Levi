import { CheckCircle2, CircleAlert } from 'lucide-react';
import type { AdherenceDay } from '../lib/rules';

const dayLabel = (key: string) => {
  const [, m, d] = key.split('-');
  return `${Number(d)}/${Number(m)}`;
};

export function AdherenceStrip({ days }: { days: AdherenceDay[] }) {
  if (days.length === 0) return null;
  const missed = days.reduce((a, d) => a + d.missed, 0);
  return (
    <div className="mt-3 rounded-2xl bg-slate-50 p-3">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold">
        <span className="text-slate-600">היענות לטיפול</span>
        {missed > 0
          ? <span className="flex items-center gap-1 text-amber-700"><CircleAlert className="h-3.5 w-3.5" />{missed} מנות הוחמצו – אין להשלים בכפל מנה</span>
          : <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />ללא החמצות</span>}
      </div>
      <ol className="flex gap-1.5 overflow-x-auto">
        {days.map((d) => (
          <li key={d.key} className={`min-w-11 flex-1 rounded-xl border px-1 py-1.5 text-center ${d.isToday ? 'border-teal-400 bg-white' : d.missed ? 'border-amber-300 bg-amber-50' : 'border-transparent bg-white'}`}>
            <div className="text-[10px] text-slate-500 tabular">{d.isToday ? 'היום' : dayLabel(d.key)}</div>
            <div className="mt-1 flex justify-center gap-0.5">
              {Array.from({ length: d.expected }, (_, i) => (
                <span key={i} className={`h-2 w-2 rounded-full ${i < d.count ? 'bg-teal-500' : d.missed && i >= d.count ? 'bg-amber-400' : 'bg-slate-200'}`} />
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
