/* Merkwerk Service Worker: speichert die App für die Offline-Nutzung. */
const CACHE = 'merkwerk-1.3.0';
const FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Netzwerk zuerst für die Seite selbst (damit Updates ankommen), sonst Cache.
  if (req.mode === 'navigate') {
    const cached = () => caches.match('./index.html');
    e.respondWith(fetch(req).then((res) => {
      // Nur eine echte, erfolgreiche Seite speichern. Ist die Website weg (z. B. 404),
      // startet die App weiter aus dem Speicher statt mit einer Fehlerseite.
      if (!res.ok) return cached().then((hit) => hit || res);
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put('./index.html', copy));
      return res;
    }).catch(cached));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
