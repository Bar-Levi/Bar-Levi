import { getStore } from '@netlify/blobs';
import webpush from 'web-push';

export interface Reminder { tag: string; at: number; title: string; body: string; sent?: boolean }
export interface Record_ {
  subscription: webpush.PushSubscription;
  reminders: Reminder[];
  updatedAt: number;
}

export const store = () => getStore({ name: 'push-subscriptions', consistency: 'strong' });

export function vapidConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function initWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:noreply@example.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  return webpush;
}

/** Stable, URL-safe blob key derived from the push endpoint. */
export async function keyFor(endpoint: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export function validSubscription(s: unknown): s is webpush.PushSubscription {
  const x = s as webpush.PushSubscription;
  return !!x && typeof x.endpoint === 'string' && x.endpoint.startsWith('https://') && x.endpoint.length < 1000
    && typeof x.keys?.p256dh === 'string' && typeof x.keys?.auth === 'string';
}
