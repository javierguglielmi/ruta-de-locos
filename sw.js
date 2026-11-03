/* Ruta de Locos - service worker.
   - Pagina principal: primero red (siempre la ultima version si hay internet), si no hay, la copia guardada.
   - Three.js, fuentes e iconos: se guardan la primera vez y despues salen del telefono. */
var CACHE = 'ruta-de-locos-v5';
var SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
var CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://fonts.googleapis.com/css2?family=Bungee&family=Barlow+Semi+Condensed:wght@500;700&display=swap'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      var local = c.addAll(SHELL);
      var remote = Promise.all(CDN.map(function (u) {
        return fetch(new Request(u, { mode: 'cors', credentials: 'omit' })).then(function (r) { if (r.ok) return c.put(u, r); }).catch(function () {});
      }));
      return Promise.all([local, remote]);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function networkFirst(req) {
  return fetch(req).then(function (r) {
    if (r && r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return r;
  }).catch(function () {
    return caches.match(req).then(function (m) { return m || caches.match('index.html'); });
  });
}

function cacheFirst(req) {
  return caches.match(req).then(function (m) {
    if (m) return m;
    return fetch(req).then(function (r) {
      if (r && (r.ok || r.type === 'opaque')) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return r;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) e.respondWith(networkFirst(req));
    else e.respondWith(cacheFirst(req));
    return;
  }
  if (/(^|\.)cdnjs\.cloudflare\.com$|(^|\.)fonts\.googleapis\.com$|(^|\.)fonts\.gstatic\.com$/.test(url.hostname)) e.respondWith(cacheFirst(req));
});
