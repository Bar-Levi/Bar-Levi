import { Bell, Moon, RotateCcw, Sun, Timer, Vibrate, Volume2 } from 'lucide-react';
import { useState } from 'react';
import {
  playChime, requestNotificationPermission, showSystemNotification, supportsScheduledNotifications,
  unlockAudio, vibrate, type NotifyCapability,
} from '../lib/alerts';
import type { PushState } from '../lib/push';
import type { Settings } from '../lib/types';
import { Callout, Toggle, btn } from './ui';

const CAP_TEXT: Record<NotifyCapability, string> = {
  granted: 'מאופשרות ✓',
  denied: 'חסומות – יש לאפשר בהגדרות הדפדפן/האתר',
  default: 'טרם אושרו',
  unsupported: 'לא נתמכות בדפדפן זה – יוצגו באנרים בתוך האפליקציה',
};

export function SettingsView({ settings, onChange, pushState, capability, onCapability, onClearAll }: {
  settings: Settings; onChange: (p: Partial<Settings>) => void; pushState: PushState;
  capability: NotifyCapability; onCapability: (c: NotifyCapability) => void; onClearAll: () => void;
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  const test = async () => {
    unlockAudio();
    let cap = capability;
    if (cap === 'default') { cap = await requestNotificationPermission(); onCapability(cap); }
    const ok = await showSystemNotification('בדיקת התראה', 'כך תיראה תזכורת לתרופה.', 'test');
    if (settings.soundEnabled) setTimeout(playChime, 50);
    if (settings.vibrationEnabled) vibrate();
    if (!ok) window.alert('התראת מערכת לא זמינה – תזכורות יוצגו כבאנר וצליל בתוך האפליקציה.');
  };

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h3 className="flex items-center gap-2 font-extrabold"><Bell className="h-5 w-5 text-blue-600" />התראות</h3>
        <p className="text-sm">מצב התראות מערכת: <strong>{CAP_TEXT[capability]}</strong></p>
        {supportsScheduledNotifications() && (
          <p className="text-xs text-emerald-700">הדפדפן תומך בהתראות מתוזמנות – תזכורות יופיעו גם כשהאפליקציה סגורה.</p>
        )}
        <Toggle checked={settings.serverPush} onChange={(v) => onChange({ serverPush: v })}
          label="פוש מהשרת (גם כשהאפליקציה סגורה)"
          description={
            !settings.serverPush ? 'כבוי – תזכורות רק כשהאפליקציה פתוחה'
              : pushState === 'active' ? 'פעיל ✓ – זמני התזכורות נשלחים לשרת לצורך שליחת ההתראה (ללא שם או פרטים אישיים)'
                : pushState === 'needs-permission' ? 'יופעל לאחר אישור התראות'
                  : pushState === 'unsupported' ? 'הדפדפן לא תומך. ב-iPhone יש קודם „הוספה למסך הבית”'
                    : 'השרת לא זמין כרגע – התזכורות יעבדו כשהאפליקציה פתוחה'
          } />
        <Toggle checked={settings.soundEnabled} onChange={(v) => onChange({ soundEnabled: v })}
          label={<span className="flex items-center gap-2"><Volume2 className="h-4 w-4" />צליל תזכורת</span>} />
        <Toggle checked={settings.vibrationEnabled} onChange={(v) => onChange({ vibrationEnabled: v })}
          label={<span className="flex items-center gap-2"><Vibrate className="h-4 w-4" />רטט (אנדרואיד)</span>} />
        <Toggle checked={settings.notifyRokacet} onChange={(v) => onChange({ notifyRokacet: v })}
          label="התראה כשרוקסט פלוס מותר שוב" description="תרופה לפי הצורך – ההתראה רק מודיעה שהמרווח הסתיים" />
        <button type="button" className={`${btn.secondary} w-full`} onClick={test}>שלח התראת בדיקה</button>
      </section>

      <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h3 className="flex items-center gap-2 font-extrabold"><Sun className="h-5 w-5 text-amber-500" />שעות ערות</h3>
        <p className="text-sm text-slate-600">מנות מתוזמנות (אוגמנטין, ארקוקסיה) שנופלות בשעות השינה יוזזו לשעת הקימה.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-sm font-semibold"><Sun className="h-4 w-4" />קימה</span>
            <input type="time" value={settings.wakeTime} onChange={(e) => e.target.value && onChange({ wakeTime: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 tabular" />
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-sm font-semibold"><Moon className="h-4 w-4" />שינה</span>
            <input type="time" value={settings.sleepTime} onChange={(e) => e.target.value && onChange({ sleepTime: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 tabular" />
          </label>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h3 className="flex items-center gap-2 font-extrabold"><Timer className="h-5 w-5 text-violet-600" />מרווח מינימלי – רוקסט פלוס</h3>
        <p className="text-sm text-slate-600">לפי הוראות הרופא (4–6 שעות). הנעילה תחול לפי הערך שנבחר.</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {[4, 5, 6].map((h) => (
            <button key={h} type="button" role="radio" aria-checked={settings.rokacetMinHours === h}
              onClick={() => onChange({ rokacetMinHours: h })}
              className={`rounded-xl border py-2.5 font-bold ${settings.rokacetMinHours === h ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-slate-200'}`}>
              {h} שעות
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <h3 className="flex items-center gap-2 font-extrabold text-red-700"><RotateCcw className="h-5 w-5" />איפוס</h3>
        {confirmClear ? (
          <Callout tone="red">
            <p className="font-bold">למחוק את כל הרישומים וההגדרות? לא ניתן לשחזר (מומלץ לייצא גיבוי קודם).</p>
            <div className="mt-2 flex gap-2">
              <button type="button" className={btn.danger} onClick={() => { onClearAll(); setConfirmClear(false); }}>מחק הכל</button>
              <button type="button" className={btn.secondary} onClick={() => setConfirmClear(false)}>ביטול</button>
            </div>
          </Callout>
        ) : (
          <button type="button" className={`${btn.secondary} w-full text-red-600`} onClick={() => setConfirmClear(true)}>מחיקת כל הנתונים (סיום טיפול)</button>
        )}
      </section>
    </div>
  );
}
