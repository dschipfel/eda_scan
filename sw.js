// Service Worker fuer die Prüfprotokoll-Erfassung.
//
// Strategie: für die Seite selbst (Navigation) Netzwerk zuerst -- solange Internet da
// ist, wird IMMER die aktuellste Version geladen; der Zwischenspeicher dient nur als
// Rückfallebene, wenn kein Netz da ist (Baustelle ohne Empfang). Für die restlichen
// (wenigen) Dateien Cache-first mit Hintergrund-Update.
//
// WICHTIG: CACHE_NAME bei jeder inhaltlichen Änderung dieser Datei hochzählen (v2, v3, …).
// Nur wenn sich sw.js selbst byteweise ändert, erkennt der Browser übrhaupt eine neue
// Version und durchläuft den Install/Activate-Zyklus erneut -- sonst bleibt für immer die
// zuerst installierte Version aktiv, egal wie oft index.html aktualisiert wird.

const CACHE_NAME = 'pp-erfassung-v3';
const PRECACHE_URLS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {}),
  );
  // Bewusst KEIN self.skipWaiting() hier -- die neue Version wartet, bis die Seite
  // selbst (siehe Registrierungs-Skript in index.html) das Aktivieren anstößt.
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((namen) =>
      Promise.all(namen.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const istSeitenaufruf = event.request.mode === 'navigate' || event.request.destination === 'document';

  if (istSeitenaufruf) {
    // Netzwerk zuerst: bei Internet immer die neueste Version, Cache nur offline als Notlösung.
    event.respondWith(
      fetch(event.request)
        .then((antwort) => {
          if (antwort && antwort.ok) {
            const kopie = antwort.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, kopie));
          }
          return antwort;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./'))),
    );
    return;
  }

  // Restliche Dateien (manifest.json, icon.svg): Cache-first mit Hintergrund-Aktualisierung.
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
