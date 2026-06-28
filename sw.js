const CACHE_NAME = 'edisatech-v2.3';

// Archivos que se cachean al instalar
const PRECACHE_URLS = [
  './index.html',
  './manifest.json'
];

// ── INSTALL: precachear archivos core ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Activar inmediatamente sin esperar que cierren las pestañas viejas
  self.skipWaiting();
});

// ── ACTIVATE: limpiar cachés viejos y notificar actualización ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => {
      return self.clients.claim();
    }).then(() => {
      // Notificar a todos los clientes que hay una nueva versión activa
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME }));
      });
    })
  );
});

// ── FETCH: Cache-first para assets, network-first para el resto ──
self.addEventListener('fetch', event => {
  // Solo interceptar peticiones GET del mismo origen
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Solo cachear respuestas válidas
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, toCache);
        });
        return response;
      }).catch(() => {
        // Sin red y sin caché: devolver index.html como fallback
        return caches.match('./index.html');
      });
    })
  );
});
