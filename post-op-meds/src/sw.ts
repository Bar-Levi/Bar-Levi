/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

// App shell precache → the app works 100% offline after first load.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// Heebo font (Google Fonts) – cached so the Hebrew typography also works offline.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-css' }),
);
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({ cacheName: 'google-fonts-files', plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })] }),
);

self.addEventListener('install', () => { void self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

// Focus (or open) the app when a reminder is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) return (c as WindowClient).focus();
    }
    return self.clients.openWindow(self.registration.scope);
  })());
});

interface ScheduledReminder { tag: string; at: number; title: string; body: string }

// Notification Triggers (where supported): schedule alarms that fire even if the app is closed.
self.addEventListener('message', (event) => {
  const data = event.data as { type?: string; items?: ScheduledReminder[] } | undefined;
  if (data?.type !== 'SCHEDULE_REMINDERS' || !Array.isArray(data.items)) return;
  const TT = (self as unknown as { TimestampTrigger?: new (t: number) => unknown }).TimestampTrigger;
  if (!TT) return;
  event.waitUntil((async () => {
    const existing = await self.registration.getNotifications({ includeTriggered: true } as GetNotificationOptions);
    existing.filter((n) => n.tag.startsWith('med:')).forEach((n) => n.close());
    for (const it of data.items!) {
      if (it.at <= Date.now()) continue;
      await self.registration.showNotification(it.title, {
        body: it.body, tag: `med:${it.tag}`, lang: 'he', dir: 'rtl',
        icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
        requireInteraction: true,
        // @ts-expect-error – experimental Notification Triggers API
        showTrigger: new TT(it.at),
      });
    }
  })());
});
