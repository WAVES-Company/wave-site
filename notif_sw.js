// Minimal service worker so the PWA can show notifications (required on iOS).
try { importScripts('push_crypto.js'); } catch (_) {}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
// Web Push from the server. Payload: {title, body, tag}; title/body may be "enc:v1:..."
// (encrypted on this device, see push_crypto.js).
async function wavePushText(data) {
  let lang = null;
  try { lang = self.wavePushGetLang ? await self.wavePushGetLang() : null; } catch (_) {}
  const ru = (lang || (self.navigator && self.navigator.language) || '').toLowerCase().startsWith('ru');
  const fbTitle = ru ? 'Напоминание wave' : 'wave reminder';
  const fbBody = ru ? 'У тебя запланирована задача' : 'You have a scheduled task';
  async function dec(v, fb) {
    if (!v) return fb;
    if (String(v).indexOf('enc:v1:') !== 0) return v;
    try { return await self.wavePushDecrypt(v); } catch (_) { return fb; }
  }
  return { title: await dec(data.title, fbTitle), body: await dec(data.body, fbBody) };
}
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) { data = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(
    wavePushText(data).then((t) => self.registration.showNotification(t.title || 'wave', {
      body: t.body || '',
      icon: 'icons/Icon-192.png',
      tag: data.tag || undefined,
      data: { url: data.url || self.registration.scope },
    }))
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
