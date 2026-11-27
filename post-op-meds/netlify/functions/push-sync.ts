import { json, keyFor, store, validSubscription, vapidConfigured, type Record_, type Reminder } from '../lib/push-shared';

export const config = { path: '/api/push-sync' };

/** Replace the stored reminder schedule for one device. Body: { subscription, reminders } */
export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!vapidConfigured()) return json({ error: 'push not configured' }, 503);
  let body: { subscription?: unknown; reminders?: unknown; unsubscribe?: boolean };
  try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  if (!validSubscription(body.subscription)) return json({ error: 'bad subscription' }, 400);
  const key = await keyFor(body.subscription.endpoint);

  if (body.unsubscribe) {
    await store().delete(key);
    return json({ ok: true });
  }

  const now = Date.now();
  const reminders: Reminder[] = (Array.isArray(body.reminders) ? body.reminders : [])
    .slice(0, 10)
    .filter((r): r is Reminder => !!r && typeof r.at === 'number' && typeof r.title === 'string' && typeof r.body === 'string' && typeof r.tag === 'string')
    .filter((r) => r.at > now - 6 * 3600e3 && r.at < now + 3 * 86400e3)
    .map((r) => ({ tag: r.tag.slice(0, 40), at: r.at, title: r.title.slice(0, 120), body: r.body.slice(0, 240) }));

  // Keep "sent" flags for reminders that did not change, so re-syncing never causes a repeat push.
  const prev = (await store().get(key, { type: 'json' })) as Record_ | null;
  for (const r of reminders) {
    if (prev?.reminders.some((p) => p.tag === r.tag && p.at === r.at && p.sent)) r.sent = true;
  }
  const rec: Record_ = { subscription: body.subscription, reminders, updatedAt: now };
  await store().setJSON(key, rec);
  return json({ ok: true, scheduled: reminders.filter((r) => !r.sent).length });
};
