// Service Worker fuer die Prüfprotokoll-Erfassung: cached die (einzige) Seite beim
// ersten erfolgreichen Laden, damit sie danach komplett ohne Internetverbindung
// startet -- genau dafuer gebaut, dass die App auf der Baustelle ohne Empfang laeuft.
// Muss im selben Ordner wie index.html liegen (Scope = der Ordner, in dem diese Datei
// liegt), sonst greift die Registrierung nicht.

const CACHE_NAME = 'pp-erfassung-v1';
const PRECACHE_URLS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {}),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((namen) =>
      Promise.all(namen.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))),
    ),
  );
  self.clients.claim();
});

// Cache-first mit Hintergrund-Aktualisierung: sofort aus dem Zwischenspeicher antworten
// (funktioniert offline), gleichzeitig im Hintergrund nachladen, damit der Zwischen-
// speicher aktuell bleibt, sobald wieder Internet da ist.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((antwort) => {
          if (antwort && antwort.ok) {
            const kopie = antwort.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, kopie));
          }
          return antwort;
        })
        .catch(() => cached);
      return cached || networkFetch;
    }),
  );
});
