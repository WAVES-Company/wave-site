try { importScripts('push_crypto.js'); } catch (_) {}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
async function wavePushText(data) {
  let texts = null;
  try { texts = self.wavePushGetTexts ? await self.wavePushGetTexts() : null; } catch (_) {}
  let showText = true;
  try { showText = self.wavePushGetShowText ? await self.wavePushGetShowText() : true; } catch (_) {}
  const isEnc = (v) => !!v && String(v).indexOf('enc:v') === 0;
  async function dec(v, fb) {
    if (!v) return fb;
    if (!isEnc(v)) return v;
    try {
      const out = await self.wavePushDecrypt(v);
      return out && String(out).trim() ? out : fb;
    } catch (_) { return fb; }
  }
  const fbTitle = texts && texts.title ? texts.title : (isEnc(data.title) ? '' : (data.title || ''));
  const fbBody = texts && texts.body ? texts.body : (isEnc(data.body) ? '' : (data.body || ''));
  const title = await dec(data.title, fbTitle);
  const body = showText ? await dec(data.body, fbBody) : fbBody;
  return { title, body };
}
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) { data = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(
    wavePushText(data).then((t) => self.registration.showNotification(t.title || '', {
      body: t.body || '',
      icon: 'icons/Icon-192.png',
      tag: data.tag || undefined,
      data: { url: data.url || self.registration.scope, tag: data.tag || null },
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
