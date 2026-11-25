/**
 * Web Push client. Talks to the Netlify functions under /api.
 * Everything fails soft: if the server isn't configured (or we're offline / in dev),
 * the in-app reminders keep working.
 */
import type { ScheduledReminder } from './alerts';

export type PushState = 'active' | 'unavailable' | 'needs-permission' | 'unsupported';

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  const res = await fetch('/api/push-key', { cache: 'no-store' });
  if (!res.ok) return null;
  const { publicKey } = (await res.json()) as { publicKey: string };
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
}

/** Subscribe (if needed) and replace this device's server-side schedule. */
export async function syncPush(items: ScheduledReminder[]): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission !== 'granted') return 'needs-permission';
  try {
    const sub = await getSubscription();
    if (!sub) return 'unavailable';
    const res = await fetch('/api/push-sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), reminders: items }),
    });
    return res.ok ? 'active' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await fetch('/api/push-sync', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), unsubscribe: true }),
    }).catch(() => undefined);
    await sub.unsubscribe();
  } catch { /* ignore */ }
}
