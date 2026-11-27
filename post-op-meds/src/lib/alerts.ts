/** Notifications, sound and vibration. All functions degrade gracefully. */

export type NotifyCapability = 'granted' | 'denied' | 'default' | 'unsupported';

export function notificationCapability(): NotifyCapability {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission as NotifyCapability;
}

export async function requestNotificationPermission(): Promise<NotifyCapability> {
  if (notificationCapability() === 'unsupported') return 'unsupported';
  try {
    return (await Notification.requestPermission()) as NotifyCapability;
  } catch {
    return notificationCapability();
  }
}

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches
  || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Show a system notification (via the service worker where possible – required on Android). */
export async function showSystemNotification(title: string, body: string, tag: string): Promise<boolean> {
  if (notificationCapability() !== 'granted') return false;
  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body, tag, lang: 'he', dir: 'rtl',
    icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
    vibrate: [300, 150, 300], renotify: true, requireInteraction: true,
    data: { url: '/' },
  };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, options);
        return true;
      }
    }
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pre-schedule notifications in the service worker using Notification Triggers
 * where the browser supports them (so alarms fire even when the app is closed).
 * Elsewhere this is a no-op and the in-app scheduler + banners take over.
 */
export function supportsScheduledNotifications(): boolean {
  return typeof window !== 'undefined' && 'TimestampTrigger' in window
    && 'Notification' in window && 'showTrigger' in Notification.prototype;
}

export interface ScheduledReminder { tag: string; at: number; title: string; body: string }

export async function syncScheduledReminders(items: ScheduledReminder[]) {
  if (!supportsScheduledNotifications() || notificationCapability() !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.ready;
    reg?.active?.postMessage({ type: 'SCHEDULE_REMINDERS', items });
  } catch { /* ignore */ }
}

// ── Sound ──────────────────────────────────────────────────────────

let ctx: AudioContext | null = null;

/** Must be called from a user gesture once so iOS/Chrome allow audio later. */
export function unlockAudio() {
  try {
    const AC = window.AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { /* ignore */ }
}

export function playChime() {
  if (!ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime;
  [880, 660, 880].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = t0 + i * 0.35;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(start);
    osc.stop(start + 0.32);
  });
}

export function vibrate(pattern: number[] = [300, 150, 300, 150, 300]) {
  // Browsers reject vibration until the user has interacted with the page.
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (ua && !ua.hasBeenActive) return;
  try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
}
