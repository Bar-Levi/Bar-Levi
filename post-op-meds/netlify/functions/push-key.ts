import { json, vapidConfigured } from './_shared';

export const config = { path: '/api/push-key' };

export default async () =>
  vapidConfigured()
    ? json({ publicKey: process.env.VAPID_PUBLIC_KEY })
    : json({ error: 'push not configured' }, 503);
