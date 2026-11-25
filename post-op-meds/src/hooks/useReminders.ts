import { useEffect, useMemo, useRef, useState } from 'react';
import {
  playChime, showSystemNotification, syncScheduledReminders, vibrate, type ScheduledReminder,
} from '../lib/alerts';
import { MEDICATIONS } from '../lib/medications';
import { loadFired, saveFired } from '../lib/storage';
import { HOUR } from '../lib/time';
import type { MedId, MedStatus, Settings } from '../lib/types';

const reminderText = (s: MedStatus): { title: string; body: string } => {
  const med = MEDICATIONS[s.medId];
  if (s.medId === 'rokacet') {
    return { title: `${med.name}: מותר לקחת שוב`, body: 'המרווח הבטיחותי הסתיים – ניתן ליטול לפי הצורך בלבד. עלול לטשטש.' };
  }
  if (s.medId === 'arcoxia') {
    return { title: `⏰ ${med.name}: זמן המנה היומית`, body: 'טבליה אחת עם אוכל להגנה על הקיבה. לא לשלב עם נורופן.' };
  }
  return { title: `⏰ ${med.name}: זמן מנת אנטיביוטיקה`, body: 'הגיע זמן המנה הבאה. אם הוחמצה – לא להכפיל מנה.' };
};

export interface FiredReminder { medId: MedId; at: number; key: string }

/**
 * In-app scheduler: when a medication's reminder time passes, fire a system
 * notification (if permitted) + chime + vibration exactly once per target time.
 * Also pre-schedules future alarms in the SW where Notification Triggers exist.
 */
export function useReminders(statuses: MedStatus[], settings: Settings, now: number) {
  const fired = useRef<Set<string>>(loadFired());
  const [lastFired, setLastFired] = useState<FiredReminder | null>(null);

  const targets = useMemo(
    () => statuses
      .filter((s) => s.reminderAt !== null)
      .map((s) => ({ status: s, at: s.reminderAt as number, key: `${s.medId}:${s.reminderAt}` })),
    [statuses],
  );

  useEffect(() => {
    for (const t of targets) {
      if (now < t.at || fired.current.has(t.key)) continue;
      fired.current.add(t.key);
      saveFired(fired.current);
      // Don't make noise for reminders that expired long ago (e.g. app reopened next day);
      // the in-app due banner still shows them.
      if (now - t.at > 6 * HOUR) continue;
      const { title, body } = reminderText(t.status);
      void showSystemNotification(title, body, `med:${t.status.medId}`);
      if (settings.soundEnabled) playChime();
      if (settings.vibrationEnabled) vibrate();
      setLastFired({ medId: t.status.medId, at: t.at, key: t.key });
    }
  }, [now, targets, settings.soundEnabled, settings.vibrationEnabled]);

  // Re-sync SW-scheduled alarms whenever the targets change.
  const schedKey = targets.map((t) => t.key).join('|');
  useEffect(() => {
    const items: ScheduledReminder[] = targets
      .filter((t) => t.at > Date.now())
      .map((t) => ({ tag: t.status.medId, at: t.at, ...reminderText(t.status) }));
    void syncScheduledReminders(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedKey]);

  return { lastFired, dismissLastFired: () => setLastFired(null) };
}
