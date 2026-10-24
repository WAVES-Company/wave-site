// Device-local encryption of Web Push reminder text (shared by the page and notif_sw.js).
// AES-GCM key is generated once per device, non-extractable, kept in IndexedDB 'wave-push'/'keys'.
(function (g) {
  function db() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('wave-push', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('keys'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function get(d, k) {
    return new Promise(function (res, rej) {
      var q = d.transaction('keys').objectStore('keys').get(k);
      q.onsuccess = function () { res(q.result); };
      q.onerror = function () { rej(q.error); };
    });
  }
  function put(d, k, v) {
    return new Promise(function (res, rej) {
      var t = d.transaction('keys', 'readwrite');
      t.objectStore('keys').put(v, k);
      t.oncomplete = function () { res(); };
      t.onerror = function () { rej(t.error); };
    });
  }
  function b64(buf) {
    var s = '', u = new Uint8Array(buf);
    for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s);
  }
  function unb64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  var keyPromise = null;
  async function key(create) {
    var d = await db();
    var k = await get(d, 'aes');
    if (!k && create) {
      if (!keyPromise) {
        keyPromise = crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
          .then(function (nk) { return put(d, 'aes', nk).then(function () { return nk; }); });
      }
      k = await keyPromise;
    }
    return k;
  }
  g.wavePushEncrypt = async function (text) {
    var k = await key(true);
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, new TextEncoder().encode(text));
    return 'enc:v1:' + b64(iv) + ':' + b64(c);
  };
  g.wavePushDecrypt = async function (s) {
    if (!s || s.indexOf('enc:v1:') !== 0) return s;
    var p = s.split(':');
    var k = await key(false);
    if (!k) throw new Error('no key');
    var out = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(p[2]) }, k, unb64(p[3]));
    return new TextDecoder().decode(out);
  };
  g.wavePushSetLang = async function (lang) { try { await put(await db(), 'lang', lang); } catch (_) {} };
  g.wavePushGetLang = async function () { try { return await get(await db(), 'lang'); } catch (_) { return null; } };
})(self);
