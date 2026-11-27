import { AlarmClock, Ban, BellOff, BellRing, Car, Share, X } from 'lucide-react';
import { useState } from 'react';
import { isIOS, isStandalone, requestNotificationPermission, unlockAudio, type NotifyCapability } from '../lib/alerts';
import { MEDICATIONS } from '../lib/medications';
import type { MedId, MedStatus } from '../lib/types';
import { btn } from './ui';

const DISMISS_KEY = 'postop-meds:notify-banner-dismissed';

export function NotificationSetup({ capability, onChange }: { capability: NotifyCapability; onChange: (c: NotifyCapability) => void }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  const ios = isIOS();
  const standalone = isStandalone();
  const iosNeedsInstall = ios && !standalone;

  if (capability === 'granted' && !iosNeedsInstall) return null;
  if (dismissed && capability !== 'default') return null;
  const dismiss = () => { setDismissed(true); try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ } };

  return (
    <section className="relative rounded-3xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
      {capability !== 'default' && (
        <button type="button" onClick={dismiss} aria-label="הסתר" className="absolute left-3 top-3 rounded-full p-1 text-blue-700 hover:bg-blue-100"><X className="h-4 w-4" /></button>
      )}
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-white p-2 text-blue-600 shadow-sm">
          {capability === 'denied' || capability === 'unsupported' ? <BellOff className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
        </span>
        <div className="min-w-0 space-y-2 pl-6">
          {iosNeedsInstall ? (
            <>
              <p className="font-bold">ב-iPhone: התקן את האפליקציה כדי לקבל התראות</p>
              <p>לחץ על <Share className="inline h-4 w-4" /> „שיתוף” ← „הוספה למסך הבית”, ופתח את האפליקציה מהאייקון. עד אז – תזכורות יופיעו כבאנרים וצליל בתוך האפליקציה כשהיא פתוחה.</p>
            </>
          ) : capability === 'default' ? (
            <>
              <p className="font-bold">הפעל התראות לתזכורות תרופות</p>
              <p>נשלח התראה כשמגיע זמן המנה או כשמסתיים מרווח הבטיחות.</p>
              <button type="button" className={`${btn.primary} py-2`}
                onClick={async () => { unlockAudio(); onChange(await requestNotificationPermission()); }}>
                <BellRing className="h-4 w-4" /> אפשר התראות
              </button>
            </>
          ) : capability === 'denied' ? (
            <p><strong>ההתראות חסומות בדפדפן.</strong> ניתן לאפשר אותן בהגדרות האתר. בינתיים התזכורות יוצגו כבאנרים בתוך האפליקציה.</p>
          ) : (
            <p><strong>הדפדפן לא תומך בהתראות.</strong> התזכורות יוצגו כבאנרים וצליל בתוך האפליקציה – השאר אותה פתוחה.</p>
          )}
          <p className="text-xs text-blue-800/80">שים לב: אפליקציית רשת אינה יכולה להבטיח התראה כשהיא סגורה לגמרי. מומלץ לגבות בשעון מעורר לאנטיביוטיקה.</p>
        </div>
      </div>
    </section>
  );
}

/** Permanent, non-dismissible safety strip for the active regimen. */
export function SafetyStrip() {
  return (
    <section className="space-y-2" aria-label="אזהרות בטיחות קבועות">
      <div className="flex items-center gap-2.5 rounded-2xl bg-red-500 px-3.5 py-3 text-white shadow-sm" role="note">
        <Ban className="h-5 w-5 shrink-0" />
        <p className="text-sm font-extrabold leading-snug">איסור מוחלט: אין לשלב נורופן (איבופרופן) עם ארקוקסיה</p>
      </div>
      <div className="flex items-center gap-2.5 rounded-2xl bg-amber-100 px-3.5 py-2.5 text-amber-950 ring-1 ring-amber-300" role="note">
        <Car className="h-5 w-5 shrink-0" />
        <p className="text-sm font-bold leading-snug">רוקסט פלוס עלול לגרום לנמנום – להימנע מנהיגה</p>
      </div>
    </section>
  );
}

/** In-app reminder banners – the fallback that always works (iOS, blocked notifications, etc.). */
export function DueBanner({ statuses, onLog, flashMedId, onDismissFlash }: {
  statuses: MedStatus[]; onLog: (id: MedId) => void; flashMedId: MedId | null; onDismissFlash: () => void;
}) {
  const due = statuses.filter((s) => s.level === 'yellow' && s.medId !== 'rokacet' && s.lastDose);
  const flash = flashMedId ? statuses.find((s) => s.medId === flashMedId) : null;
  if (due.length === 0 && !flash) return null;
  return (
    <section className="space-y-2" aria-live="polite">
      {flash && flash.medId === 'rokacet' && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-600 p-3 text-white shadow-lg">
          <AlarmClock className="h-6 w-6 shrink-0" />
          <p className="min-w-0 flex-1 text-sm font-bold">רוקסט פלוס: מרווח הבטיחות הסתיים – מותר לקחת שוב לפי הצורך.</p>
          <button type="button" onClick={onDismissFlash} aria-label="סגור" className="rounded-full p-1 hover:bg-white/20"><X className="h-4 w-4" /></button>
        </div>
      )}
      {due.map((s) => (
        <div key={s.medId} className={`flex items-center gap-3 rounded-2xl p-3 shadow-lg ${s.overdue ? 'bg-amber-600 text-white' : 'bg-amber-400 text-amber-950'}`}>
          <AlarmClock className="h-6 w-6 shrink-0" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-extrabold">{s.overdue ? 'מנה באיחור' : 'הגיע זמן'}: {MEDICATIONS[s.medId].name}</p>
            {s.overdue && s.medId === 'augmentin' && <p className="text-xs">קח כשנזכרת – אך לעולם אל תכפיל מנה.</p>}
          </div>
          <button type="button" onClick={() => { onDismissFlash(); onLog(s.medId); }}
            className="shrink-0 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm">רשום נטילה</button>
        </div>
      ))}
    </section>
  );
}
