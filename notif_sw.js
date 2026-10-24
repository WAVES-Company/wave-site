// Minimal service worker so the PWA can show notifications (required on iOS).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
// Web Push from the server (send-push edge function). Payload: {title, body, tag}.
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) { data = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(
    self.registration.showNotification(data.title || 'wave', {
      body: data.body || '',
      icon: 'icons/Icon-192.png',
      tag: data.tag || undefined,
      data: { url: data.url || self.registration.scope },
    })
  );
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length > 0) return list[0].focus();
      return self.clients.openWindow(url);
    })
  );
});
