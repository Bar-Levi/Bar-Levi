import type { Config } from '@netlify/functions';
import { initWebPush, store, vapidConfigured, type Record_ } from './_shared';

// Runs every minute: sends any reminder whose time has arrived.
export const config: Config = { schedule: '* * * * *' };

const STALE_MS = 6 * 3600e3;      // don't push reminders that are hours late
const FORGET_MS = 14 * 86400e3;   // drop devices that haven't synced in 2 weeks

export default async () => {
  if (!vapidConfigured()) return;
  const wp = initWebPush();
  const s = store();
  const now = Date.now();
  const { blobs } = await s.list();

  await Promise.all(blobs.map(async ({ key }) => {
    const rec = (await s.get(key, { type: 'json' })) as Record_ | null;
    if (!rec) return;
    if (now - rec.updatedAt > FORGET_MS) { await s.delete(key); return; }

    const due = rec.reminders.filter((r) => !r.sent && r.at <= now && now - r.at < STALE_MS);
    if (due.length === 0) return;
    for (const r of due) {
      r.sent = true; // mark first: at-most-once beats duplicate medication alerts
    }
    await s.setJSON(key, rec);

    for (const r of due) {
      try {
        await wp.sendNotification(
          rec.subscription,
          JSON.stringify({ title: r.title, body: r.body, tag: `med:${r.tag}` }),
          { TTL: 3600, urgency: 'high' },
        );
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) { await s.delete(key); return; } // subscription gone
        console.error('push failed', code);
      }
    }
  }));
};
