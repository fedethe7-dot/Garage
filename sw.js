/* GARAGE — sw.js : fa funzionare l'app anche senza internet */
const CACHE = 'garage-v2.1.3';
const FILES = ['./', 'index.html', 'style.css', 'db.js', 'calc.js', 'charts.js', 'sync.js', 'app.js', 'manifest.json', 'icona-garage.svg', 'icona-garage-192.png', 'icona-garage-512.png'];

self.addEventListener('install', e => {
  // salva i file uno per uno: se ne manca uno l'app si installa lo stesso
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Prima prova la rete (così vedi sempre gli aggiornamenti), se sei offline usa la copia salvata
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && (e.request.url.startsWith(self.location.origin) || e.request.url.includes('fonts.g'))) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
